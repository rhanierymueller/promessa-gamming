/**
 * Rosto de cada jogador: sorteado do banco de retratos, mas SEMPRE o mesmo
 * para o mesmo jogador. Nada é guardado no save — o rosto é derivado do id,
 * que já é estável (o mesmo clube gera sempre o mesmo elenco, e um jogador
 * contratado carrega o id junto). Abrir a carta duas vezes dá o mesmo rosto.
 */

/** FNV-1a de 32 bits: barato, determinístico e bem espalhado. */
const hashId = (value: string): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * Índice do retrato no banco. Devolve null quando ainda não há retratos —
 * a carta simplesmente não mostra rosto, sem quebrar.
 */
export const faceIndexFor = (playerId: string, poolSize: number): number | null => {
  if (!Number.isInteger(poolSize) || poolSize <= 0) return null
  return hashId(playerId) % poolSize
}
