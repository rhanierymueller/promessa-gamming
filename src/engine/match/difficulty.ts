import type { MatchConfig } from './types'
import { matchupEdges, tightness } from './sectorDuel'
import type { SectorRatings } from '../squad/sectors'

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

/**
 * Chances dos seus lances quando a partida é SIMULADA.
 *
 * Antes saíam só dos seus atributos: com finalização no máximo você convertia
 * 55% dos chutes contra qualquer um, e o adversário não entrava na conta. Na
 * medição, um time SETE pontos mais fraco que o rival ainda vencia 93% das
 * simulações, com a mesma média de gols seus contra fraco e contra forte.
 *
 * Agora a vantagem (ou desvantagem) de elenco desloca as três chances: defesa
 * boa salva mais, defesa fraca sofre mais.
 */
const EDGE_SHOT_SWING = 0.5
const EDGE_SAVE_SWING = 0.35
/** Piso e teto: nem o azarão fica sem chance, nem o favorito vira imbatível. */
const MIN_PROB = 0.08
const MAX_PROB = 0.92

/**
 * A decisão NÃO entra aqui de propósito: ela é resolvida pela distribuição de
 * cinco desfechos do catálogo, que já lê o confronto de setores por conta
 * própria. Uma probabilidade única não representaria os cinco desfechos, e
 * manter uma aqui faria simular e jogar divergirem.
 */
export interface AutoProbInput {
  readonly shotGoal: number
  readonly defenseSave: number
}

export const autoProbsForEdge = (
  base: AutoProbInput,
  myRating: number,
  opponentRating: number,
): AutoProbInput => {
  const edge = ratingEdgeFor(myRating, opponentRating)
  const ajusta = (valor: number, swing: number): number =>
    clamp(valor + edge * swing, MIN_PROB, MAX_PROB)
  return {
    shotGoal: ajusta(base.shotGoal, EDGE_SHOT_SWING),
    // defender é contra o ATAQUE deles: a vantagem entra invertida
    defenseSave: ajusta(base.defenseSave, EDGE_SAVE_SWING),
  }
}

/**
 * Dificuldade a partir dos SETORES, no lugar do overall único.
 *
 *   seu ataque × defesa deles  → sua chance de marcar
 *   ataque deles × sua defesa  → a chance deles
 *   meio × meio                → quantos lances a partida oferece
 *   duelo travado              → segura os dois placares
 */
const SECTOR_GOAL_SWING = 0.3
const TIGHT_GOAL_CUT = 0.35
const MID_MOMENT_SWING = 2
/**
 * O meio também rende DECISÃO, não só chute — a decisão é o lance de construção
 * por definição, e antes era o único que mexia no placar sem a dificuldade
 * poder modulá-lo. Swing menor que o do chute de propósito: a decisão marca
 * para os dois lados, então cada uma a mais pesa mais no placar.
 */
const MID_DECISION_SWING = 1

export const matchConfigForSectors = (
  base: MatchConfig,
  mine: SectorRatings,
  theirs: SectorRatings,
): MatchConfig => {
  const edges = matchupEdges(mine, theirs)
  const travado = 1 - tightness(mine, theirs) * TIGHT_GOAL_CUT
  // meio melhor constrói mais: mais lances jogáveis para você
  const extraMoments = Math.round(edges.midfield * MID_MOMENT_SWING)
  return {
    ...base,
    teamGoalChance: clamp(
      (base.teamGoalChance + edges.attack * SECTOR_GOAL_SWING) * travado,
      MIN_CHANCE,
      MAX_TEAM_CHANCE,
    ),
    opponentGoalChance: clamp(
      (base.opponentGoalChance - edges.defense * SECTOR_GOAL_SWING) * travado,
      MIN_CHANCE,
      MAX_OPPONENT_CHANCE,
    ),
    playerShots: Math.max(1, base.playerShots + extraMoments),
    playerDecisions: Math.max(1, base.playerDecisions + Math.round(edges.midfield * MID_DECISION_SWING)),
  }
}

/** Chances dos SEUS lances pelos setores: ataque contra a defesa deles. */
export const autoProbsForSectors = (
  base: AutoProbInput,
  mine: SectorRatings,
  theirs: SectorRatings,
): AutoProbInput => {
  const edges = matchupEdges(mine, theirs)
  const travado = 1 - tightness(mine, theirs) * TIGHT_GOAL_CUT
  const ajusta = (valor: number, swing: number): number =>
    clamp(valor + swing, MIN_PROB, MAX_PROB)
  return {
    shotGoal: ajusta(base.shotGoal * travado, edges.attack * EDGE_SHOT_SWING),
    defenseSave: ajusta(base.defenseSave, edges.defense * EDGE_SAVE_SWING),
  }
}
