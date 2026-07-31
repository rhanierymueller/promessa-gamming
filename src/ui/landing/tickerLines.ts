import { CLUBS, type Club } from '../../data/clubs'

/**
 * A rodada fictícia que corre embaixo do placar. Usa os clubes de verdade do
 * jogo, emparelhados dentro da própria divisão, com placares fixos: é vitrine,
 * não sorteio — resultado mudando a cada recarga viraria ruído.
 */

export interface TickerResult {
  readonly division: number
  readonly home: Club
  readonly away: Club
  readonly homeGoals: number
  readonly awayGoals: number
}

export const DIVISION_LABELS = ['Série A', 'Série B', 'Série C', 'Série D'] as const

const SCORES: readonly (readonly [number, number])[] = [
  [2, 1], [0, 0], [3, 2], [1, 0], [2, 2], [4, 1],
  [1, 3], [0, 2], [2, 0], [1, 1], [3, 0], [2, 3],
]

/** Quebra a lista em duplas; sobra ímpar fica de fora (folga na rodada). */
const pairsOf = (clubs: readonly Club[]): readonly (readonly [Club, Club])[] =>
  Array.from(
    { length: Math.floor(clubs.length / 2) },
    (_, index) => [clubs[index * 2], clubs[index * 2 + 1]] as const,
  )

export const buildTickerResults = (clubs: readonly Club[] = CLUBS): readonly TickerResult[] =>
  DIVISION_LABELS.flatMap((_, division) =>
    pairsOf(clubs.filter((club) => club.division === division)).map(([home, away]) => ({
      division,
      home,
      away,
    })),
  ).map((match, index) => ({
    ...match,
    homeGoals: SCORES[index % SCORES.length][0],
    awayGoals: SCORES[index % SCORES.length][1],
  }))
