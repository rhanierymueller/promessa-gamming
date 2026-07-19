import { nextFloat, type RngResult, type RngState } from '../rng'
import { goalCenter } from '../shot/config'
import { createFlight, flightX } from '../shot/flight'
import type { FlightParams, ShotConfig } from '../shot/types'

/**
 * Defesa (estilo FIFA): o adversário cobra contra o seu gol e VOCÊ mergulha
 * arrastando para o lado durante o voo. Direção e timing decidem a defesa.
 */
export interface DefenseConfig {
  /** Alcance da luva quando o mergulho é no tempo certo. */
  readonly reach: number
  /** Alcance sem mergulho (bola na direção do corpo). */
  readonly standingReach: number
  /** A partir desta fração do voo, o mergulho sai atrasado. */
  readonly lateDiveT: number
  readonly lateFactor: number
  /** Bola alta no ângulo reduz o alcance. */
  readonly highBallHeight: number
  readonly highBallFactor: number
  /** Mergulhou no plano errado (rasteiro numa bola alta, ou vice-versa). */
  readonly wrongHeightFactor: number
  readonly maxDive: number
}

export const DEFAULT_DEFENSE_CONFIG: DefenseConfig = {
  reach: 15,
  standingReach: 7,
  lateDiveT: 0.7,
  lateFactor: 0.45,
  highBallHeight: 30,
  highBallFactor: 0.75,
  wrongHeightFactor: 0.4,
  maxDive: 44,
}

/** Gera a cobrança do rival — quanto maior a skill, mais no canto e mais veneno. */
export const generateOpponentShot = (
  rng: RngState,
  skill: number,
  startX: number,
  config: ShotConfig,
): RngResult<FlightParams> => {
  const side = nextFloat(rng)
  const corner = nextFloat(side.next)
  const heightRoll = nextFloat(corner.next)
  const curveRoll = nextFloat(heightRoll.next)

  const center = goalCenter(config)
  const maxOffset = (config.goal.right - config.goal.left) / 2 - config.goal.postWidth - 2
  const offset = Math.min(maxOffset, 10 + skill * 20 + corner.value * 12)
  const targetX = center + (side.value < 0.5 ? -offset : offset)

  const targetHeight =
    heightRoll.value < 0.45
      ? 3 + heightRoll.value * 12
      : heightRoll.value < 0.8
        ? 14 + heightRoll.value * 12
        : 24 + heightRoll.value * 10

  const curve = (curveRoll.value * 2 - 1) * 10 * skill
  const power = 0.55 + skill * 0.35

  return {
    value: createFlight({ power, targetX, targetHeight, curve }, startX, config),
    next: curveRoll.next,
  }
}

export type DefenseOutcome = 'saved' | 'conceded'

export const resolveDive = (
  flight: FlightParams,
  diveX: number | null,
  diveStartT: number,
  center: number,
  config: DefenseConfig,
  diveHigh = false,
): DefenseOutcome => {
  const finalX = flightX(flight, 1)

  if (diveX === null) {
    return Math.abs(center - finalX) <= config.standingReach ? 'saved' : 'conceded'
  }

  let reach = config.reach
  if (diveStartT > config.lateDiveT) reach *= config.lateFactor
  // plano do mergulho: errar alto×rasteiro pune mais que a bola difícil em si
  const ballIsHigh = flight.targetHeight > config.highBallHeight
  if (ballIsHigh !== diveHigh) reach *= config.wrongHeightFactor
  else if (ballIsHigh) reach *= config.highBallFactor

  return Math.abs(diveX - finalX) <= reach ? 'saved' : 'conceded'
}
