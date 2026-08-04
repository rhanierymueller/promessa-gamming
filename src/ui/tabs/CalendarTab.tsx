import { useMemo, useState } from 'react'
import { seasonYearFor } from '../../engine/career/calendar'
import { seasonSchedule } from '../../engine/career/schedule'
import type { PlayerSave } from '../../state/save'
import { BracketsPanel } from '../calendar/BracketsPanel'
import { MonthGrid } from '../calendar/MonthGrid'
import '../styles/calendar.css'

/**
 * A aba do calendário: TODOS os compromissos da temporada num lugar só, de
 * todas as competições, mês a mês — cada uma com a cara dela.
 */

interface CalendarTabProps {
  readonly save: PlayerSave
}

export const CalendarTab = ({ save }: CalendarTabProps) => {
  const schedule = useMemo(() => seasonSchedule(save), [save])
  const next = schedule.find((match) => !match.isPlayed) ?? null

  // abre no mês do próximo jogo — é o que o jogador veio ver
  const [month, setMonth] = useState(() => next?.date.month ?? new Date().getUTCMonth())
  const [section, setSection] = useState<'mes' | 'chaves'>('mes')

  return (
    // o `.tab-panel` é o que dá à aba o layout das outras — sem ele o card
    // fica fora da grade da página e a grade do mês estica na vertical
    <div className="tab-panel">
      <div className="subtabs" role="tablist" aria-label="Seções do calendário">
        {([['mes', 'Mês a mês'], ['chaves', 'Chaveamentos']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            className={`subtab${section === id ? ' subtab-active' : ''}`}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'chaves' && <BracketsPanel save={save} />}

      {section === 'mes' && (
      <MonthGrid
        save={save}
        schedule={schedule}
        year={seasonYearFor(save.careerYear, save.startYear)}
        month={month}
        onMonthChange={setMonth}
        next={next}
      />
      )}
    </div>
  )
}
