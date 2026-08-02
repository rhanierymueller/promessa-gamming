import { addDays, compareDates, PRESEASON_DAYS, type CalendarDate } from './calendar'
import { seasonSchedule, type ScheduledMatch } from './schedule'
import type { PlayerSave } from '../../state/save'

/**
 * O relógio da carreira: o dia em que o jogador está.
 *
 * Antes o tempo andava de jogo em jogo — a temporada era uma fila de rodadas e
 * o calendário existia só para consulta. Com um dia corrente, o intervalo entre
 * partidas passa a ser tempo de verdade: dá para atravessá-lo de uma vez ou
 * parar no meio, como no modo carreira do FIFA.
 */

/** Onde a carreira começa: uma semana antes do primeiro compromisso do ano. */
export const seasonStartDate = (save: PlayerSave): CalendarDate => {
  const first = seasonSchedule(save)[0]
  if (!first) return { year: 2026, month: 0, day: 1 }
  return addDays(first.date, -PRESEASON_DAYS)
}

/** O compromisso marcado para aquele dia, se houver. */
export const matchOn = (save: PlayerSave, date: CalendarDate): ScheduledMatch | null =>
  seasonSchedule(save).find(
    (match) =>
      !match.isPlayed &&
      match.date.month === date.month &&
      match.date.day === date.day &&
      match.date.year === date.year,
  ) ?? null

/** Hoje tem jogo? */
export const isMatchDay = (save: PlayerSave): boolean => matchOn(save, save.currentDate) !== null

/** O próximo compromisso a partir de hoje (inclusive). */
export const upcomingMatch = (save: PlayerSave): ScheduledMatch | null =>
  seasonSchedule(save).find(
    (match) => !match.isPlayed && compareDates(match.date, save.currentDate) >= 0,
  ) ??
  // um compromisso pendente com data já vencida ainda é o próximo a jogar:
  // sem isso, um save fora de sincronia deixaria de mostrar o jogo
  seasonSchedule(save).find((match) => !match.isPlayed) ??
  null

/** Quantos dias faltam para o próximo jogo (0 = é hoje). */
export const daysUntilMatch = (save: PlayerSave): number | null => {
  const next = upcomingMatch(save)
  if (!next) return null
  const from = Date.UTC(save.currentDate.year, save.currentDate.month, save.currentDate.day)
  const to = Date.UTC(next.date.year, next.date.month, next.date.day)
  return Math.max(0, Math.round((to - from) / 86_400_000))
}

/**
 * Passa um dia. Não atravessa dia de jogo: se amanhã tem partida, o relógio
 * para nela — é o que faz "simular até o jogo" terminar sozinho no lugar certo.
 */
export const advanceDay = (save: PlayerSave): PlayerSave => {
  if (isMatchDay(save)) return save
  return { ...save, currentDate: addDays(save.currentDate, 1) }
}

/** Depois da partida o dia vira, senão a carreira ficaria presa no mesmo dia. */
export const advancePastMatch = (save: PlayerSave): PlayerSave => ({
  ...save,
  currentDate: addDays(save.currentDate, 1),
})

/** Os sete dias da semana de `date`, de domingo a sábado. */
export const weekOf = (date: CalendarDate): readonly CalendarDate[] => {
  const weekday = new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()
  const sunday = addDays(date, -weekday)
  return Array.from({ length: 7 }, (_, index) => addDays(sunday, index))
}
