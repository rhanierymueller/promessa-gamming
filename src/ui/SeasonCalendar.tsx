import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { useState } from 'react'
import { clubById } from '../data/clubs'
import { nationById } from '../data/nations'
import {
  leagueWeekdayFor,
  cupWeekdayFor,
  libertadosDate,
  roundDate,
  seasonYearFor,
  tournamentDate,
} from '../engine/career/calendar'
import { libertadosMatchIndex, MATCHES_PER_EDITION, LIBERTADOS_NAME } from '../engine/libertados/types'
import { fixturesForRound } from '../engine/season/season'
import { SEASON_ROUNDS } from '../engine/season/types'
import { TOURNAMENT_NAMES, tournamentKindForYear } from '../engine/tournament/tournament'
import { clubDisplayName, displayClub, isInLibertados, type PlayerSave } from '../state/save'
import { ClubCrest } from './ClubCrest'
import './styles/libertados.css'

/** Calendário mensal estilo FIFA: cada dia é uma célula; jogo aparece no dia dele. */

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

interface DayMatch {
  readonly opponentId: string
  readonly isHome: boolean
  readonly result: { readonly teamGoals: number; readonly opponentGoals: number } | null
  readonly isNext: boolean
}

interface SeasonCalendarProps {
  readonly save: PlayerSave
}

/** Jogos da temporada indexados por "mês-dia". */
const buildSchedule = (save: PlayerSave): ReadonlyMap<string, DayMatch> => {
  const schedule = new Map<string, DayMatch>()
  const leagueGames = save.history.filter((r) => r.competition === 'liga')
  for (let round = 0; round < SEASON_ROUNDS; round++) {
    const fixture = fixturesForRound(save.season, round).find(
      (f) => f.homeId === save.clubId || f.awayId === save.clubId,
    )
    if (!fixture) continue
    const played = round < save.season.currentRound
    const record = played
      ? leagueGames[leagueGames.length - save.season.currentRound + round] ?? null
      : null
    const date = roundDate(save.careerYear, round, isInLibertados(save))
    schedule.set(`${date.month}-${date.day}`, {
      opponentId: fixture.homeId === save.clubId ? fixture.awayId : fixture.homeId,
      isHome: fixture.homeId === save.clubId,
      result: record,
      isNext: round === save.season.currentRound,
    })
  }
  return schedule
}

const WEEKDAY_NAMES = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados']

export const SeasonCalendar = ({ save }: SeasonCalendarProps) => {
  const year = seasonYearFor(save.careerYear)
  const inLibertados = isInLibertados(save)
  const matchDayLabel = WEEKDAY_NAMES[leagueWeekdayFor(save.careerYear)]
  const cupDayLabel = WEEKDAY_NAMES[cupWeekdayFor(save.careerYear)]
  const schedule = buildSchedule(save)

  /** Datas da Libertados indexadas por "mês-dia", com o adversário quando houver. */
  const cupSchedule = new Map<string, string | null>()
  if (save.libertados) {
    const state = save.libertados
    for (let index = 0; index < MATCHES_PER_EDITION; index++) {
      const date = libertadosDate(save.careerYear, index)
      const played = state.results.find(
        (result) =>
          libertadosMatchIndex(result.stage, result.round) === index &&
          (result.homeId === save.clubId || result.awayId === save.clubId),
      )
      const opponentId = played
        ? played.homeId === save.clubId ? played.awayId : played.homeId
        : null
      cupSchedule.set(`${date.month}-${date.day}`, opponentId)
    }
  }

  const nextRound = Math.min(save.season.currentRound, SEASON_ROUNDS - 1)
  const initialMonth = save.season.currentRound >= SEASON_ROUNDS
    ? 11
    : roundDate(save.careerYear, nextRound).month
  const [month, setMonth] = useState(initialMonth)

  const cup = tournamentDate(save.careerYear)
  // ano sem competição de seleção: o calendário não marca nada em dezembro
  const cupKind = tournamentKindForYear(
    save.careerYear,
    nationById(save.nationalityId)?.confederation ?? 'america',
  )
  const cupName = cupKind ? TOURNAMENT_NAMES[cupKind] : null

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()

  return (
    <div className="card card-wide season-calendar">
      <div className="cal-header">
        <span className="card-label">Calendário · ano {save.careerYear}</span>
        <div className="cal-nav">
          <button
            type="button"
            className="cal-nav-btn"
            aria-label="Mês anterior"
            disabled={month === 0}
            onClick={() => setMonth(month - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span className="cal-month">{MONTH_NAMES[month]} {year}</span>
          <button
            type="button"
            className="cal-nav-btn"
            aria-label="Próximo mês"
            disabled={month === 11}
            onClick={() => setMonth(month + 1)}
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
          const match = schedule.get(`${month}-${day}`)
          const isCupDay = cupName !== null && month === cup.month && day === cup.day
          if (match) {
            const opponent = clubById(match.opponentId)
            const outcome = match.result
              ? match.result.teamGoals > match.result.opponentGoals
                ? 'win' : match.result.teamGoals === match.result.opponentGoals ? 'draw' : 'loss'
              : null
            return (
              <div
                key={day}
                className={`cal-day cal-day-match${match.isNext ? ' cal-day-next' : ''}`}
                role="gridcell"
              >
                <span className="cal-day-num">{day}</span>
                {opponent && (
                  <>
                    <ClubCrest
                      club={displayClub(save, opponent)}
                      customUrl={save.customClubCrests[opponent.id]}
                      size={18}
                    />
                    <span className="cal-day-opponent">{clubDisplayName(save, opponent.id)}</span>
                  </>
                )}
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
          const libertadosOpponentId = cupSchedule.get(`${month}-${day}`)
          if (libertadosOpponentId !== undefined) {
            const rival = libertadosOpponentId ? clubById(libertadosOpponentId) : null
            return (
              <div key={day} className="cal-day cal-day-match cal-day-libertados" role="gridcell">
                <span className="cal-day-num">{day}</span>
                {rival ? (
                  <>
                    <ClubCrest
                      club={displayClub(save, rival)}
                      customUrl={save.customClubCrests[rival.id]}
                      size={18}
                    />
                    <span className="cal-day-opponent">{clubDisplayName(save, rival.id)}</span>
                  </>
                ) : (
                  <>
                    <Trophy size={16} aria-hidden="true" className="cal-day-cup-icon" />
                    <span className="cal-day-opponent">{LIBERTADOS_NAME}</span>
                  </>
                )}
                <span className="cal-day-venue">continental</span>
              </div>
            )
          }
          if (isCupDay) {
            return (
              <div key={day} className="cal-day cal-day-match cal-day-cup" role="gridcell">
                <span className="cal-day-num">{day}</span>
                <Trophy size={16} aria-hidden="true" className="cal-day-cup-icon" />
                <span className="cal-day-opponent">{cupName}</span>
                <span className="cal-day-venue">seleções</span>
              </div>
            )
          }
          return (
            <div key={day} className="cal-day" role="gridcell">
              <span className="cal-day-num">{day}</span>
            </div>
          )
        })}
      </div>
      <p className="muted table-note">
        Rodadas {inLibertados ? 'quinzenais' : 'semanais'} às {matchDayLabel}
        {inLibertados ? ` · ${LIBERTADOS_NAME} às ${cupDayLabel}, de quinze em quinze dias.` : ''}
        {cupName ? ` · ${cupName} em dezembro.` : ''}
      </p>
    </div>
  )
}
