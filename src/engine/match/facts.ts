import { createRng, nextFloat, type RngResult, type RngState } from '../rng'

/**
 * Estatísticas "de transmissão" do fim de jogo — posse, finalizações,
 * escanteios e craque do jogo. Derivadas do placar de forma plausível e
 * DETERMINÍSTICA (mesma partida = mesmos números); a engine de lances não
 * rastreia esses eventos um a um.
 */

export interface MatchFactsInput {
  readonly seed: number
  readonly teamGoals: number
  readonly opponentGoals: number
  readonly playerRating: number
  readonly playerName: string
  readonly teamSquad: readonly string[]
  readonly opponentSquad: readonly string[]
}

export interface MatchFacts {
  /** Posse do time do jogador em % (adversário = 100 - posse). */
  readonly possessionTeam: number
  readonly shotsTeam: number
  readonly shotsOpponent: number
  readonly onTargetTeam: number
  readonly onTargetOpponent: number
  readonly cornersTeam: number
  readonly cornersOpponent: number
  readonly bestPlayerName: string
  readonly bestPlayerIsUser: boolean
}

/** Nota a partir da qual o usuário é o craque do jogo. */
export const MOTM_MIN_RATING = 7.5

const FACTS_SEED_SALT = 0x9e3779b9
const POSSESSION_PER_GOAL = 4
const POSSESSION_NOISE = 7
const POSSESSION_MIN = 34
const POSSESSION_MAX = 66

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const rollInt = (rng: RngState, min: number, max: number): RngResult<number> => {
  const roll = nextFloat(rng)
  return { value: min + Math.floor(roll.value * (max - min + 1)), next: roll.next }
}

const shotLine = (
  rng: RngState,
  goals: number,
): RngResult<{ shots: number; onTarget: number }> => {
  const extra = rollInt(rng, 3, 9)
  const onFrame = rollInt(extra.next, 0, Math.ceil(extra.value / 2))
  return {
    value: { shots: goals + extra.value, onTarget: goals + onFrame.value },
    next: onFrame.next,
  }
}

const pickName = (
  rng: RngState,
  squad: readonly string[],
  exclude: string,
): RngResult<string> => {
  const pool = squad.filter((name) => name !== exclude)
  if (pool.length === 0) return { value: exclude, next: rng }
  const roll = rollInt(rng, 0, pool.length - 1)
  return { value: pool[roll.value], next: roll.next }
}

export const buildMatchFacts = (input: MatchFactsInput): MatchFacts => {
  const rng = createRng((input.seed ^ FACTS_SEED_SALT) >>> 0)
  const goalDiff = input.teamGoals - input.opponentGoals

  const possessionRoll = rollInt(rng, -POSSESSION_NOISE, POSSESSION_NOISE)
  const possessionTeam = clamp(
    50 + goalDiff * POSSESSION_PER_GOAL + possessionRoll.value,
    POSSESSION_MIN,
    POSSESSION_MAX,
  )

  const teamLine = shotLine(possessionRoll.next, input.teamGoals)
  const oppLine = shotLine(teamLine.next, input.opponentGoals)
  const teamCorners = rollInt(oppLine.next, 1, 8)
  const oppCorners = rollInt(teamCorners.next, 1, 8)

  if (input.playerRating >= MOTM_MIN_RATING) {
    return {
      possessionTeam,
      shotsTeam: teamLine.value.shots,
      shotsOpponent: oppLine.value.shots,
      onTargetTeam: teamLine.value.onTarget,
      onTargetOpponent: oppLine.value.onTarget,
      cornersTeam: teamCorners.value,
      cornersOpponent: oppCorners.value,
      bestPlayerName: input.playerName,
      bestPlayerIsUser: true,
    }
  }

  // sem atuação de gala: o craque sai do time que levou a melhor
  const sideRoll = nextFloat(oppCorners.next)
  const fromOpponent = goalDiff < 0 || (goalDiff === 0 && sideRoll.value < 0.5)
  const best = fromOpponent
    ? pickName(sideRoll.next, input.opponentSquad, input.playerName)
    : pickName(sideRoll.next, input.teamSquad, input.playerName)

  return {
    possessionTeam,
    shotsTeam: teamLine.value.shots,
    shotsOpponent: oppLine.value.shots,
    onTargetTeam: teamLine.value.onTarget,
    onTargetOpponent: oppLine.value.onTarget,
    cornersTeam: teamCorners.value,
    cornersOpponent: oppCorners.value,
    bestPlayerName: best.value,
    bestPlayerIsUser: false,
  }
}
