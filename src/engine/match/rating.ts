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

/**
 * Teto da nota pelo RESULTADO. Nota é o quanto você decidiu a partida, e nem
 * a melhor atuação individual decide um jogo que terminou sem vitória.
 *
 * Sem isto dava para sair de um 2×2 com nota 10 — o mesmo 10 de quem ganhou
 * sozinho. O piso continua sendo a atuação: jogar mal numa vitória não vira
 * nota alta, o teto só impede o inverso.
 */
export const DRAW_RATING_CAP = 8.5
export const LOSS_RATING_CAP = 7.5

export const capRatingByResult = (
  rating: number,
  teamGoals: number,
  opponentGoals: number,
): number => {
  if (teamGoals > opponentGoals) return rating
  return Math.min(rating, teamGoals === opponentGoals ? DRAW_RATING_CAP : LOSS_RATING_CAP)
}
