import { describe, expect, test } from 'vitest'
import { MATCH_DAY_PATTERNS, matchDaysFor, roundDate, seasonYearFor, tournamentDate } from './calendar'
import { SEASON_ROUNDS } from '../season/types'

const weekdayOf = (date: { year: number; month: number; day: number }): number =>
  new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()

const SUNDAY = 0
const WEDNESDAY = 3
const THURSDAY = 4
const SATURDAY = 6

describe('calendário real da temporada', () => {
  test('ano 1 da carreira é 2026; cada temporada avança um ano', () => {
    expect(seasonYearFor(1)).toBe(2026)
    expect(seasonYearFor(2)).toBe(2027)
    expect(seasonYearFor(10)).toBe(2035)
  })

  test('só existem dois padrões de dias: quarta/sábado ou domingo/quinta', () => {
    expect(MATCH_DAY_PATTERNS).toEqual([
      [WEDNESDAY, SATURDAY],
      [SUNDAY, THURSDAY],
    ])
  })

  test('toda rodada cai num dos dois dias do padrão da temporada', () => {
    for (const careerYear of [1, 2, 3, 4, 5, 6]) {
      const pattern = matchDaysFor(careerYear)
      for (let round = 0; round < SEASON_ROUNDS; round++) {
        expect(pattern).toContain(weekdayOf(roundDate(careerYear, round)))
      }
    }
  })

  test('os jogos alternam entre os dois dias, sem repetir o mesmo dia seguido', () => {
    // Arrange
    const dias = Array.from({ length: SEASON_ROUNDS }, (_, round) => weekdayOf(roundDate(1, round)))

    // Assert
    for (let i = 1; i < dias.length; i++) {
      expect(dias[i]).not.toBe(dias[i - 1])
    }
  })

  test('são dois jogos por semana: 3 ou 4 dias entre rodadas', () => {
    // Arrange
    const datas = Array.from({ length: SEASON_ROUNDS }, (_, round) => roundDate(1, round))

    // Assert
    for (let i = 1; i < datas.length; i++) {
      const anterior = Date.UTC(datas[i - 1].year, datas[i - 1].month, datas[i - 1].day)
      const atual = Date.UTC(datas[i].year, datas[i].month, datas[i].day)
      expect([3, 4]).toContain((atual - anterior) / 86_400_000)
    }
  })

  test('as rodadas seguem sempre para a frente no tempo', () => {
    for (const careerYear of [1, 3, 7]) {
      for (let round = 1; round < SEASON_ROUNDS; round++) {
        const anterior = roundDate(careerYear, round - 1)
        const atual = roundDate(careerYear, round)
        expect(Date.UTC(atual.year, atual.month, atual.day)).toBeGreaterThan(
          Date.UTC(anterior.year, anterior.month, anterior.day),
        )
      }
    }
  })

  test('temporada abre em março e fecha antes do torneio de dezembro', () => {
    const first = roundDate(1, 0)
    const last = roundDate(1, SEASON_ROUNDS - 1)
    expect(first.month).toBe(2)
    expect(last.month).toBeLessThan(11)
  })

  test('o padrão da temporada é estável (a mesma carreira não muda de dia)', () => {
    expect(matchDaysFor(3)).toEqual(matchDaysFor(3))
    expect(roundDate(3, 5)).toEqual(roundDate(3, 5))
  })

  test('torneio de seleções cai num domingo de dezembro do mesmo ano', () => {
    const date = tournamentDate(2)
    expect(date.year).toBe(2027)
    expect(date.month).toBe(11)
    expect(weekdayOf(date)).toBe(SUNDAY)
  })
})
