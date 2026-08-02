import { useEffect, useRef, useState } from 'react'
import { FastForward, Square } from 'lucide-react'
import type { CalendarDate } from '../../engine/career/calendar'
import { advanceDay, daysUntilMatch, matchOn, weekOf } from '../../engine/career/clock'
import type { PlayerSave } from '../../state/save'
import { competitionClass, competitionStyle } from './competitionStyle'
import '../styles/calendar.css'

/**
 * A semana da carreira com o botão de passar os dias.
 *
 * O intervalo entre partidas era invisível: o jogo pulava de rodada em rodada e
 * o tempo não existia. Aqui o jogador vê a semana correr e decide quando parar
 * — o avanço é animado, um dia por vez, e o botão vira "Parar" enquanto roda.
 */

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

const MONTH_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
] as const

/**
 * Ritmo do avanço automático. Passo lento o bastante para o jogador LER a
 * semana enquanto ela corre — e para conseguir apertar "Parar" no dia que
 * quiser. A 220ms os dias piscavam e a faixa virava borrão.
 */
const DAY_STEP_MS = 400

interface WeekStripProps {
  readonly save: PlayerSave
  readonly onSaveChange: (save: PlayerSave) => void
}

const sameDay = (a: CalendarDate, b: CalendarDate): boolean =>
  a.year === b.year && a.month === b.month && a.day === b.day

export const WeekStrip = ({ save, onSaveChange }: WeekStripProps) => {
  const [running, setRunning] = useState(false)
  // o save mais recente fica numa ref: o intervalo é criado uma vez e não pode
  // fechar sobre um estado velho
  const latest = useRef(save)
  latest.current = save

  const days = weekOf(save.currentDate)
  const remaining = daysUntilMatch(save)

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      const current = latest.current
      const advanced = advanceDay(current)
      // chegou no dia do jogo: `advanceDay` trava, então a simulação para aqui
      if (sameDay(advanced.currentDate, current.currentDate)) {
        setRunning(false)
        return
      }
      onSaveChange(advanced)
    }, DAY_STEP_MS)
    return () => clearInterval(timer)
  }, [running, onSaveChange])

  // segurança: se o dia do jogo chegar por qualquer outro caminho, para
  useEffect(() => {
    if (running && remaining === 0) setRunning(false)
  }, [running, remaining])

  return (
    <div className="card card-wide week-strip">
      <div className="week-strip-head">
        <span className="card-label">
          {MONTH_SHORT[save.currentDate.month]} · ano {save.careerYear}
        </span>
        <span className="week-strip-countdown">
          {remaining === null
            ? 'temporada encerrada'
            : remaining === 0
              ? 'dia de jogo'
              : remaining === 1
                ? 'jogo amanhã'
                : `${remaining} dias até o jogo`}
        </span>
      </div>

      <ol className="week-days">
        {days.map((day) => {
          const match = matchOn(save, day)
          const isToday = sameDay(day, save.currentDate)
          return (
            <li
              key={`${day.month}-${day.day}`}
              className={[
                'week-day',
                match ? `week-day-match ${competitionClass(match.competition)}` : '',
                isToday ? 'week-day-today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={isToday ? 'date' : undefined}
            >
              <span className="week-day-name">
                {WEEKDAY_LABELS[new Date(Date.UTC(day.year, day.month, day.day)).getUTCDay()]}
              </span>
              <span className="week-day-num">{day.day}</span>
              {match && (
                <span className="week-day-tag">{competitionStyle(match.competition).name}</span>
              )}
            </li>
          )
        })}
      </ol>

      {remaining !== null && remaining > 0 && (
        <button
          type="button"
          className={`btn week-advance${running ? ' week-advance-running' : ''}`}
          onClick={() => setRunning(!running)}
        >
          {running ? (
            <>
              <Square size={15} aria-hidden="true" /> Parar
            </>
          ) : (
            <>
              <FastForward size={15} aria-hidden="true" /> Avançar dias
            </>
          )}
        </button>
      )}
    </div>
  )
}
