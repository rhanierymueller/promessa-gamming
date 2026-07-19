import { useState } from 'react'
import { clubById } from '../../data/clubs'
import { nationById } from '../../data/nations'
import { isCallUpEligible } from '../../engine/career/callup'
import { computeTable, fixturesForRound, isSeasonOver, recentForm } from '../../engine/season/season'
import { SEASON_ROUNDS } from '../../engine/season/types'
import { groupStandings, TOURNAMENT_NAMES, tournamentKindForYear } from '../../engine/tournament/tournament'
import { DIVISION_NAMES, divisionOf, PROMOTED_COUNT, RELEGATED_COUNT, DIVISION_TEAMS } from '../../engine/pyramid/pyramid'
import { clubDisplayName, displayClub, type PlayerSave } from '../../state/save'
import { FriendsLeagues } from '../FriendsLeagues'
import { ClubCrest } from '../ClubCrest'
import { NationFlag } from '../NationFlag'
import { Stars } from '../Stars'

interface MatchesTabProps {
  readonly save: PlayerSave
}


const decemberStatus = (save: PlayerSave): string => {
  const t = save.tournament
  if (t) {
    if (t.stage === 'champion') return 'campeão'
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

const opponentName = (save: PlayerSave, opponentId: string): string => {
  if (opponentId.startsWith('nation-')) {
    return nationById(opponentId.replace('nation-', ''))?.name ?? '???'
  }
  return clubDisplayName(save, opponentId)
}

type LeagueSection = 'tabela' | 'calendario' | 'historico' | 'amigos' | 'selecao'

export const MatchesTab = ({ save }: MatchesTabProps) => {
  const { season } = save
  const table = computeTable(season)
  const division = divisionOf(save.divisions, save.clubId)
  const divisionName = DIVISION_NAMES[division] ?? 'Liga'
  const played = [...save.history].reverse()

  const tournament = save.tournament
  const hasTournamentGroup = Boolean(tournament && tournament.stage === 'groups')
  const [section, setSection] = useState<LeagueSection>(hasTournamentGroup ? 'selecao' : 'tabela')

  const sections: readonly { id: LeagueSection; label: string }[] = [
    ...(hasTournamentGroup ? [{ id: 'selecao' as const, label: 'Seleção' }] : []),
    { id: 'tabela', label: 'Tabela' },
    { id: 'calendario', label: 'Calendário' },
    { id: 'historico', label: 'Jogos' },
    { id: 'amigos', label: 'Amigos' },
  ]

  return (
    <div className="tab-panel">
      <div className="subtabs" role="tablist" aria-label="Seções da liga">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            className={`subtab${section === item.id ? ' subtab-active' : ''}`}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === 'selecao' && tournament && tournament.stage === 'groups' && (
        <div className="card card-wide">
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
                    <NationFlag nationId={nation.id} size={16} title={`Bandeira de ${nation.name}`} />
                    <span className="table-club-name">{nation.name}</span>
                  </span>
                  <span className="table-form" aria-hidden="true" />
                  <span className="table-num table-points">{row.points}</span>
                  <span className="table-num">{row.played}</span>
                  <span className="table-num">{row.goalsFor}</span>
                  <span className="table-num">{row.goalsAgainst}</span>
                  <span className="table-num">{row.goalsFor - row.goalsAgainst}</span>
                </div>
              )
            })}
          </div>
          <p className="muted table-note">Os 2 primeiros avançam à semifinal.</p>
        </div>
      )}

      {section === 'tabela' && (
      <div className="card card-wide">
        <span className="card-label">
          {divisionName} · rodada {Math.min(season.currentRound, SEASON_ROUNDS)}/{SEASON_ROUNDS}
        </span>
        <div className="league-table" role="table" aria-label="Tabela de classificação">
          <div className="table-row table-head" role="row">
            <span className="table-pos">#</span>
            <span className="table-club">Time</span>
            <span className="table-form table-form-head">Últ. 5</span>
            <span className="table-num">P</span>
            <span className="table-num">J</span>
            <span className="table-num">GP</span>
            <span className="table-num">GC</span>
            <span className="table-num">SG</span>
          </div>
          {table.map((row, index) => {
            const club = clubById(row.clubId)
            if (!club) return null
            const isPlayer = row.clubId === save.clubId
            // zonas: acesso (topo, exceto Série A) e queda (fundo, exceto Série D)
            const inPromotion = division > 0 && index < PROMOTED_COUNT
            const inRelegation = division < 3 && index >= DIVISION_TEAMS - RELEGATED_COUNT
            const zone = inPromotion ? ' table-promo' : inRelegation ? ' table-releg' : ''
            return (
              <div key={row.clubId} className={`table-row${isPlayer ? ' table-player' : ''}${zone}`} role="row">
                <span className="table-pos">{index + 1}</span>
                <span className="table-club">
                  <ClubCrest club={displayClub(save, club)} customUrl={save.customClubCrests[club.id]} size={16} />
                  <span className="table-club-name">{clubDisplayName(save, club.id)}</span>
                </span>
                <span className="table-form" aria-label="Últimas cinco partidas">
                  {recentForm(season, row.clubId, 5).map((result, formIndex) => (
                    <span
                      key={formIndex}
                      className={`form-dot form-${result}`}
                      title={result === 'V' ? 'Vitória' : result === 'E' ? 'Empate' : 'Derrota'}
                    />
                  ))}
                </span>
                <span className="table-num table-points">{row.points}</span>
                <span className="table-num">{row.played}</span>
                <span className="table-num">{row.goalsFor}</span>
                <span className="table-num">{row.goalsAgainst}</span>
                <span className="table-num">{row.goalsFor - row.goalsAgainst}</span>
              </div>
            )
          })}
        </div>
        <p className="muted table-note">
          {division > 0 ? `${PROMOTED_COUNT} primeiros sobem` : 'topo = título nacional'}
          {' · '}
          {division < 3 ? `${RELEGATED_COUNT} últimos caem` : 'sem rebaixamento na Série D'}
        </p>
      </div>
      )}

      {section === 'calendario' && (
      <div className="card card-wide">
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
              <span className="fixture-round">R{round + 1}</span>
              <ClubCrest club={displayClub(save, opponent)} customUrl={save.customClubCrests[opponent.id]} size={15} />
              <span className="fixture-name">
                {clubDisplayName(save, opponent.id)}
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
      )}

      {section === 'amigos' && <FriendsLeagues save={save} />}

      {section === 'historico' && (
      <div className="card card-wide">
        <span className="card-label">Partidas disputadas · últimas 10</span>
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
                {record.teamGoals} × {record.opponentGoals} {opponentName(save, record.opponentId)}
                {record.competition === 'amistoso' && <span className="history-badge">SELEÇÃO</span>}
              </span>
              <span className="history-meta">
                {record.playerGoals > 0 ? `${record.playerGoals} gol(s) · ` : ''}nota {record.rating.toFixed(1)}
              </span>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
