import type { CompetitionId } from './schedule'

/**
 * Prêmios INDIVIDUAIS: a chuteira do artilheiro e a estatueta de melhor
 * jogador de cada competição.
 *
 * Separados dos troféus de time de propósito. A taça é do clube — pode vir
 * numa temporada em que você jogou pouco. Estes são seus: dizem o que VOCÊ
 * fez, e é por isso que ficam no seu quarto, não na sala de troféus do clube.
 */

export type AwardKind = 'chuteira' | 'melhor-jogador'

export interface Award {
  readonly kind: AwardKind
  readonly competition: CompetitionId
  readonly year: number
  /** Gols na chuteira; nota média no melhor jogador. */
  readonly value: number
}

/** Nota média a partir da qual o craque leva o prêmio de melhor da competição. */
export const MVP_RATING = 7.8
/** Jogos mínimos na competição — não se é melhor de um torneio com um jogo. */
export const MVP_MIN_GAMES = 3

/**
 * Tiers da estatueta. Só existem três artes, e distribuí-las por peso de
 * competição diz mais que espalhar a mesma imagem por nove entradas: o ouro
 * é das decisões grandes, o bronze é de quem está subindo.
 */
export const MVP_TIER: Record<CompetitionId, 'gold' | 'silver' | 'bronze'> = {
  'copa-mundo': 'gold',
  libertados: 'gold',
  'copa-brasil': 'gold',
  liga: 'gold',
  'copa-america': 'silver',
  'liga-nacoes': 'silver',
}

export const AWARD_NAMES: Record<AwardKind, string> = {
  chuteira: 'Chuteira de Ouro',
  'melhor-jogador': 'Melhor jogador',
}

/**
 * O jogador levou a chuteira? Precisa ter marcado, e mais que o segundo
 * colocado — empate na artilharia não rende prêmio, como no futebol de
 * verdade a chuteira vai para quem tem mais.
 */
export const wonGoldenBoot = (myGoals: number, bestRivalGoals: number): boolean =>
  myGoals > 0 && myGoals > bestRivalGoals

/** Melhor jogador: campanha longa o bastante e nota alta o bastante. */
export const wonMvp = (games: number, averageRating: number): boolean =>
  games >= MVP_MIN_GAMES && averageRating >= MVP_RATING

/** Um prêmio só entra uma vez por competição e ano. */
export const hasAward = (
  awards: readonly Award[],
  kind: AwardKind,
  competition: CompetitionId,
  year: number,
): boolean =>
  awards.some(
    (award) =>
      award.kind === kind && award.competition === competition && award.year === year,
  )

export const addAward = (awards: readonly Award[], award: Award): readonly Award[] =>
  hasAward(awards, award.kind, award.competition, award.year) ? awards : [...awards, award]
