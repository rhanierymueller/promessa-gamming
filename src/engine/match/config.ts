import type { MatchConfig } from './types'

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  playerShots: 1,
  // falta perigosa é ocasião especial, não compromisso em toda rodada
  playerFreeKicks: 1,
  playerFreeKickChance: 0.45,
  playerDecisions: 2,
  opponentFreeKicks: 1,
  diceDuelChance: 0.3,
  minimumSpecialMoments: 1,
  /*
   * Estas duas foram CORTADAS quando a decisão passou a marcar gol (0.40 e
   * 0.35 antes). A decisão não soma gol em cima do sorteio: ela absorve parte
   * dele. A média da partida fica onde estava — o que muda é de onde o gol vem.
   * Medido em src/engine/match/calibration.test.ts.
   */
  teamGoalChance: 0.25,
  opponentGoalChance: 0.32,
  maxTeamGoals: 2,
  maxOpponentGoals: 2,
  commentaryMoments: 3,
  commentaryTemplates: 8,
  baseRating: 6,
  minRating: 3,
  maxRating: 10,
}
