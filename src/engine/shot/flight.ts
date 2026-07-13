import type { FlightParams, ShotCommand, ShotConfig } from './types'

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export const createFlight = (
  command: ShotCommand,
  startX: number,
  config: ShotConfig,
): FlightParams => ({
  startX,
  startY: config.ballStartY,
  targetX: command.targetX,
  targetHeight: command.targetHeight,
  curve: command.curve,
  power: command.power,
  arc: Math.max(1, command.targetHeight * config.arcHeightFactor + command.power * config.arcPowerFactor),
  duration: config.baseDuration - command.power * config.durationPowerFactor,
})

/** Posição lateral da bola em t ∈ [0,1] — a curva entra e sai (chute de banana). */
export const flightX = (flight: FlightParams, t: number): number =>
  lerp(flight.startX, flight.targetX, t) + flight.curve * Math.sin(Math.PI * t)

/** Projeção da bola no chão (profundidade do campo). */
export const flightGroundY = (flight: FlightParams, t: number, config: ShotConfig): number =>
  lerp(flight.startY, config.goal.floorY, t)

/** Altura da bola acima do chão. */
export const flightHeight = (flight: FlightParams, t: number): number =>
  flight.targetHeight * t + flight.arc * Math.sin(Math.PI * t)
