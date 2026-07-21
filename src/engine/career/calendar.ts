/**
 * Calendário real da temporada: o ano N da carreira vira um ano de verdade,
 * as 13 rodadas da liga caem em domingos quinzenais (março a agosto) e o
 * torneio de seleções fecha o ano num domingo de dezembro — como no FIFA.
 */

export interface CalendarDate {
  readonly year: number
  readonly month: number
  readonly day: number
}

/** Ano real do primeiro ano de carreira. */
export const BASE_SEASON_YEAR = 2026

/** Mês (0-11) da rodada de abertura. */
const OPENING_MONTH = 2

/** Intervalo entre rodadas, em dias. */
const DAYS_BETWEEN_ROUNDS = 14

export const seasonYearFor = (careerYear: number): number =>
  BASE_SEASON_YEAR + careerYear - 1

const firstSundayOf = (year: number, month: number): CalendarDate => {
  const weekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return { year, month, day: 1 + ((7 - weekday) % 7) }
}

const addDays = (date: CalendarDate, days: number): CalendarDate => {
  const shifted = new Date(Date.UTC(date.year, date.month, date.day + days))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  }
}

/** Data real da rodada (0-based) de uma temporada. */
export const roundDate = (careerYear: number, round: number): CalendarDate =>
  addDays(firstSundayOf(seasonYearFor(careerYear), OPENING_MONTH), round * DAYS_BETWEEN_ROUNDS)

/** Data real do torneio de seleções (dezembro). */
export const tournamentDate = (careerYear: number): CalendarDate =>
  firstSundayOf(seasonYearFor(careerYear), 11)
