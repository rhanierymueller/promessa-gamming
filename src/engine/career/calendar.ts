/**
 * Calendário real da temporada: o ano N da carreira vira um ano de verdade.
 * A liga joga DOIS jogos por semana, como no Brasileirão — ou quarta e
 * sábado, ou domingo e quinta — e o torneio de seleções fecha o ano num
 * domingo de dezembro.
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

/**
 * Os dois calendários possíveis (dia da semana: 0=domingo). Cada temporada
 * adota um deles e alterna entre os dois dias, dando dois jogos por semana.
 */
export const MATCH_DAY_PATTERNS: readonly (readonly [number, number])[] = [
  [3, 6], // quarta e sábado
  [0, 4], // domingo e quinta
]

/** Padrão da temporada — fixo por ano de carreira, alternando entre eles. */
export const matchDaysFor = (careerYear: number): readonly [number, number] =>
  MATCH_DAY_PATTERNS[(careerYear - 1) % MATCH_DAY_PATTERNS.length]

export const seasonYearFor = (careerYear: number): number =>
  BASE_SEASON_YEAR + careerYear - 1

/** Primeira ocorrência de um dia da semana no mês (0=domingo). */
const firstWeekdayOf = (year: number, month: number, weekday: number): CalendarDate => {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return { year, month, day: 1 + ((weekday - firstDay + 7) % 7) }
}

const firstSundayOf = (year: number, month: number): CalendarDate =>
  firstWeekdayOf(year, month, 0)

const addDays = (date: CalendarDate, days: number): CalendarDate => {
  const shifted = new Date(Date.UTC(date.year, date.month, date.day + days))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  }
}

/**
 * Data real da rodada (0-based). Sai do primeiro dia do padrão em março e
 * vai pulando de um dia do par para o outro: 3 dias, 4 dias, 3, 4…
 */
export const roundDate = (careerYear: number, round: number): CalendarDate => {
  const [first, second] = matchDaysFor(careerYear)
  const gapToSecond = (second - first + 7) % 7
  const fullWeeks = Math.floor(round / 2)
  const offset = fullWeeks * 7 + (round % 2 === 1 ? gapToSecond : 0)
  return addDays(firstWeekdayOf(seasonYearFor(careerYear), OPENING_MONTH, first), offset)
}

/** Data real do torneio de seleções (dezembro). */
export const tournamentDate = (careerYear: number): CalendarDate =>
  firstSundayOf(seasonYearFor(careerYear), 11)
