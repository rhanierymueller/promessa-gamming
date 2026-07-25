import { createRng, nextInt } from '../rng'

/**
 * Disputa de pênaltis que decide um jogo empatado de copa.
 *
 * É derivada da semente da PARTIDA porque duas telas precisam da mesma
 * resposta: o resumo de fim de jogo, que mostra o placar da disputa, e o
 * avanço do torneio, que registra quem passou. Calculadas em separado, elas
 * divergiriam e o jogador veria um resultado diferente do chaveamento.
 */

/** Ninguém vence uma disputa por menos que isso. */
export const SHOOTOUT_MIN_GOALS = 2
const MAX_GOALS = 5
/** Mistura a semente para a disputa não repetir a sequência do jogo. */
const SEED_SALT = 0x7f4a7c15

export interface Shootout {
  readonly playerGoals: number
  readonly opponentGoals: number
  readonly playerWon: boolean
}

export const shootoutFor = (seed: number): Shootout => {
  const rng = createRng((seed ^ SEED_SALT) >>> 0)
  const winnerGoals = nextInt(rng, SHOOTOUT_MIN_GOALS + 1, MAX_GOALS)
  const loserGoals = nextInt(winnerGoals.next, SHOOTOUT_MIN_GOALS, winnerGoals.value - 1)
  const playerWon = nextInt(loserGoals.next, 0, 1).value === 0
  return {
    playerGoals: playerWon ? winnerGoals.value : loserGoals.value,
    opponentGoals: playerWon ? loserGoals.value : winnerGoals.value,
    playerWon,
  }
}
