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
