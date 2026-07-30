export interface BallPoint {
  readonly x: number
  readonly y: number
}

export type BallMotion = 'ground-pass' | 'lofted-pass' | 'shot'

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

export const motionForPass = (distance: number, urgent = false): BallMotion =>
  distance > 0.32 || (urgent && distance > 0.24) ? 'lofted-pass' : 'ground-pass'

/** Duração visual: distância pesa, mas chutes continuam mais rápidos que passes. */
export const flightDurationFor = (
  distance: number,
  motion: BallMotion,
  urgent = false,
): number => {
  const safeDistance = Math.max(0, distance)
  const base = motion === 'shot'
    ? Math.min(0.48, 0.24 + safeDistance * 0.3)
    : motion === 'lofted-pass'
      ? Math.min(0.8, 0.36 + safeDistance * 0.62)
      : Math.min(0.68, 0.26 + safeDistance * 0.78)
  return Math.max(0.2, urgent ? base * 0.72 : base)
}

/**
 * Passe rasteiro sai mais rápido e perde velocidade perto do destino.
 * Lançamento mantém velocidade horizontal; chute desacelera só um pouco.
 */
export const travelProgressFor = (progress: number, motion: BallMotion): number => {
  const p = clamp01(progress)
  if (motion === 'ground-pass') return 1 - (1 - p) ** 1.3
  if (motion === 'shot') return 1 - (1 - p) ** 1.08
  return p
}

/** Altura em unidades lógicas do canvas, separada da posição no gramado. */
export const ballLiftFor = (
  progress: number,
  motion: BallMotion,
  distance: number,
): number => {
  const p = clamp01(progress)
  if (p === 0 || p === 1) return 0
  const distanceFactor = Math.min(1, Math.max(0, distance) / 0.65)
  if (motion === 'ground-pass') {
    // quique mínimo do gramado irregular, amortecendo até o domínio
    return Math.abs(Math.sin(p * Math.PI * 4)) * (1 - p) * 0.55
  }
  const arc = Math.sin(p * Math.PI)
  return motion === 'shot'
    ? arc * (2.5 + distanceFactor * 3.5)
    : arc * (4 + distanceFactor * 5)
}

/** Posição no chão com uma curva lateral suave que sempre termina no alvo. */
export const ballPointAt = (
  from: BallPoint,
  to: BallPoint,
  progress: number,
  curve: number,
): BallPoint => {
  const p = clamp01(progress)
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  const bend = Math.sin(p * Math.PI) * curve
  const perpendicularX = length > 0 ? -dy / length : 0
  const perpendicularY = length > 0 ? dx / length : 0
  return {
    x: from.x + dx * p + perpendicularX * bend,
    y: from.y + dy * p + perpendicularY * bend,
  }
}
