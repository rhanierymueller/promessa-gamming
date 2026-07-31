import type { FacePresentation } from './faces'
import type { BallMotion } from './liveBallPhysics'
import type { PitchDirective } from './LivePitch'

/**
 * Geometria e estado da mesa tática.
 *
 * Separado do componente porque `LivePitch.tsx` passou de 900 linhas: aqui fica
 * o que descreve o campo e a simulação, lá fica quem os move e desenha.
 */

export const W = 360
export const H = 232
export const PITCH_TOP = 8
export const PITCH_BOTTOM = 216
export const USER_COLOR = '#FFD23F'

export interface Vec {
  x: number
  y: number
}

/** 1-4-3-3 normalizado, atacando para a direita. Índice 9 = centroavante (o usuário). */
export const FORMATION: readonly Vec[] = [
  { x: 0.05, y: 0.5 },
  { x: 0.17, y: 0.16 }, { x: 0.15, y: 0.39 }, { x: 0.15, y: 0.61 }, { x: 0.17, y: 0.84 },
  { x: 0.3, y: 0.28 }, { x: 0.28, y: 0.5 }, { x: 0.3, y: 0.72 },
  { x: 0.43, y: 0.18 }, { x: 0.45, y: 0.5 }, { x: 0.43, y: 0.82 },
]

export const USER_FORMATION_INDEX = 9

export interface SimPlayer {
  name: string
  side: 'team' | 'opponent'
  isUser: boolean
  face: FacePresentation | null
  base: Vec
  pos: Vec
}

export type SimPhase = 'idle' | 'ballMoving' | 'holding' | 'goalFlash'

export interface SimState {
  players: SimPlayer[]
  holder: number
  ball: Vec
  ballFrom: Vec
  ballTo: Vec
  ballProgress: number
  ballFlightTime: number
  ballMotion: BallMotion
  ballDistance: number
  ballCurve: number
  ballRotation: number
  ballSpinDirection: 1 | -1
  phase: SimPhase
  holdTimer: number
  flashTimer: number
  pendingOutcome: 'none' | 'saved' | 'wide' | 'goal'
  directiveQueue: PitchDirective | null
  lastDirectiveId: number
  completedDirectiveId: number
  /** Diretiva de gol cujo chute está no ar — só conclui quando a bola entrar (0 = nenhuma). */
  goalShotDirectiveId: number
  lastGoalSide: 'team' | 'opponent'
}

export const toPitch = (v: Vec): Vec => ({
  x: 12 + v.x * (W - 24),
  y: PITCH_TOP + v.y * (PITCH_BOTTOM - PITCH_TOP),
})

export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y)
