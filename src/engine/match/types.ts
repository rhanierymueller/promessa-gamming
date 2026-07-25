import type { RngState } from '../rng'

/**
 * Um momento da timeline da partida. Momentos `player*` pausam a simulação e
 * esperam o resultado do mini-game; os demais são narrados e aplicados direto.
 * `templateId` indexa os textos de narração em `src/data/narration.ts` — a
 * engine não conhece texto, só conteúdo.
 */
export type MatchMoment =
  | { readonly kind: 'kickoff'; readonly minute: number }
  | { readonly kind: 'commentary'; readonly minute: number; readonly templateId: number }
  | { readonly kind: 'teamGoal'; readonly minute: number; readonly templateId: number }
  | { readonly kind: 'opponentGoal'; readonly minute: number; readonly templateId: number }
  | { readonly kind: 'playerShot'; readonly minute: number; readonly templateId: number }
  | { readonly kind: 'playerFreeKick'; readonly minute: number; readonly templateId: number }
  | { readonly kind: 'playerPass'; readonly minute: number; readonly templateId: number }
  | { readonly kind: 'opponentFreeKick'; readonly minute: number; readonly templateId: number }
  /** Lance decisivo no dado: dividida na área, e a sorte resolve. */
  | { readonly kind: 'diceDuel'; readonly minute: number; readonly templateId: number }
  | { readonly kind: 'fulltime'; readonly minute: number }

export type PlayerMomentKind =
  | 'playerShot'
  | 'playerFreeKick'
  | 'playerPass'
  | 'opponentFreeKick'
  | 'diceDuel'

export interface MatchScore {
  readonly team: number
  readonly opponent: number
}

export interface PlayerStats {
  readonly shots: number
  readonly goals: number
  readonly golacos: number
  readonly passes: number
  readonly passesCompleted: number
}

export interface MatchState {
  readonly plan: readonly MatchMoment[]
  readonly cursor: number
  readonly score: MatchScore
  readonly rating: number
  readonly stats: PlayerStats
  readonly rng: RngState
}

export interface MatchConfig {
  /** Quantos lances jogáveis de cada tipo o jogador recebe. */
  readonly playerShots: number
  readonly playerFreeKicks: number
  readonly playerPasses: number
  /** Faltas DO adversário que você defende no gol. */
  readonly opponentFreeKicks: number
  /**
   * Chance de a partida ter o lance de dado — a dividida que a sorte decide.
   * É sorteado, não fixo: o dado tem que ser uma variação entre as outras
   * interações, não mais um passo obrigatório de toda partida.
   */
  readonly diceDuelChance: number
  /** Chance de cada time marcar em lances que não envolvem o jogador. */
  readonly teamGoalChance: number
  readonly opponentGoalChance: number
  readonly maxTeamGoals: number
  readonly maxOpponentGoals: number
  readonly commentaryMoments: number
  readonly commentaryTemplates: number
  /** Nota */
  readonly baseRating: number
  readonly minRating: number
  readonly maxRating: number
}
