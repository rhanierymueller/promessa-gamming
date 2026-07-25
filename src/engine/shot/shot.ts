import { nextFloat, type RngResult, type RngState } from '../rng'
import { goalCenter, keeperSkillForShot } from './config'
import { createFlight, flightX } from './flight'
import { applyBar, applyDispersion, readGesture } from './gesture'
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
  postRoll = 1,
  /** Estado do RNG para a margem do lance — sem ele o alcance é um degrau. */
  rng?: RngState,
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

  if (hitPost) {
    // trave não é sempre azar: às vezes a bola quica pra DENTRO
    return postRoll < config.postInChance
      ? { kind: 'goal', finalX, isGolaco: golaco, offPost: true }
      : { kind: 'post', finalX, isGolaco: false }
  }
  if (!insideX || height > goal.barHeight + 4) return { kind: 'miss', finalX, isGolaco: false }

  let reach = config.reachBase + skill * config.reachSkillFactor
  if (height > config.highBallHeight) reach *= config.highBallReachFactor
  const center = goalCenter(config)
  const isTame =
    flight.power < config.tameShotPower &&
    Math.abs(finalX - center) < config.tameShotCenterRange
  // goleiro que não mergulhou tem o CORPO na frente da bola central (não só a
  // luva) — em pé ele agarra até a altura dos braços esticados
  const isBodyBlock =
    Math.abs(plan.diveX - center) <= config.keeperStandingZone &&
    Math.abs(finalX - center) <= config.keeperStandingZone &&
    height <= config.standingCatchHeight
  /*
   * Alcance puro seria um DEGRAU: 1 unidade a mais e o gol vira 100% certo,
   * seja qual for o goleiro. A margem abaixo transforma isso em curva —
   * dentro do alcance o goleiro fraco ainda falha, e fora por pouco o
   * goleiro bom ainda estica. Nada fica 0% nem 100%.
   */
  const gap = Math.abs(plan.diveX - finalX)
  const margin = gap - reach
  // sem rng, o resultado é a geometria pura (comportamento determinístico
  // de antes): 1 nunca dispara nem a falha nem o esticão
  const edgeRoll = rng ? nextFloat(rng).value : 1
  const reachedIt =
    margin <= 0
      ? edgeRoll >= config.fumbleChance * (1 - skill) * flight.power
      : margin <= reach * config.stretchWindow && edgeRoll < config.stretchChance * skill

  const saved = isTame || isBodyBlock || reachedIt

  if (saved) {
    // agarra ou espalma? Ponta da luva, bola no ângulo ou bomba = rebote
    const distFrac = reach > 0 ? gap / reach : 0
    const deflected =
      !isTame &&
      !isBodyBlock &&
      (distFrac > config.deflectEdgeFrac ||
        height > config.deflectHighBall ||
        flight.power > config.deflectPower)
    return { kind: 'save', finalX, isGolaco: false, deflected }
  }
  return { kind: 'goal', finalX, isGolaco: golaco }
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
  keeperQuality?: number,
  barT?: number,
): RngResult<ShotSimulation | null> => {
  const gesture = readGesture(points, ballX, config)
  if (!gesture) return { value: null, next: rng }

  // com a régua de chute, o traço mira e a barra dita força/altura
  const intent = barT === undefined ? gesture : applyBar(gesture, barT, config)
  const dispersed = applyDispersion(intent, rng, config)
  const flight = createFlight(dispersed.value, ballX, config)
  const skill = keeperSkillForShot(config, shotIndex, keeperQuality)
  const planned = planKeeper(flight, skill, dispersed.next, config)
  const postRoll = nextFloat(planned.next)
  const outcome = resolveOutcome(flight, planned.value, skill, config, postRoll.value, postRoll.next)

  return {
    value: { command: dispersed.value, flight, keeper: planned.value, outcome },
    next: postRoll.next,
  }
}

