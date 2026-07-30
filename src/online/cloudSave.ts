import { parseSave, type PlayerSave } from '../state/save'
import { getClient } from './leagues'
import { resolveSync, type SaveWinner } from './syncPolicy'

/**
 * Carreira na nuvem: sobe a cada gravação e desce ao entrar na conta, para o
 * jogador continuar no celular de onde parou no computador.
 *
 * Toda função aqui falha em silêncio de propósito. Sincronizar é comodidade —
 * se o servidor estiver fora, ou o jogador offline, a carreira local segue
 * valendo e o jogo não pode travar por causa disso.
 */

const TABLE = 'career_saves'

/** Só vale sincronizar com conta de verdade; anônima é por aparelho. */
const currentUserId = async (): Promise<string | null> => {
  const client = getClient()
  if (!client) return null
  const { data } = await client.auth.getSession()
  const user = data.session?.user
  if (!user || user.is_anonymous) return null
  return user.id
}

/** Envia a carreira. Devolve false se não deu (offline, sem conta, erro). */
export const pushSave = async (save: PlayerSave): Promise<boolean> => {
  const client = getClient()
  const userId = await currentUserId()
  if (!client || !userId) return false
  const { error } = await client.from(TABLE).upsert({
    user_id: userId,
    data: save,
    saved_at: save.savedAt,
    updated_at: new Date().toISOString(),
  })
  return !error
}

/**
 * O que a nuvem respondeu.
 *
 * Distinguir `vazia` de `ilegivel` não é purismo: um `null` para os dois casos
 * abria um caminho de PERDA DE CARREIRA. Nuvem ilegível virava "nuvem
 * atrasada", o `syncSave` empurrava o save local por cima e a carreira mais
 * nova do outro aparelho desaparecia em silêncio — e o módulo falha calado de
 * propósito, então ninguém era avisado.
 */
export type PullResult =
  | { readonly kind: 'save'; readonly save: PlayerSave }
  /** Conta existe e não tem nada gravado ainda. É seguro subir o local. */
  | { readonly kind: 'vazia' }
  /** Tem dado gravado, mas o parse rejeitou. NUNCA sobrescrever. */
  | { readonly kind: 'ilegivel' }
  /** Sem conta, sem cliente ou sem rede. Não dá para concluir nada. */
  | { readonly kind: 'indisponivel' }

export const pullSave = async (): Promise<PullResult> => {
  const client = getClient()
  const userId = await currentUserId()
  if (!client || !userId) return { kind: 'indisponivel' }
  const { data, error } = await client
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return { kind: 'indisponivel' }
  if (!data?.data) return { kind: 'vazia' }
  // passa pelo parse normal: save da nuvem é dado externo como qualquer outro,
  // e pode ter sido gravado por uma versão diferente do jogo
  const parsed = parseSave(JSON.stringify(data.data))
  return parsed ? { kind: 'save', save: parsed } : { kind: 'ilegivel' }
}

export interface SyncResult {
  readonly winner: SaveWinner
  /** A carreira que deve valer daqui em diante; null se não há nenhuma. */
  readonly save: PlayerSave | null
}

/**
 * Junta o save do aparelho com o da nuvem. Vence o mais recente; se a nuvem
 * estiver vazia, a carreira local sobe — é o caso de quem já jogava antes de
 * a sincronização existir.
 *
 * Só ESCREVE na nuvem quando dá para afirmar que ela está atrás ou vazia.
 * Nuvem ilegível ou indisponível mantém a carreira local valendo no aparelho e
 * não toca no que está gravado lá: apagar a carreira de outro aparelho é pior
 * que ficar dessincronizado até a próxima gravação.
 */
export const syncSave = async (local: PlayerSave | null): Promise<SyncResult> => {
  const pulled = await pullSave()
  const cloud = pulled.kind === 'save' ? pulled.save : null

  // toda a decisão perigosa vive em syncPolicy, que é puro e testado
  const decision = resolveSync({
    localSavedAt: local ? local.savedAt : null,
    cloud: pulled.kind,
    cloudSavedAt: cloud ? cloud.savedAt : null,
  })

  if (decision.pushLocal && local) await pushSave(local)
  return { winner: decision.winner, save: decision.useCloud ? cloud : local }
}

/**
 * Apaga a carreira guardada na nuvem. Chamado ANTES de derrubar a conta: o
 * cascade de auth.users cobriria isso, mas depender só dele deixaria o dado
 * de pé se a remoção do usuário falhar no meio.
 */
export const deleteCloudSave = async (): Promise<void> => {
  const client = getClient()
  const userId = await currentUserId()
  if (!client || !userId) return
  await client.from(TABLE).delete().eq('user_id', userId)
}
