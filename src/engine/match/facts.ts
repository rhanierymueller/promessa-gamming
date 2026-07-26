import { createRng, nextFloat, type RngResult, type RngState } from '../rng'

/**
 * Craque do jogo — a única "opinião" do resumo. Os números (posse, chutes)
 * vêm dos contadores VIVOS da partida; aqui só se elege o melhor em campo,
 * deterministicamente por seed.
 */

export interface BestPlayerInput {
  readonly seed: number
  readonly teamGoals: number
  readonly opponentGoals: number
  readonly playerRating: number
  readonly playerName: string
  readonly teamSquad: readonly string[]
  readonly opponentSquad: readonly string[]
}

export interface BestPlayer {
  readonly name: string
  readonly isUser: boolean
}

/** Nota a partir da qual o usuário é o craque do jogo. */
export const MOTM_MIN_RATING = 7.5

const MOTM_SEED_SALT = 0x9e3779b9

const rollInt = (rng: RngState, min: number, max: number): RngResult<number> => {
  const roll = nextFloat(rng)
  return { value: min + Math.floor(roll.value * (max - min + 1)), next: roll.next }
}

const pickName = (
  rng: RngState,
  squad: readonly string[],
  exclude: string,
): string => {
  const pool = squad.filter((name) => name !== exclude)
  if (pool.length === 0) return exclude
  return pool[rollInt(rng, 0, pool.length - 1).value]
}

export const pickBestPlayer = (input: BestPlayerInput): BestPlayer => {
  const goalDiff = input.teamGoals - input.opponentGoals
  const lost = goalDiff < 0
  const won = goalDiff > 0
  /*
   * Craque do jogo é de quem DECIDIU a partida — só em vitória. Empate não
   * tem protagonista, e em derrota quem decidiu está do outro lado; a nota
   * alta nesses casos é consolo, não protagonismo.
   */
  if (won && input.playerRating >= MOTM_MIN_RATING) {
    return { name: input.playerName, isUser: true }
  }
  const rng = createRng((input.seed ^ MOTM_SEED_SALT) >>> 0)
  const sideRoll = nextFloat(rng)
  const fromOpponent = lost || (goalDiff === 0 && sideRoll.value < 0.5)
  const squad = fromOpponent ? input.opponentSquad : input.teamSquad
  return { name: pickName(sideRoll.next, squad, input.playerName), isUser: false }
}
