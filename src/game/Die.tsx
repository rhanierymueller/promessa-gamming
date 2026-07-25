import type { DiceSide } from '../engine/dice/duel'

/**
 * Dado de seis lados em 3D (CSS). Cada face fica numa parede do cubo, então o
 * lançamento é rotação de verdade — o dado cai na mesa, quica e vai virando
 * até assentar na face sorteada.
 */

/** Rotação que traz cada face para a frente. */
const FACE_ROTATION: Record<DiceSide, readonly [number, number]> = {
  1: [0, 0],
  2: [0, -90],
  3: [0, 180],
  4: [0, 90],
  5: [-90, 0],
  6: [90, 0],
}

/** Posições dos pontos em cada face, na grade 3×3. */
const PIPS: Record<DiceSide, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

const FACES: readonly { readonly side: DiceSide; readonly transform: string }[] = [
  { side: 1, transform: 'translateZ(var(--die-half))' },
  { side: 3, transform: 'rotateY(180deg) translateZ(var(--die-half))' },
  { side: 2, transform: 'rotateY(90deg) translateZ(var(--die-half))' },
  { side: 4, transform: 'rotateY(-90deg) translateZ(var(--die-half))' },
  { side: 5, transform: 'rotateX(90deg) translateZ(var(--die-half))' },
  { side: 6, transform: 'rotateX(-90deg) translateZ(var(--die-half))' },
]

export type DiePhase = 'still' | 'shaking' | 'rolling'

interface DieProps {
  /** Face virada para cima quando o dado assenta. */
  readonly value: DiceSide
  readonly phase: DiePhase
  /** Força do chacoalho (0-1): tremor mais forte e mais voltas no lançamento. */
  readonly energy?: number
  /** Muda a cada lançamento — refaz a animação de queda do zero. */
  readonly throwId?: number
}

/** Voltas completas no ar, para o dado nunca cair "direto" na face. */
const SPINS_MIN = 2
const SPINS_EXTRA = 3

export const Die = ({ value, phase, energy = 0, throwId = 0 }: DieProps) => {
  const [faceX, faceY] = FACE_ROTATION[value]
  // giros variam com o arremesso: dado nenhum cai igual duas vezes
  const turns = SPINS_MIN + Math.round(energy * SPINS_EXTRA)
  const spinX = phase === 'rolling' ? turns * 360 + (throwId % 2 === 0 ? 360 : 0) : 0
  const spinY = phase === 'rolling' ? turns * 360 + (throwId % 3) * 180 : 0

  return (
    <div
      className={`die-scene die-${phase}`}
      style={
        {
          '--die-shake': `${1.5 + energy * 3}px`,
          '--die-spin-x': `${spinX + faceX}deg`,
          '--die-spin-y': `${spinY + faceY}deg`,
        } as React.CSSProperties
      }
      aria-label={`Dado mostrando ${value}`}
      role="img"
    >
      <div className="die-shadow" aria-hidden="true" />
      <div className="die" key={phase === 'rolling' ? throwId : 'idle'}>
        {FACES.map((face) => (
          <div key={face.side} className="die-face" style={{ transform: face.transform }}>
            {Array.from({ length: 9 }, (_, cell) => (
              <span
                key={cell}
                className={`die-pip${PIPS[face.side].includes(cell) ? ' die-pip-on' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
