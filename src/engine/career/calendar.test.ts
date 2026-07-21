import { describe, expect, test } from 'vitest'
import { roundDate, seasonYearFor, tournamentDate } from './calendar'
import { SEASON_ROUNDS } from '../season/types'

describe('calendário real da temporada', () => {
  test('ano 1 da carreira é 2026; cada temporada avança um ano', () => {
    // Arrange + Act + Assert
    expect(seasonYearFor(1)).toBe(2026)
    expect(seasonYearFor(2)).toBe(2027)
    expect(seasonYearFor(10)).toBe(2035)
  })

  test('as 13 rodadas caem em domingos, de duas em duas semanas', () => {
    // Arrange
    const dates = Array.from({ length: SEASON_ROUNDS }, (_, round) => roundDate(1, round))

    // Assert: todas domingo, espaçadas 14 dias
    for (const date of dates) {
      expect(new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()).toBe(0)
    }
    for (let i = 1; i < dates.length; i++) {
      const prev = Date.UTC(dates[i - 1].year, dates[i - 1].month, dates[i - 1].day)
      const curr = Date.UTC(dates[i].year, dates[i].month, dates[i].day)
      expect((curr - prev) / 86_400_000).toBe(14)
    }
  })

  test('temporada abre em março e termina antes de outubro', () => {
    // Arrange + Act
    const first = roundDate(1, 0)
    const last = roundDate(1, SEASON_ROUNDS - 1)

    // Assert
    expect(first.month).toBe(2)
    expect(last.month).toBeLessThan(9)
  })

  test('torneio de seleções cai num domingo de dezembro do mesmo ano', () => {
    // Arrange + Act
    const date = tournamentDate(2)

    // Assert
    expect(date.year).toBe(2027)
    expect(date.month).toBe(11)
    expect(new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()).toBe(0)
  })
})
