import type { ShotOutcomeKind } from '../shot/types'
import type { MatchConfig } from './types'

/** Impacto de cada desfecho de chute na nota da partida. */
const SHOT_RATING_DELTA: Record<ShotOutcomeKind, number> = {
  goal: 1.6,
  post: 0.2,
  save: -0.1,
  miss: -0.4,
}

export const GOLACO_BONUS = 0.6

export const shotRatingDelta = (outcome: ShotOutcomeKind, isGolaco: boolean): number =>
  SHOT_RATING_DELTA[outcome] + (outcome === 'goal' && isGolaco ? GOLACO_BONUS : 0)

export const clampRating = (rating: number, config: MatchConfig): number =>
  Math.min(config.maxRating, Math.max(config.minRating, rating))

/** Nota exibida: uma casa decimal, estilo caderno de jornal. */
export const displayRating = (rating: number): number => Math.round(rating * 10) / 10
