import { clubById } from '../../data/clubs'
import { nationById } from '../../data/nations'
import { isCallUpEligible } from '../../engine/career/callup'
import { computeTable, fixturesForRound, isSeasonOver } from '../../engine/season/season'
import { SEASON_ROUNDS } from '../../engine/season/types'
import { groupStandings, TOURNAMENT_NAMES, tournamentKindForYear } from '../../engine/tournament/tournament'
import type { PlayerSave } from '../../state/save'
import { Stars } from '../Stars'

interface MatchesTabProps {
  readonly save: PlayerSave
}

const MONTHS = ['MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV'] as const

const decemberStatus = (save: PlayerSave): string => {
  const t = save.tournament
  if (t) {
    if (t.stage === 'champion') return '🏆 campeão'
    if (t.stage === 'eliminated') return 'eliminado'
    return 'em disputa'
  }
  if (save.tournamentPlayed) return 'encerrado'
  if (!isSeasonOver(save.season)) return 'jogue bem para ser convocado'
  const leagueRatings = save.history
    .filter((r) => r.competition === 'liga')
    .slice(-save.season.currentRound)
    .map((r) => r.rating)
  return isCallUpEligible(leagueRatings) ? 'CONVOCADO!' : 'não convocado'
}

const opponentName = (opponentId: string): string => {
  if (opponentId.startsWith('nation-')) {
    return nationById(opponentId.replace('nation-', ''))?.name ?? '???'
  }
  return clubById(opponentId)?.name ?? '???'
}

export const MatchesTab = ({ save }: MatchesTabProps) => {
  const { season } = save
  const table = computeTable(season)
  const played = [...save.history].reverse()

  const tournament = save.tournament

  return (
    <div className="tab-panel">
      {tournament && tournament.stage === 'groups' && (
        <div className="card">
          <span className="card-label">{TOURNAMENT_NAMES[tournament.kind]} · seu grupo</span>
          <div className="league-table" role="table" aria-label="Grupo do torneio">
            {groupStandings(tournament, tournament.groupA).map((row, index) => {
              const nation = nationById(row.clubId)
              if (!nation) return null
              return (
                <div
                  key={row.clubId}
                  className={`table-row${row.clubId === save.nationalityId ? ' table-player' : ''}`}
                  role="row"
                >
                  <span className="table-pos">{index + 1}</span>
                  <span className="table-club">
                    <span className="club-dot" style={{ background: nation.colors.primary }} aria-hidden="true" />
                    <span className="table-club-name">{nation.name}</span>
                  </span>
                  <span className="table-num table-points">{row.points}</span>
                  <span className="table-num">{row.played}</span>
                  <span className="table-num">{row.goalsFor}</span>
                  <span className="table-num">{row.goalsAgainst}</span>
                </div>
              )
            })}
          </div>
          <p className="muted table-note">Os 2 primeiros avançam à semifinal.</p>
        </div>
      )}

      <div className="card">
        <span className="card-label">
          Classificação · rodada {Math.min(season.currentRound, SEASON_ROUNDS)}/{SEASON_ROUNDS}
        </span>
        <div className="league-table" role="table" aria-label="Tabela de classificação">
          <div className="table-row table-head" role="row">
            <span className="table-pos">#</span>
            <span className="table-club">Time</span>
            <span className="table-num">P</span>
            <span className="table-num">J</span>
            <span className="table-num">GP</span>
            <span className="table-num">GC</span>
          </div>
          {table.map((row, index) => {
            const club = clubById(row.clubId)
            if (!club) return null
            const isPlayer = row.clubId === save.clubId
            return (
              <div key={row.clubId} className={`table-row${isPlayer ? ' table-player' : ''}`} role="row">
                <span className="table-pos">{index + 1}</span>
                <span className="table-club">
                  <span className="club-dot" style={{ background: club.colors.primary }} aria-hidden="true" />
                  <span className="table-club-name">{club.name}</span>
                </span>
                <span className="table-num table-points">{row.points}</span>
                <span className="table-num">{row.played}</span>
                <span className="table-num">{row.goalsFor}</span>
                <span className="table-num">{row.goalsAgainst}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <span className="card-label">Calendário · ano {save.careerYear}</span>
        {Array.from({ length: SEASON_ROUNDS }, (_, round) => {
          const fixture = fixturesForRound(season, round).find(
            (f) => f.homeId === save.clubId || f.awayId === save.clubId,
          )
          if (!fixture) return null
          const opponentId = fixture.homeId === save.clubId ? fixture.awayId : fixture.homeId
          const opponent = clubById(opponentId)
          if (!opponent) return null
          const played = round < season.currentRound
          const leagueGames = save.history.filter((r) => r.competition === 'liga')
          const record = played ? leagueGames[leagueGames.length - season.currentRound + round] : null
          return (
            <div key={round} className={`fixture-row${played ? ' fixture-played' : ''}`}>
              <span className="fixture-round">{MONTHS[round]}</span>
              <span className="club-dot" style={{ background: opponent.colors.primary }} aria-hidden="true" />
              <span className="fixture-name">
                {opponent.name}
                <span className="fixture-venue"> · {fixture.homeId === save.clubId ? 'casa' : 'fora'}</span>
              </span>
              {record ? (
                <span className={`fixture-score fixture-${record.teamGoals > record.opponentGoals ? 'win' : record.teamGoals === record.opponentGoals ? 'draw' : 'loss'}`}>
                  {record.teamGoals}×{record.opponentGoals}
                </span>
              ) : (
                <Stars strength={opponent.strength} />
              )}
            </div>
          )
        })}
        <div className="fixture-row fixture-december">
          <span className="fixture-round">DEZ</span>
          <span className="fixture-name">
            {TOURNAMENT_NAMES[tournamentKindForYear(save.careerYear, nationById(save.nationalityId)?.confederation ?? 'america')]}
            <span className="fixture-venue"> · seleções</span>
          </span>
          <span className="fixture-venue">{decemberStatus(save)}</span>
        </div>
      </div>

      <div className="card">
        <span className="card-label">Partidas disputadas</span>
        {played.length === 0 && <p className="muted">Nenhuma partida ainda — bora estrear!</p>}
        {played.map((record, index) => {
          const won = record.teamGoals > record.opponentGoals
          const drew = record.teamGoals === record.opponentGoals
          return (
            <div key={`${record.playedAt}-${index}`} className="history-row">
              <span className={`history-result history-${won ? 'win' : drew ? 'draw' : 'loss'}`}>
                {won ? 'V' : drew ? 'E' : 'D'}
              </span>
              <span className="fixture-name">
                {record.teamGoals} × {record.opponentGoals} {opponentName(record.opponentId)}
                {record.competition === 'amistoso' && <span className="history-badge">SELEÇÃO</span>}
              </span>
              <span className="history-meta">
                {record.playerGoals > 0 ? `⚽${record.playerGoals} · ` : ''}nota {record.rating.toFixed(1)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
