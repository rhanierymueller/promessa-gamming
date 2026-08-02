import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clubById } from '../../data/clubs'
import { nationById } from '../../data/nations'
import { continentalClubById } from '../../data/continentalClubs'
import type { ScheduledMatch } from '../../engine/career/schedule'
import { clubDisplayName, displayClub, type PlayerSave } from '../../state/save'
import { ClubCrest } from '../ClubCrest'
import { competitionClass, competitionStyle } from './competitionStyle'

/** Grade mensal estilo FIFA: cada dia é uma célula; jogo aparece no dia dele. */

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

interface MonthGridProps {
  readonly save: PlayerSave
  readonly schedule: readonly ScheduledMatch[]
  readonly year: number
  readonly month: number
  readonly onMonthChange: (month: number) => void
  /** Compromisso destacado, se cair no mês exibido. */
  readonly next: ScheduledMatch | null
}

/** Nome curto do adversário, seja clube da liga, continental ou seleção. */
const opponentLabel = (save: PlayerSave, opponentId: string): string =>
  nationById(opponentId)?.name ??
  (clubById(opponentId) || continentalClubById(opponentId)
    ? clubDisplayName(save, opponentId)
    : opponentId)

const DayCell = ({
  save,
  day,
  match,
  isNext,
}: {
  save: PlayerSave
  day: number
  match: ScheduledMatch
  isNext: boolean
}) => {
  const style = competitionStyle(match.competition)
  const Icon = style.icon
  const club = match.opponentId
    ? clubById(match.opponentId) ?? continentalClubById(match.opponentId)
    : null
  const outcome = match.result
    ? match.result.teamGoals > match.result.opponentGoals
      ? 'win'
      : match.result.teamGoals === match.result.opponentGoals
        ? 'draw'
        : 'loss'
    : null

  return (
    <div
      className={[
        'cal-day cal-day-match',
        competitionClass(match.competition),
        isNext ? 'cal-day-next' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="gridcell"
      title={`${style.name} · ${match.stageLabel}`}
    >
      <span className="cal-day-num">{day}</span>
      {club ? (
        <ClubCrest
          club={displayClub(save, club)}
          customUrl={save.customClubCrests[club.id]}
          size={18}
        />
      ) : (
        <Icon size={16} aria-hidden="true" className="cal-day-cup-icon" />
      )}
      <span className="cal-day-opponent">
        {match.opponentId ? opponentLabel(save, match.opponentId) : style.name}
      </span>
      {match.result ? (
        <span className={`cal-day-score fixture-${outcome}`}>
          {match.result.teamGoals}×{match.result.opponentGoals}
        </span>
      ) : (
        <span className="cal-day-venue">{match.isHome ? 'casa' : 'fora'}</span>
      )}
    </div>
  )
}

export const MonthGrid = ({
  save,
  schedule,
  year,
  month,
  onMonthChange,
  next,
}: MonthGridProps) => {
  const byDay = new Map<number, ScheduledMatch>()
  for (const match of schedule) {
    if (match.date.month === month) byDay.set(match.date.day, match)
  }

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()

  return (
    <div className="card card-wide season-calendar">
      <div className="cal-header">
        <span className="card-label">Mês a mês</span>
        <div className="cal-nav">
          <button
            type="button"
            className="cal-nav-btn"
            aria-label="Mês anterior"
            disabled={month === 0}
            onClick={() => onMonthChange(month - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span className="cal-month">{MONTH_NAMES[month]} {year}</span>
          <button
            type="button"
            className="cal-nav-btn"
            aria-label="Próximo mês"
            disabled={month === 11}
            onClick={() => onMonthChange(month + 1)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="cal-grid" role="grid" aria-label={`${MONTH_NAMES[month]} de ${year}`}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="cal-weekday">{label}</span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`pad-${i}`} className="cal-day cal-day-empty" aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const match = byDay.get(day)
          if (!match) {
            return (
              <div key={day} className="cal-day" role="gridcell">
                <span className="cal-day-num">{day}</span>
              </div>
            )
          }
          const isNext =
            next !== null && next.date.month === month && next.date.day === day
          return <DayCell key={day} save={save} day={day} match={match} isNext={isNext} />
        })}
      </div>

      <CompetitionLegend schedule={schedule} />
    </div>
  )
}

/**
 * Legenda das cores — só das competições que o ano realmente tem. Sem ela, a
 * faixa dourada de uma quarta-feira é um enfeite: o jogador vê que aquele dia é
 * diferente, mas não de qual competição.
 */
const CompetitionLegend = ({ schedule }: { schedule: readonly ScheduledMatch[] }) => {
  const present = [...new Set(schedule.map((match) => match.competition))]
  if (present.length < 2) return null
  return (
    <ul className="cal-legend">
      {present.map((competition) => {
        const style = competitionStyle(competition)
        const Icon = style.icon
        return (
          <li key={competition} className={`cal-legend-item ${competitionClass(competition)}`}>
            <Icon size={12} aria-hidden="true" />
            {style.name}
          </li>
        )
      })}
    </ul>
  )
}
