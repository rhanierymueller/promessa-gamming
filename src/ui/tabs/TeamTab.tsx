import type { Club } from '../../data/clubs'
import { tablePosition } from '../../engine/season/season'
import type { PlayerSave } from '../../state/save'
import { Stars } from '../Stars'

interface TeamTabProps {
  readonly save: PlayerSave
  readonly club: Club
}

const averageRating = (save: PlayerSave): string => {
  if (save.history.length === 0) return '—'
  const total = save.history.reduce((sum, record) => sum + record.rating, 0)
  return (total / save.history.length).toFixed(1)
}

export const TeamTab = ({ save, club }: TeamTabProps) => {
  const wins = save.history.filter((r) => r.teamGoals > r.opponentGoals).length
  const goals = save.history.reduce((sum, r) => sum + r.playerGoals, 0)

  return (
    <div className="tab-panel">
      <div className="card team-card">
        <div className="team-banner" style={{ background: `linear-gradient(120deg, ${club.colors.primary}, ${club.colors.secondary})` }} />
        <h2 className="team-name">{club.name}</h2>
        <p className="muted">“{club.nickname}” · {club.city}</p>
        <p className="team-strength"><Stars strength={club.strength} /></p>
        {save.season.currentRound > 0 && (
          <p className="muted">{tablePosition(save.season, save.clubId)}º na liga</p>
        )}
      </div>

      <div className="card">
        <span className="card-label">Sua campanha pelo clube</span>
        <div className="stat-grid">
          <div className="stat"><span className="stat-value">{save.history.length}</span><span className="stat-label">jogos</span></div>
          <div className="stat"><span className="stat-value">{wins}</span><span className="stat-label">vitórias</span></div>
          <div className="stat"><span className="stat-value">{goals}</span><span className="stat-label">gols seus</span></div>
          <div className="stat"><span className="stat-value">{averageRating(save)}</span><span className="stat-label">nota média</span></div>
        </div>
      </div>

      <p className="muted menu-note">Elenco, moral do técnico e competições chegam na Fase 2 (temporada).</p>
    </div>
  )
}
