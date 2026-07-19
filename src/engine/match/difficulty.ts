import type { MatchConfig } from './types'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * A partida é dirigida pelo OVERALL das duas escalações (estilo FIFA): o
 * favorito cria e sofre menos, mas a zebra continua matematicamente viva —
 * e os SEUS lances (mini-games) podem virar qualquer jogo.
 */

/** Diferença de rating que já conta como "abismo" (satura o efeito). */
const RATING_SPAN = 60
const TEAM_SWING = 0.45
const OPPONENT_SWING = 0.5
const MIN_CHANCE = 0.05
const MAX_TEAM_CHANCE = 0.85
const MAX_OPPONENT_CHANCE = 0.9
/** Vantagem (em edge) que libera um gol a mais no teto do dominante. */
const EXTRA_GOAL_EDGE = 0.25

/** Vantagem técnica normalizada (−0.5..0.5) — usada também no lance corrido. */
export const ratingEdgeFor = (myRating: number, opponentRating: number): number =>
  clamp((myRating - opponentRating) / RATING_SPAN, -0.5, 0.5)

export const matchConfigForRatings = (
  base: MatchConfig,
  myRating: number,
  opponentRating: number,
): MatchConfig => {
  const edge = ratingEdgeFor(myRating, opponentRating)
  return {
    ...base,
    teamGoalChance: clamp(base.teamGoalChance + edge * TEAM_SWING, MIN_CHANCE, MAX_TEAM_CHANCE),
    opponentGoalChance: clamp(
      base.opponentGoalChance - edge * OPPONENT_SWING,
      MIN_CHANCE,
      MAX_OPPONENT_CHANCE,
    ),
    maxTeamGoals: edge >= EXTRA_GOAL_EDGE ? base.maxTeamGoals + 1 : base.maxTeamGoals,
    maxOpponentGoals: edge <= -EXTRA_GOAL_EDGE ? base.maxOpponentGoals + 1 : base.maxOpponentGoals,
  }
}
