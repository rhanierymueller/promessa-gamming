import { nextFloat, type RngResult, type RngState } from '../rng'
import type { ShotCommand, ShotConfig, Vec2 } from './types'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Lê o traço do jogador e devolve a intenção do chute, ou null quando o gesto
 * não é um chute válido (curto demais ou não aponta para cima).
 */
export const readGesture = (
  points: readonly Vec2[],
  ballX: number,
  config: ShotConfig,
): ShotCommand | null => {
  if (points.length < 3) return null
  const start = points[0]
  const end = points[points.length - 1]
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (length < config.minDragLength || dy > -config.minUpwardDrag) return null

  const mid = points[Math.floor(points.length / 2)]
  const chordMidX = (start.x + end.x) / 2
  const curve = clamp((mid.x - chordMidX) * config.curveScale, -config.maxCurve, config.maxCurve)

  const rawHeight = ((-dy - config.heightDeadzone) / config.heightDragRange) * config.heightScale
  return {
    power: clamp(length / config.powerDragLength, config.minPower, 1),
    targetX: ballX + dx * config.aimScale,
    targetHeight: clamp(rawHeight, 1, config.maxTargetHeight),
    curve,
  }
}

/**
 * Barra de chute: o traço MIRA (direção + curva); força e altura vêm da régua
 * vertical no instante do toque — embaixo (0) sai forte e rasteiro, em cima
 * (1) sai muito forte e alto, flertando com o travessão.
 */
export const applyBar = (
  command: ShotCommand,
  barT: number,
  config: ShotConfig,
): ShotCommand => {
  const t = clamp(barT, 0, 1)
  return {
    ...command,
    power: config.barPowerMin + t * config.barPowerRange,
    targetHeight: Math.max(1, t * config.barMaxHeight),
  }
}

/**
 * Aplica o custo da força: acima do limiar, o chute dispersa (trade-off
 * potência × colocação); chute fraco sai rasteiro.
 */
export const applyDispersion = (
  command: ShotCommand,
  rng: RngState,
  config: ShotConfig,
): RngResult<ShotCommand> => {
  const error = Math.max(0, command.power - config.dispersionThreshold)
  const xRoll = nextFloat(rng)
  const hRoll = nextFloat(xRoll.next)

  const targetX = command.targetX + (xRoll.value * 2 - 1) * error * config.dispersionX
  const spread = command.targetHeight + (hRoll.value * 2 - 1) * error * config.dispersionHeight
  const grounded = command.power < config.weakShotPower
    ? Math.min(spread, config.weakShotMaxHeight)
    : spread

  return {
    value: { ...command, targetX, targetHeight: Math.max(1, grounded) },
    next: hRoll.next,
  }
}
