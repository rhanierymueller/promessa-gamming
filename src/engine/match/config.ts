import type { MatchConfig } from './types'

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  playerShots: 1,
  // falta perigosa é ocasião especial, não compromisso em toda rodada
  playerFreeKicks: 1,
  playerFreeKickChance: 0.45,
  playerDecisions: 3,
  opponentFreeKicks: 1,
  diceDuelChance: 0.3,
  minimumSpecialMoments: 1,
  /*
   * Cortadas quando a decisão passou a marcar gol (eram 0.40 e 0.35). A decisão
   * não soma gol em cima do sorteio: ela absorve parte dele, e a média da
   * partida fica onde estava — o que muda é de onde o gol vem.
   *
   * Ajustadas de novo junto com `playerDecisions: 3`, para compensar a queda de
   * finalizações que veio de `playerShots: 1` e da falta ocasional. Sem isso a
   * vitória do jogador tinha caído de 50.9% para 40.4%. A compensação veio pelo
   * lance de DECISÃO, não por mais sorteio: devolver gol ao RNG derrubaria a
   * fatia do placar que sai do pé do jogador, que é o ponto da mecânica.
   * Medido em src/engine/match/calibration.test.ts.
   */
  teamGoalChance: 0.3,
  opponentGoalChance: 0.25,
  maxTeamGoals: 2,
  maxOpponentGoals: 2,
  commentaryMoments: 3,
  commentaryTemplates: 8,
  baseRating: 6,
  minRating: 3,
  maxRating: 10,
}
