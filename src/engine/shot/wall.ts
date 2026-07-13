import { flightHeight, flightX } from './flight'
import type { FlightParams } from './types'

/**
 * Barreira de falta: obstáculo entre a bola e o gol. A bola precisa passar
 * POR CIMA (altura na posição da barreira) ou AO REDOR (curva tirando a bola
 * do vão). A barreira pula no timing do chute, ganhando altura extra.
 */
export interface WallConfig {
  /** Centro lateral da barreira (espaço lógico 180×320). */
  readonly centerX: number
  readonly width: number
  readonly height: number
  /** Fração do voo em que a bola cruza a linha da barreira. */
  readonly flightT: number
  /** Altura extra quando a barreira pula. */
  readonly jumpBoost: number
}

export const DEFAULT_WALL: WallConfig = {
  centerX: 90,
  width: 24,
  height: 18,
  flightT: 0.5,
  jumpBoost: 7,
}

export type WallOutcome = 'over' | 'around' | 'blocked'

export const resolveWall = (
  flight: FlightParams,
  wall: WallConfig,
  jumped: boolean,
): WallOutcome => {
  const ballX = flightX(flight, wall.flightT)
  const ballHeight = flightHeight(flight, wall.flightT)
  const insideSpan =
    ballX >= wall.centerX - wall.width / 2 && ballX <= wall.centerX + wall.width / 2
  if (!insideSpan) return 'around'
  const effectiveHeight = wall.height + (jumped ? wall.jumpBoost : 0)
  return ballHeight > effectiveHeight ? 'over' : 'blocked'
}

/** Barreira posicionada entre a bola e o alvo, protegendo o canto mais provável. */
export const wallForShot = (ballX: number, goalCenterX: number): WallConfig => ({
  ...DEFAULT_WALL,
  centerX: ballX + (goalCenterX - ballX) * 0.55,
})
