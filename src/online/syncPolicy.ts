/**
 * Qual carreira sobrevive quando o mesmo jogador joga em dois aparelhos.
 *
 * Regra escolhida: vence a salva por ÚLTIMO, sempre. É previsível — quem
 * jogou por último vê o que acabou de fazer — e não interrompe ninguém com
 * pergunta no login. O preço é que um aparelho parado há semanas, se salvar
 * depois, sobrescreve o outro; por isso o envio para a nuvem acontece a cada
 * alteração, e não só ao sair.
 *
 * Fica fora de qualquer componente porque errar aqui APAGA carreira.
 */

export type SaveWinner = 'local' | 'cloud' | 'nenhum'

export interface SyncInput {
  /** Quando o save do aparelho foi gravado; null se não há save local. */
  readonly localSavedAt: number | null
  /** Quando o save da nuvem foi gravado; null se a nuvem está vazia. */
  readonly cloudSavedAt: number | null
}

export const chooseSave = ({ localSavedAt, cloudSavedAt }: SyncInput): SaveWinner => {
  if (localSavedAt === null && cloudSavedAt === null) return 'nenhum'
  if (cloudSavedAt === null) return 'local'
  if (localSavedAt === null) return 'cloud'
  // empate fica com o aparelho: trocar a tela sem ganho só confunde
  return localSavedAt >= cloudSavedAt ? 'local' : 'cloud'
}

/** O que a nuvem respondeu, sem o conteúdo. */
export type CloudState = 'save' | 'vazia' | 'ilegivel' | 'indisponivel'

export interface SyncDecision {
  readonly winner: SaveWinner
  /** Pode ESCREVER o save do aparelho na nuvem? */
  readonly pushLocal: boolean
  /** A carreira que passa a valer é a da nuvem? */
  readonly useCloud: boolean
}

/**
 * Decide o que fazer com os dois saves — inclusive quando a nuvem não deu
 * resposta confiável.
 *
 * O ponto crítico: `vazia` e `ilegivel` NÃO são a mesma coisa. Tratar as duas
 * como "nuvem sem nada" fazia a carreira mais nova de outro aparelho ser
 * sobrescrita pela mais antiga deste, em silêncio, sempre que o parse do save
 * remoto falhasse — por exemplo depois de uma mudança de formato do save.
 *
 * Regra: só escreve na nuvem quando dá para AFIRMAR que ela está atrás ou
 * vazia. Ficar dessincronizado até a próxima gravação é recuperável; apagar a
 * carreira do outro aparelho não é.
 */
export const resolveSync = ({
  localSavedAt,
  cloud,
  cloudSavedAt,
}: {
  readonly localSavedAt: number | null
  readonly cloud: CloudState
  readonly cloudSavedAt: number | null
}): SyncDecision => {
  if (cloud === 'ilegivel' || cloud === 'indisponivel') {
    return {
      winner: localSavedAt === null ? 'nenhum' : 'local',
      pushLocal: false,
      useCloud: false,
    }
  }
  const winner = chooseSave({ localSavedAt, cloudSavedAt })
  return {
    winner,
    pushLocal: winner === 'local' && localSavedAt !== null,
    useCloud: winner === 'cloud',
  }
}
