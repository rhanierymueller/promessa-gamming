import { describe, expect, test } from 'vitest'
import {
  compareDates,
  cupWeekdayFor,
  leagueWeekdayFor,
  libertadosDate,
  roundDate,
  seasonYearFor,
  tournamentDate,
} from './calendar'
import { SEASON_ROUNDS } from '../season/types'
import { MATCHES_PER_EDITION } from '../libertados/types'

const weekdayOf = (date: { year: number; month: number; day: number }): number =>
  new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()

const daysBetween = (
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number => (Date.UTC(b.year, b.month, b.day) - Date.UTC(a.year, a.month, a.day)) / 86_400_000

const SUNDAY = 0
const WEDNESDAY = 3
const THURSDAY = 4
const SATURDAY = 6

describe('calendário real da temporada', () => {
  test('ano 1 da carreira é 2026; cada temporada avança um ano', () => {
    expect(seasonYearFor(1)).toBe(2026)
    expect(seasonYearFor(10)).toBe(2035)
  })

  test('a liga joga sábado ou domingo, alternando por temporada', () => {
    expect(leagueWeekdayFor(1)).toBe(SATURDAY)
    expect(leagueWeekdayFor(2)).toBe(SUNDAY)
    expect(leagueWeekdayFor(3)).toBe(SATURDAY)
  })

  test('a copa continental joga quarta ou quinta, alternando por temporada', () => {
    expect(cupWeekdayFor(1)).toBe(WEDNESDAY)
    expect(cupWeekdayFor(2)).toBe(THURSDAY)
  })

  test('sem Libertados a liga é semanal e fecha em maio', () => {
    const datas = Array.from({ length: SEASON_ROUNDS }, (_, round) => roundDate(1, round))
    expect(datas[0].month).toBe(2)
    expect(weekdayOf(datas[0])).toBe(SATURDAY)
    for (let i = 1; i < datas.length; i++) {
      expect(daysBetween(datas[i - 1], datas[i])).toBe(7)
    }
    expect(datas[datas.length - 1].month).toBe(4)
  })

  test('com Libertados a liga é quinzenal e se estica até agosto', () => {
    const datas = Array.from({ length: SEASON_ROUNDS }, (_, round) => roundDate(1, round, true))
    for (let i = 1; i < datas.length; i++) {
      expect(daysBetween(datas[i - 1], datas[i])).toBe(14)
    }
    expect(datas[datas.length - 1].month).toBe(7)
  })

  test('a rodada de abertura é a mesma nos dois ritmos', () => {
    expect(roundDate(1, 0, true)).toEqual(roundDate(1, 0))
  })

  test('a Libertados abre em abril e joga de quinze em quinze dias', () => {
    const datas = Array.from({ length: MATCHES_PER_EDITION }, (_, index) => libertadosDate(1, index))
    expect(datas[0].month).toBe(3)
    expect(weekdayOf(datas[0])).toBe(WEDNESDAY)
    for (let i = 1; i < datas.length; i++) {
      expect(daysBetween(datas[i - 1], datas[i])).toBe(14)
      expect(weekdayOf(datas[i])).toBe(WEDNESDAY)
    }
  })

  test('a edição fecha em setembro, antes do torneio de seleções', () => {
    const ultima = libertadosDate(1, MATCHES_PER_EDITION - 1)
    expect(ultima.month).toBe(8)
    expect(compareDates(ultima, tournamentDate(1))).toBeLessThan(0)
  })

  test('quase todo jogo da Libertados cai numa semana que também tem rodada de liga', () => {
    const rodadas = Array.from({ length: SEASON_ROUNDS }, (_, round) => roundDate(1, round, true))
    const acompanhados = Array.from({ length: MATCHES_PER_EDITION }, (_, index) =>
      libertadosDate(1, index),
    ).filter((jogo) => rodadas.some((rodada) => Math.abs(daysBetween(jogo, rodada)) <= 3))
    expect(acompanhados.length).toBeGreaterThanOrEqual(10)
  })

  test('compareDates ordena no tempo', () => {
    expect(compareDates({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 3, day: 2 })).toBeLessThan(0)
    expect(compareDates({ year: 2026, month: 3, day: 2 }, { year: 2026, month: 3, day: 2 })).toBe(0)
  })

  test('torneio de seleções segue num domingo de dezembro', () => {
    const date = tournamentDate(2)
    expect(date.year).toBe(2027)
    expect(date.month).toBe(11)
    expect(weekdayOf(date)).toBe(SUNDAY)
  })
})
