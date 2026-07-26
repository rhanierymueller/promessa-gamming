import { parseSave, type PlayerSave } from '../state/save'
import { getClient } from './leagues'
import { chooseSave, type SaveWinner } from './syncPolicy'

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

/** Busca a carreira guardada. null = nuvem vazia, sem conta ou indisponível. */
export const pullSave = async (): Promise<PlayerSave | null> => {
  const client = getClient()
  const userId = await currentUserId()
  if (!client || !userId) return null
  const { data, error } = await client
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.data) return null
  // passa pelo parse normal: save da nuvem é dado externo como qualquer outro,
  // e pode ter sido gravado por uma versão diferente do jogo
  return parseSave(JSON.stringify(data.data))
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
 */
export const syncSave = async (local: PlayerSave | null): Promise<SyncResult> => {
  const cloud = await pullSave()
  const winner = chooseSave({
    localSavedAt: local ? local.savedAt : null,
    cloudSavedAt: cloud ? cloud.savedAt : null,
  })
  if (winner === 'local' && local) {
    // a nuvem está atrás (ou vazia): manda a local para lá
    await pushSave(local)
    return { winner, save: local }
  }
  if (winner === 'cloud') return { winner, save: cloud }
  return { winner, save: local }
}
