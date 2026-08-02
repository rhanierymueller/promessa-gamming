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

/**
 * Dias de calendário antes da primeira rodada. A carreira não abre no dia do
 * jogo: a pré-temporada é o que dá ao jogador a primeira volta de relógio.
 */
export const PRESEASON_DAYS = 7

/** Mês (0-11) da rodada de abertura da liga. */
const OPENING_MONTH = 2
/** Mês (0-11) do primeiro jogo da Libertados — sempre abril. */
const LIBERTADOS_MONTH = 3

const WEEK_DAYS = 7

/**
 * Dias de jogo dentro da semana, contados a partir da SEGUNDA.
 *
 * A semana começa na segunda de propósito: assim o meio de semana (2-3) vem
 * sempre antes do fim de semana (5-6) e a ordem dos compromissos nunca se
 * inverte. Com a semana começando no domingo, um jogo de domingo cairia no
 * índice 0 e apareceria ANTES do sábado da mesma rodada.
 */
const MONDAY_OFFSET = { wed: 2, thu: 3, sat: 5, sun: 6 } as const

/** Fim de semana: a rodada cai no sábado ou no domingo, e isso varia. */
export const LEAGUE_OFFSETS: readonly number[] = [MONDAY_OFFSET.sat, MONDAY_OFFSET.sun]
/** Meio de semana: quarta ou quinta, e isso também varia. */
export const CUP_OFFSETS: readonly number[] = [MONDAY_OFFSET.wed, MONDAY_OFFSET.thu]

/** Dias possíveis de rodada (0=domingo) — para quem precisa do dia da semana. */
export const LEAGUE_WEEKDAYS: readonly number[] = [6, 0] // sábado, domingo
export const CUP_WEEKDAYS: readonly number[] = [3, 4] // quarta, quinta

/**
 * Sorteio determinístico do dia: mesma temporada e mesma rodada dão sempre o
 * mesmo dia, mas rodadas seguidas não caem todas no mesmo dia da semana.
 *
 * Uma tabela fixa por temporada (o que havia antes) deixava o ano inteiro num
 * único dia — treze sábados seguidos. O campeonato real mistura.
 */
const pickOffset = (offsets: readonly number[], careerYear: number, index: number): number => {
  const mixed = Math.imul(careerYear * 73856093 + index * 19349663, 0x9e3779b1) >>> 0
  return offsets[mixed % offsets.length]
}

/** Dia da semana da rodada (0=domingo): sábado ou domingo, variando. */
export const leagueWeekdayFor = (careerYear: number, round = 0): number =>
  pickOffset(LEAGUE_OFFSETS, careerYear, round) === MONDAY_OFFSET.sat ? 6 : 0

/** Dia da semana do jogo de copa (0=domingo): quarta ou quinta, variando. */
export const cupWeekdayFor = (careerYear: number, index = 0): number =>
  pickOffset(CUP_OFFSETS, careerYear, index) === MONDAY_OFFSET.wed ? 3 : 4

export const seasonYearFor = (careerYear: number): number =>
  BASE_SEASON_YEAR + careerYear - 1

/** Primeira ocorrência de um dia da semana no mês (0=domingo). */
const firstWeekdayOf = (year: number, month: number, weekday: number): CalendarDate => {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return { year, month, day: 1 + ((weekday - firstDay + 7) % 7) }
}

/** Anda `days` dias no calendário, virando mês e ano quando precisa. */
export const addDays = (date: CalendarDate, days: number): CalendarDate => {
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
 * A segunda-feira que abre a semana `week` da temporada. É a âncora de tudo:
 * cada competição escolhe só o DIA dentro da semana, então liga e copas nunca
 * saem de sincronia por mais que os dias variem.
 */
const seasonWeekStart = (careerYear: number, week: number): CalendarDate => {
  const firstMonday = firstWeekdayOf(seasonYearFor(careerYear), OPENING_MONTH, 1)
  return addDays(firstMonday, week * WEEK_DAYS)
}

/**
 * Data real da rodada (0-based): a semana avança de sete em sete dias — ou de
 * quinze em quinze, em ano de Libertados — e o dia dentro dela varia entre
 * sábado e domingo.
 */
export const roundDate = (
  careerYear: number,
  round: number,
  inLibertados = false,
): CalendarDate => {
  const week = round * (inLibertados ? 2 : 1)
  return addDays(seasonWeekStart(careerYear, week), pickOffset(LEAGUE_OFFSETS, careerYear, round))
}

/**
 * Data real de um jogo da Libertados (0-13): abril, de quinze em quinze dias.
 *
 * A âncora sai do calendário da LIGA, não de uma data própria. O jogo
 * continental é sempre o meio de semana que antecede uma rodada — é isso que
 * faz as duas competições dividirem a semana. Ancorar as duas de forma
 * independente (primeiro sábado de março de um lado, primeira quarta de abril
 * do outro) alinhava por sorte: a distância entre as âncoras muda de ano para
 * ano e, fora do ano de estreia, nenhum jogo caía perto de uma rodada.
 */
export const libertadosDate = (careerYear: number, matchIndex: number): CalendarDate => {
  return addDays(
    seasonWeekStart(careerYear, libertadosWeek(careerYear, matchIndex)),
    pickOffset(CUP_OFFSETS, careerYear, matchIndex),
  )
}

/** Primeira semana da temporada que já caiu em abril — onde a edição abre. */
const firstWeekInMonth = (careerYear: number, month: number): number => {
  let week = 0
  while (seasonWeekStart(careerYear, week).month < month && week < 60) week++
  return week
}

/**
 * Semana da temporada de cada jogo da Libertados: de duas em duas, a partir de
 * abril. As semanas ÍMPARES em relação a essa âncora ficam livres — é nelas
 * que a Copa do Brasil joga, para um clube nas duas nunca ter dois jogos de
 * meio de semana seguidos.
 */
export const libertadosWeek = (careerYear: number, matchIndex: number): number => {
  const first = firstWeekInMonth(careerYear, LIBERTADOS_MONTH)
  // a liga quinzenal joga nas semanas PARES: a edição se alinha a elas para o
  // jogo continental ser sempre o meio da semana que antecede uma rodada
  const aligned = first % 2 === 0 ? first : first + 1
  return aligned + matchIndex * 2
}

/**
 * Semana da temporada de cada jogo da Copa do Brasil: as ÍMPARES, exatamente
 * as que a Libertados deixa livres. Um clube nas duas competições joga meio de
 * semana toda semana, mas nunca duas vezes na mesma.
 */
export const copaBrasilWeek = (careerYear: number, matchIndex: number): number =>
  libertadosWeek(careerYear, 0) + 1 + matchIndex * 2

/** Data real de um jogo da Copa do Brasil: quarta ou quinta, quinzenal. */
export const copaBrasilDate = (careerYear: number, matchIndex: number): CalendarDate =>
  addDays(
    seasonWeekStart(careerYear, copaBrasilWeek(careerYear, matchIndex)),
    // a semente muda para o dia não copiar o da Libertados da semana vizinha
    pickOffset(CUP_OFFSETS, careerYear, matchIndex + 500),
  )

const firstSundayOf = (year: number, month: number): CalendarDate =>
  firstWeekdayOf(year, month, 0)

/** Mês (0-11) da copa de seleções. */
const TOURNAMENT_MONTH = 11
/**
 * Dias entre um jogo de seleção e o outro. Copa é competição curta e corrida:
 * sete jogos (o máximo, numa Copa do Mundo) fecham dentro de dezembro mesmo
 * quando o primeiro domingo cai no dia 7.
 */
const TOURNAMENT_MATCH_DAYS = 3

/** Data real da ABERTURA do torneio de seleções (primeiro domingo de dezembro). */
export const tournamentDate = (careerYear: number): CalendarDate =>
  firstSundayOf(seasonYearFor(careerYear), TOURNAMENT_MONTH)

/**
 * Dia do jogo `matchIndex` da copa de seleções — o par de `libertadosDate`.
 *
 * Sem isto o torneio inteiro cabia num único dia do calendário: dava para ver
 * QUE existe uma Copa em dezembro, mas não os jogos dela.
 */
export const tournamentMatchDate = (careerYear: number, matchIndex: number): CalendarDate =>
  addDays(tournamentDate(careerYear), matchIndex * TOURNAMENT_MATCH_DAYS)
