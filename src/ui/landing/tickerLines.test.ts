import { describe, expect, test } from 'vitest'
import { CLUBS } from '../../data/clubs'
import { buildTickerResults, DIVISION_LABELS } from './tickerLines'

describe('buildTickerResults', () => {
  test('empareha clubes apenas dentro da mesma divisão', () => {
    const results = buildTickerResults()

    for (const result of results) {
      expect(result.home.division).toBe(result.division)
      expect(result.away.division).toBe(result.division)
    }
  })

  test('cobre as quatro divisões do jogo', () => {
    const divisions = new Set(buildTickerResults().map((result) => result.division))

    expect(divisions).toEqual(new Set(DIVISION_LABELS.map((_, index) => index)))
  })

  test('nunca escala o mesmo clube duas vezes na rodada', () => {
    const results = buildTickerResults()
    const ids = results.flatMap((result) => [result.home.id, result.away.id])

    expect(new Set(ids).size).toBe(ids.length)
  })

  test('devolve sempre a mesma rodada — placar é vitrine, não sorteio', () => {
    expect(buildTickerResults()).toEqual(buildTickerResults())
  })

  test('descarta a sobra quando a divisão tem número ímpar de clubes', () => {
    const impar = CLUBS.filter((club) => club.division === 0).slice(0, 5)

    expect(buildTickerResults(impar)).toHaveLength(2)
  })
})
