import { useMemo, useState } from 'react'
import { clubById } from '../../data/clubs'
import { nationById } from '../../data/nations'
import { computeTable, recentForm } from '../../engine/season/season'
import { seasonScorers } from '../../engine/season/scorers'
import { SEASON_ROUNDS } from '../../engine/season/types'
import { DIVISION_NAMES, divisionOf, PROMOTED_COUNT, RELEGATED_COUNT, DIVISION_TEAMS } from '../../engine/pyramid/pyramid'
import { clubDisplayName, displayClub, type PlayerSave } from '../../state/save'
import { FriendsLeagues } from '../FriendsLeagues'
import { SeasonCalendar } from '../SeasonCalendar'
import { ClubCrest } from '../ClubCrest'
import { faceUrlFor } from '../../game/faces'
import { usePlayerPortrait } from '../usePlayerPortrait'
import { NationFlag } from '../NationFlag'

interface MatchesTabProps {
  readonly save: PlayerSave
}


const opponentName = (save: PlayerSave, opponentId: string): string => {
  if (opponentId.startsWith('nation-')) {
    return nationById(opponentId.replace('nation-', ''))?.name ?? '???'
  }
  return clubDisplayName(save, opponentId)
}

type LeagueSection = 'tabela' | 'calendario' | 'historico' | 'amigos'

export const MatchesTab = ({ save }: MatchesTabProps) => {
  const { season } = save
  const table = computeTable(season)
  const division = divisionOf(save.divisions, save.clubId)
  const divisionName = DIVISION_NAMES[division] ?? 'Liga'
  const played = [...save.history].reverse()
  const userPortrait = usePlayerPortrait(save.appearance)
  // seus gols de liga da temporada — a base do seu lugar na artilharia
  const scorers = useMemo(
    () =>
      seasonScorers({
        season,
        careerYear: save.careerYear,
        userClubId: save.clubId,
        userName: save.playerName,
        userGoals: save.rival?.mySeasonGoals ?? 0,
        customNames: save.customPlayerNames,
      }),
    [season, save.careerYear, save.clubId, save.playerName, save.rival, save.customPlayerNames],
  )

  // retrospecto das últimas partidas — dá contexto à lista
  const retrospecto = useMemo(() => {
    const v = played.filter((r) => r.teamGoals > r.opponentGoals).length
    const e = played.filter((r) => r.teamGoals === r.opponentGoals).length
    const gols = played.reduce((sum, r) => sum + r.playerGoals, 0)
    const nota = played.length > 0
      ? (played.reduce((sum, r) => sum + r.rating, 0) / played.length).toFixed(1)
      : '—'
    return { v, e, d: played.length - v - e, gols, nota }
  }, [played])

  const [section, setSection] = useState<LeagueSection>('tabela')

  const sections: readonly { id: LeagueSection; label: string }[] = [
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

      {section === 'tabela' && (
        <div className={`league-layout${scorers.length === 0 ? ' league-layout-solo' : ''}`}>
        <div className="card league-standings">
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
        {scorers.length > 0 && (
            <div className="card league-scorers">
              <span className="card-label">Artilharia da {divisionName}</span>
              <ol className="scorer-list">
                {scorers.map((scorer, index) => (
                  <li
                    key={scorer.playerId}
                    className={`scorer-row${scorer.isUser ? ' scorer-row-user' : ''}`}
                  >
                    <span className="scorer-pos">{index + 1}</span>
                    <span className="scorer-face">
                      {scorer.isUser && userPortrait ? (
                        <img className="scorer-face-img scorer-face-pixel" src={userPortrait} alt="" aria-hidden="true" />
                      ) : faceUrlFor(scorer.playerId) ? (
                        <img className="scorer-face-img" src={faceUrlFor(scorer.playerId)!} alt="" aria-hidden="true" loading="lazy" />
                      ) : (
                        <ClubCrest club={displayClub(save, clubById(scorer.clubId)!)} size={26} />
                      )}
                    </span>
                    <span className="scorer-id">
                      <span className="scorer-name">{scorer.name}{scorer.isUser ? ' — você' : ''}</span>
                      <span className="scorer-club">{clubDisplayName(save, scorer.clubId)}</span>
                    </span>
                    <span className="scorer-goals">{scorer.goals}</span>
                  </li>
                ))}
              </ol>
              <p className="muted table-note">Gols marcados nas rodadas já disputadas.</p>
            </div>
        )}
        </div>
      )}

      {section === 'calendario' && <SeasonCalendar save={save} />}

      {section === 'amigos' && <FriendsLeagues save={save} />}

      {section === 'historico' && (
      <div className="league-layout league-layout-solo">
        <div className="card">
          <span className="card-label">Retrospecto · últimas {played.length} partidas</span>
          {played.length === 0 ? (
            <p className="muted">Nenhuma partida ainda — bora estrear!</p>
          ) : (
            <dl className="profile-career history-summary">
              <div className="stat"><dt className="stat-label">Vitórias</dt><dd className="stat-value">{retrospecto.v}</dd></div>
              <div className="stat"><dt className="stat-label">Empates</dt><dd className="stat-value">{retrospecto.e}</dd></div>
              <div className="stat"><dt className="stat-label">Derrotas</dt><dd className="stat-value">{retrospecto.d}</dd></div>
              <div className="stat"><dt className="stat-label">Seus gols</dt><dd className="stat-value">{retrospecto.gols}</dd></div>
              <div className="stat"><dt className="stat-label">Nota média</dt><dd className="stat-value">{retrospecto.nota}</dd></div>
            </dl>
          )}
        </div>

        {played.length > 0 && (
        <div className="card">
          <span className="card-label">Partidas disputadas</span>
          <ol className="history-list">
            {played.map((record, index) => {
              const won = record.teamGoals > record.opponentGoals
              const drew = record.teamGoals === record.opponentGoals
              const selecao = record.competition === 'selecao' || record.competition === 'amistoso'
              const rival = clubById(record.opponentId)
              const gala = record.rating >= 8.5
              return (
                <li key={`${record.playedAt}-${index}`} className="history-row">
                  <span className={`history-result history-${won ? 'win' : drew ? 'draw' : 'loss'}`}>
                    {won ? 'V' : drew ? 'E' : 'D'}
                  </span>
                  <span className="history-crest">
                    {selecao ? (
                      <NationFlag
                        nationId={record.opponentId.replace('nation-', '')}
                        size={20}
                        title="Seleção adversária"
                      />
                    ) : rival ? (
                      <ClubCrest club={displayClub(save, rival)} customUrl={save.customClubCrests[rival.id]} size={20} />
                    ) : null}
                  </span>
                  <span className="history-id">
                    <span className="history-opponent">{opponentName(save, record.opponentId)}</span>
                    <span className="history-comp">
                      {selecao ? 'Seleção' : divisionName}
                    </span>
                  </span>
                  <span className="history-score">
                    {record.teamGoals} <span className="history-x">×</span> {record.opponentGoals}
                  </span>
                  <span className="history-meta">
                    {record.playerGoals > 0 && (
                      <span className="history-goals">{record.playerGoals} {record.playerGoals === 1 ? 'gol' : 'gols'}</span>
                    )}
                    <span className={`history-rating${gala ? ' history-gala' : ''}`}>
                      {record.rating.toFixed(1)}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="muted table-note">Nota 8.5+ em destaque — atuação de gala.</p>
        </div>
        )}
      </div>
      )}
    </div>
  )
}
