import type { MatchConfig } from './types'

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  playerShots: 2,
  playerFreeKicks: 1,
  playerDecisions: 2,
  opponentFreeKicks: 1,
  diceDuelChance: 0.3,
  teamGoalChance: 0.4,
  opponentGoalChance: 0.35,
  maxTeamGoals: 2,
  maxOpponentGoals: 2,
  commentaryMoments: 3,
  commentaryTemplates: 8,
  baseRating: 6,
  minRating: 3,
  maxRating: 10,
}
