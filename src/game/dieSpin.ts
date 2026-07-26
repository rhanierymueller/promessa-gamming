import type { DiceSide } from '../engine/dice/duel'
import type { DiePhase } from './Die'

/**
 * Rotação do cubo em cada fase do lançamento. Vive fora do componente porque
 * é a regra que garante o dado assentar na face sorteada — e isso precisa de
 * teste, não de olho no gramado.
 */

/** Rotação que traz cada face para a frente. */
export const FACE_ROTATION: Record<DiceSide, readonly [number, number]> = {
  1: [0, 0],
  2: [0, -90],
  3: [0, 180],
  4: [0, 90],
  5: [-90, 0],
  6: [90, 0],
}

/** Voltas completas no ar, para o dado nunca cair "direto" na face. */
const SPINS_MIN = 2
const SPINS_EXTRA = 3

export interface DieSpin {
  readonly x: number
  readonly y: number
}

/**
 * O giro extra é SEMPRE em voltas inteiras (múltiplos de 360). Meia-volta
 * daria variedade também, mas deixaria o dado parado na face oposta à
 * sorteada — e ao assentar ele saltava para a face certa, na frente de quem
 * estava olhando.
 */
export const spinFor = (
  value: DiceSide,
  phase: DiePhase,
  energy: number,
  throwId: number,
): DieSpin => {
  const [faceX, faceY] = FACE_ROTATION[value]
  if (phase !== 'rolling') return { x: faceX, y: faceY }

  const turns = SPINS_MIN + Math.round(energy * SPINS_EXTRA)
  const spinX = turns * 360 + (throwId % 2) * 360
  const spinY = turns * 360 + (throwId % 3) * 360
  return { x: spinX + faceX, y: spinY + faceY }
}
