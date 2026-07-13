import type { RngResult, RngState } from '../rng'
import { goalCenter, keeperSkillForShot } from './config'
import { createFlight, flightX } from './flight'
import { applyDispersion, readGesture } from './gesture'
import { planKeeper } from './keeper'
import type {
  FlightParams,
  KeeperPlan,
  ShotCommand,
  ShotConfig,
  ShotOutcome,
  Vec2,
} from './types'

export const isGolaco = (command: ShotCommand, config: ShotConfig): boolean =>
  Math.abs(command.curve) > config.golacoCurve ||
  command.targetHeight > config.golacoHeight ||
  command.power > config.golacoPower

/** Decide o desfecho no instante do chute — a animação apenas encena. */
export const resolveOutcome = (
  flight: FlightParams,
  plan: KeeperPlan,
  skill: number,
  config: ShotConfig,
): ShotOutcome => {
  const { goal } = config
  const finalX = flightX(flight, 1)
  const height = flight.targetHeight
  const golaco = isGolaco(flight, config)

  const insideX = finalX > goal.left + goal.postWidth && finalX < goal.right - goal.postWidth
  const underBar = height < goal.barHeight - 2
  const hitPost =
    (Math.abs(finalX - goal.left) <= goal.postWidth && underBar) ||
    (Math.abs(finalX - goal.right) <= goal.postWidth && underBar) ||
    (insideX && height >= goal.barHeight - 2 && height <= goal.barHeight + 4)

  if (hitPost) return { kind: 'post', finalX, isGolaco: false }
  if (!insideX || height > goal.barHeight + 4) return { kind: 'miss', finalX, isGolaco: false }

  let reach = config.reachBase + skill * config.reachSkillFactor
  if (height > config.highBallHeight) reach *= config.highBallReachFactor
  const isTame =
    flight.power < config.tameShotPower &&
    Math.abs(finalX - goalCenter(config)) < config.tameShotCenterRange
  const saved = isTame || Math.abs(plan.diveX - finalX) <= reach

  return saved
    ? { kind: 'save', finalX, isGolaco: false }
    : { kind: 'goal', finalX, isGolaco: golaco }
}

export interface ShotSimulation {
  readonly command: ShotCommand
  readonly flight: FlightParams
  readonly keeper: KeeperPlan
  readonly outcome: ShotOutcome
}

/**
 * Simula um chute completo a partir do traço do jogador. Determinístico para
 * um mesmo estado de RNG — mesmo gesto + mesma seed = mesmo resultado.
 */
export const simulateShot = (
  points: readonly Vec2[],
  ballX: number,
  shotIndex: number,
  rng: RngState,
  config: ShotConfig,
): RngResult<ShotSimulation | null> => {
  const intent = readGesture(points, ballX, config)
  if (!intent) return { value: null, next: rng }

  const dispersed = applyDispersion(intent, rng, config)
  const flight = createFlight(dispersed.value, ballX, config)
  const skill = keeperSkillForShot(config, shotIndex)
  const planned = planKeeper(flight, skill, dispersed.next, config)
  const outcome = resolveOutcome(flight, planned.value, skill, config)

  return {
    value: { command: dispersed.value, flight, keeper: planned.value, outcome },
    next: planned.next,
  }
}
