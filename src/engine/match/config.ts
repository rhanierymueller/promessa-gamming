import type { MatchConfig } from './types'

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  playerShots: 1,
  /*
   * Falta perigosa: uma por partida, no segundo tempo. A chance subiu junto
   * com o corte de decisões (3 → 2) — sem ela, a fatia do placar que sai do PÉ
   * do jogador caía, e devolver esse gol ao sorteio seria trocar mecânica por
   * acaso, justamente o contrário do que o corte pretende.
   */
  playerFreeKicks: 1,
  playerFreeKickChance: 0.62,
  /*
   * Duas por partida: uma em cada tempo. Eram três, e com o minuto sorteado
   * livremente elas se amontoavam — a partida virava um menu atrás do outro e
   * a escolha perdia peso. O teto é este; a diferença de força entre os times
   * decide se a segunda aparece.
   */
  playerDecisions: 2,
  /** Até duas defesas, uma por tempo — e nem sempre as duas. */
  opponentFreeKicks: 2,
  opponentFreeKickChance: 0.55,
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
  teamGoalChance: 0.26,
  opponentGoalChance: 0.18,
  /*
   * Recalibradas com o corte de 3 para 2 decisões. Menos lances jogáveis
   * significa menos gol saindo do pé do jogador, e o sorteio não pode cobrir
   * esse buraco — cobrir devolveria o placar ao acaso. Em vez disso os DOIS
   * lados do sorteio baixaram: a partida tem menos gol aleatório e a fatia do
   * placar que você decide subiu de volta.
   *
   * `opponentGoalChance` desceu de novo (0.20 → 0.18) quando o contra-ataque
   * das decisões ganhou piso: o adversário passou a marcar MAIS pela via da
   * sua escolha errada, e o sorteio cedeu espaço para isso. É a mesma troca de
   * sempre — gol de acaso sai, gol de consequência entra.
   * Medido em calibration.test.ts.
   */
  maxTeamGoals: 2,
  maxOpponentGoals: 2,
  commentaryMoments: 3,
  commentaryTemplates: 8,
  baseRating: 6,
  minRating: 3,
  maxRating: 10,
}
