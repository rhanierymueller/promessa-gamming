/**
 * Calendário real da temporada. O ano N da carreira vira um ano de verdade e a
 * liga joga aos fins de semana: semanal numa temporada comum, quinzenal quando
 * o clube disputa a Copa Libertados — aí as quartas ficam para o continente e
 * as duas competições dividem a mesma semana, em vez de correrem separadas.
 */

export interface CalendarDate {
  readonly year: number
  readonly month: number
  readonly day: number
}

/** Ano real do primeiro ano de carreira. */
export const BASE_SEASON_YEAR = 2026

/** Mês (0-11) da rodada de abertura da liga. */
const OPENING_MONTH = 2
/** Mês (0-11) do primeiro jogo da Libertados — sempre abril. */
const LIBERTADOS_MONTH = 3

const WEEK_DAYS = 7
const FORTNIGHT_DAYS = 14

/** Dias possíveis de rodada (0=domingo), alternando por temporada. */
export const LEAGUE_WEEKDAYS: readonly number[] = [6, 0] // sábado, domingo
export const CUP_WEEKDAYS: readonly number[] = [3, 4] // quarta, quinta

const alternating = (days: readonly number[], careerYear: number): number =>
  days[(careerYear - 1) % days.length]

export const leagueWeekdayFor = (careerYear: number): number =>
  alternating(LEAGUE_WEEKDAYS, careerYear)

export const cupWeekdayFor = (careerYear: number): number =>
  alternating(CUP_WEEKDAYS, careerYear)

export const seasonYearFor = (careerYear: number): number =>
  BASE_SEASON_YEAR + careerYear - 1

/** Primeira ocorrência de um dia da semana no mês (0=domingo). */
const firstWeekdayOf = (year: number, month: number, weekday: number): CalendarDate => {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return { year, month, day: 1 + ((weekday - firstDay + 7) % 7) }
}

const addDays = (date: CalendarDate, days: number): CalendarDate => {
  const shifted = new Date(Date.UTC(date.year, date.month, date.day + days))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  }
}

/** Ordena duas datas no tempo: negativo se `a` vem antes. */
export const compareDates = (a: CalendarDate, b: CalendarDate): number =>
  Date.UTC(a.year, a.month, a.day) - Date.UTC(b.year, b.month, b.day)

/**
 * Data real da rodada (0-based): sai do primeiro dia de jogo de março e anda de
 * semana em semana — ou de quinze em quinze dias, em ano de Libertados.
 */
export const roundDate = (
  careerYear: number,
  round: number,
  inLibertados = false,
): CalendarDate => {
  const opening = firstWeekdayOf(
    seasonYearFor(careerYear),
    OPENING_MONTH,
    leagueWeekdayFor(careerYear),
  )
  return addDays(opening, round * (inLibertados ? FORTNIGHT_DAYS : WEEK_DAYS))
}

/** Data real de um jogo da Libertados (0-13): abril, de quinze em quinze dias. */
export const libertadosDate = (careerYear: number, matchIndex: number): CalendarDate => {
  const opening = firstWeekdayOf(
    seasonYearFor(careerYear),
    LIBERTADOS_MONTH,
    cupWeekdayFor(careerYear),
  )
  return addDays(opening, matchIndex * FORTNIGHT_DAYS)
}

const firstSundayOf = (year: number, month: number): CalendarDate =>
  firstWeekdayOf(year, month, 0)

/** Data real do torneio de seleções (dezembro). */
export const tournamentDate = (careerYear: number): CalendarDate =>
  firstSundayOf(seasonYearFor(careerYear), 11)
