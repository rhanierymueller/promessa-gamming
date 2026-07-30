import { useMemo, useState } from 'react'
import { clubById } from '../../data/clubs'
import { nationById } from '../../data/nations'
import { marketPoolFor } from '../../engine/market/market'
import { myTeamPlayers } from '../../engine/squad/myTeam'
import { nationalSquadFor } from '../../engine/squad/nationalSquad'
import { userAsSquadPlayer, USER_PLAYER_ID, USER_SQUAD_INDEX } from '../../engine/squad/players'
import type { SquadPlayer } from '../../engine/squad/players'
import {
  groupLetter,
  groupStandings,
  knockoutPairs,
  KNOCKOUT_ORDER,
  STAGE_NAMES,
  TOURNAMENT_NAMES,
  type KnockoutStage,
} from '../../engine/tournament/tournament'
import {
  currentPlayerAge,
  setNationalFormation,
  swapNationalLineup,
  type PlayerSave,
} from '../../state/save'
import { NationFlag } from '../NationFlag'
import { PlayerCardModal } from '../PlayerCard'
import { usePlayerPortrait } from '../usePlayerPortrait'
import { tournamentScorers } from '../../engine/tournament/tournamentScorers'
import { SquadBoard } from '../SquadBoard'
import '../styles/national.css'

/**
 * A aba da competição de seleções. Só existe enquanto você está convocado —
 * é onde se acompanha a chave inteira, ver quem foi chamado e mexer no time.
 */

interface NationalTabProps {
  readonly save: PlayerSave
  readonly onSaveChange: (save: PlayerSave) => void
}

type View = 'chave' | 'elenco'

export const NationalTab = ({ save, onSaveChange }: NationalTabProps) => {
  const userPortrait = usePlayerPortrait(save.appearance)
  const [view, setView] = useState<View>('chave')
  const [selected, setSelected] = useState<SquadPlayer | null>(null)

  const tournament = save.tournament
  const nation = nationById(save.nationalityId)

  const squad = useMemo(() => {
    if (!nation) return []
    const club = clubById(save.clubId)
    if (!club) return []
    return nationalSquadFor(
      save.nationalityId,
      save.divisions,
      save.careerYear,
      marketPoolFor(save.season.seed, save.careerYear, save.appearance.gender),
      userAsSquadPlayer(
        myTeamPlayers(save, club)[USER_SQUAD_INDEX],
        save.playerName,
        save.attributes,
        save.playerPosition,
        currentPlayerAge(save),
      ),
      save.appearance.gender,
    )
  }, [save, nation])

  if (!tournament || !nation) {
    return (
      <div className="tab-panel">
        <div className="card">
          <span className="card-label">Seleção</span>
          <p className="muted">
            Você não está convocado no momento. A Copa do Mundo vem de quatro em quatro anos
            e a competição continental, de dois em dois.
          </p>
        </div>
      </div>
    )
  }

  /* gols do torneio: os seus vêm do histórico, o resto é repartido */
  const artilharia = useMemo(
    () =>
      tournamentScorers({
        tournament,
        careerYear: save.careerYear,
        playerName: save.playerName,
        userGoals: save.history
          .filter((record) => record.competition === 'selecao')
          .reduce((sum, record) => sum + record.playerGoals, 0),
        gender: save.appearance.gender,
      }),
    [tournament, save],
  )

  const activeKnockout = KNOCKOUT_ORDER.filter((stage) =>
    tournament.results.some((result) => result.stage === stage),
  )

  return (
    <div className="tab-panel">
      <div className="card national-head">
        <NationFlag nationId={nation.id} size={30} title={`Bandeira de ${nation.name}`} />
        <div>
          <strong>{TOURNAMENT_NAMES[tournament.kind]}</strong>
          <p className="muted">
            {nation.name} · {STAGE_NAMES[tournament.stage]}
          </p>
        </div>
      </div>

      <div className="live-group national-switch" role="group" aria-label="Seção da seleção">
        {(['chave', 'elenco'] as const).map((option) => (
          <button
            key={option}
            className={`live-btn${view === option ? ' live-btn-active' : ''}`}
            onClick={() => setView(option)}
          >
            {option === 'chave' ? 'Grupos e chave' : 'Convocados'}
          </button>
        ))}
      </div>

      {view === 'chave' && (
        <>
          <div className="national-groups">
            {tournament.groups.map((group, groupIndex) => (
              <div className="card card-wide" key={groupLetter(groupIndex)}>
                <span className="card-label">
                  Grupo {groupLetter(groupIndex)}
                  {groupIndex === 0 ? ' · o seu' : ''}
                </span>
                <div className="league-table" role="table" aria-label={`Grupo ${groupLetter(groupIndex)}`}>
                  <div className="table-row table-head" role="row">
                    <span className="table-pos">#</span>
                    <span className="table-club">Seleção</span>
                    <span className="table-form table-form-head" />
                    <span className="table-num">P</span>
                    <span className="table-num">J</span>
                    <span className="table-num">GP</span>
                    <span className="table-num">GC</span>
                    <span className="table-num">SG</span>
                  </div>
                  {groupStandings(tournament, group).map((row, position) => {
                    const team = nationById(row.clubId)
                    if (!team) return null
                    return (
                      <div
                        key={row.clubId}
                        className={`table-row${row.clubId === nation.id ? ' table-player' : ''}${position < 2 ? ' table-through' : ''}`}
                        role="row"
                      >
                        <span className="table-pos">{position + 1}</span>
                        <span className="table-club">
                          <NationFlag nationId={team.id} size={16} title={team.name} />
                          <span className="table-club-name">{team.name}</span>
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
                <p className="muted table-note">Os 2 primeiros avançam.</p>
              </div>
            ))}
          </div>

          {artilharia.length > 0 && (
            <div className="card card-wide">
              <span className="card-label">Artilharia da {TOURNAMENT_NAMES[tournament.kind]}</span>
              <div className="scorer-list">
                {artilharia.map((row, index) => {
                  const team = nationById(row.clubId)
                  return (
                    <div
                      className={`scorer-row${row.isUser ? ' scorer-row-user' : ''}`}
                      key={row.playerId + row.clubId}
                    >
                      <span className="scorer-pos">{index + 1}</span>
                      {team && <NationFlag nationId={team.id} size={16} title={team.name} />}
                      <span className="scorer-name">
                        {row.name}{row.isUser ? ' — você' : ''}
                        <span className="scorer-club">{team?.name ?? ''}</span>
                      </span>
                      <strong className="scorer-goals">{row.goals}</strong>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeKnockout.map((stage: KnockoutStage) => (
            <div className="card" key={stage}>
              <span className="card-label">{STAGE_NAMES[stage]}</span>
              {knockoutPairs(tournament, stage).map(([homeId, awayId]) => {
                const home = nationById(homeId)
                const away = nationById(awayId)
                const played = tournament.results.find(
                  (result) => result.stage === stage && result.homeId === homeId,
                )
                if (!home || !away) return null
                return (
                  <div className="national-tie" key={`${stage}-${homeId}`}>
                    <span className="national-tie-side">
                      <NationFlag nationId={home.id} size={14} title={home.name} />
                      {home.abbr}
                    </span>
                    <span className="national-tie-score">
                      {played ? `${played.homeGoals} × ${played.awayGoals}` : 'a jogar'}
                    </span>
                    <span className="national-tie-side">
                      {away.abbr}
                      <NationFlag nationId={away.id} size={14} title={away.name} />
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}

      {view === 'elenco' && (
        <div className="card card-wide">
          <span className="card-label">Convocados · {nation.name}</span>
          <SquadBoard
            squad={squad}
            formation={save.nationalFormation}
            lineup={save.nationalLineup}
            userIndex={squad.findIndex((player) => player.id === USER_PLAYER_ID)}
            gender={save.appearance.gender}
            userFaceUrl={userPortrait}
            primaryColor={nation.colors.primary}
            editable
            onFormationChange={(formation) => onSaveChange(setNationalFormation(save, formation))}
            onSwap={(slot, squadIndex) => onSaveChange(swapNationalLineup(save, slot, squadIndex))}
            onSelect={setSelected}
          />
          {selected && (
            <PlayerCardModal
          gender={save.appearance.gender}
              player={selected}
              clubName={nation.name}
              isUser={selected.id === USER_PLAYER_ID}
              /* o seu craque tem retrato: é o mesmo do Perfil */
              userFaceUrl={selected.id === USER_PLAYER_ID ? userPortrait : null}
              renameState={null}
              onRename={() => {}}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}
