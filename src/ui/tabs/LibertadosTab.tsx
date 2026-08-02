import { useMemo, useState } from 'react'
import { clubById } from '../../data/clubs'
import { nationById } from '../../data/nations'
import { nationOf } from '../../engine/libertados/draw'
import { groupStandingsFor, knockoutPairs, tieWinner } from '../../engine/libertados/fixtures'
import { libertadosScorers } from '../../engine/libertados/scorers'
import {
  groupLetter,
  KNOCKOUT_ORDER,
  LIBERTADOS_NAME,
  STAGE_NAMES,
  type LibertadosKnockoutStage,
  type LibertadosState,
} from '../../engine/libertados/types'
import { clubDisplayName, displayClub, type PlayerSave } from '../../state/save'
import { ClubCrest } from '../ClubCrest'
import { NationFlag } from '../NationFlag'
import '../styles/libertados.css'

/**
 * A aba da Copa Libertados. Só existe enquanto a edição está aberta — é onde
 * se acompanha o grupo, os outros sete, a chave inteira com o agregado dos
 * confrontos e a artilharia. Estrutura espelha a de NationalTab: cabeçalho
 * horizontal, alternador de visão e as mesmas classes de artilharia.
 */

interface LibertadosTabProps {
  readonly save: PlayerSave
}

type View = 'chave' | 'artilharia'

/** Placar somado do confronto: "3 × 2", "1 × 1 (ida)" ou "2 × 2 nos pênaltis". */
const aggregateLabel = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
  pair: readonly [string, string],
): string => {
  const matches = state.results.filter(
    (result) =>
      result.stage === stage && pair.includes(result.homeId) && pair.includes(result.awayId),
  )
  if (matches.length === 0) return 'a jogar'
  const goalsOf = (clubId: string): number =>
    matches.reduce(
      (sum, match) => sum + (match.homeId === clubId ? match.homeGoals : match.awayGoals),
      0,
    )
  const score = `${goalsOf(pair[0])} × ${goalsOf(pair[1])}`
  if (matches.length === 1) return `${score} (ida)`
  /*
   * Agregado empatado só tem vencedor nos pênaltis. Sem dizer isso, a tela
   * mostraria um empate com um dos lados em negrito e nenhuma explicação de
   * por que ele passou.
   */
  return matches.some((match) => match.penaltyWinnerId) ? `${score} nos pênaltis` : score
}

export const LibertadosTab = ({ save }: LibertadosTabProps) => {
  const [view, setView] = useState<View>('chave')
  const state = save.libertados

  if (!state) {
    return (
      <div className="tab-panel">
        <div className="card">
          <span className="card-label">{LIBERTADOS_NAME}</span>
          <p className="muted">
            Sua vaga sai da Série A: terminar entre os quatro primeiros classifica o clube para a
            edição do ano seguinte.
          </p>
        </div>
      </div>
    )
  }

  const club = clubById(state.playerClubId ?? '')

  const activeKnockout = KNOCKOUT_ORDER.filter((stage) =>
    state.results.some((result) => result.stage === stage),
  )

  /* gols da edição: os seus vêm do histórico, o resto é repartido */
  const artilharia = useMemo(
    () =>
      libertadosScorers({
        state,
        careerYear: save.careerYear,
        playerName: save.playerName,
        userGoals: save.history
          .filter((record) => record.competition === 'libertados')
          .reduce((sum, record) => sum + record.playerGoals, 0),
        gender: save.appearance.gender,
      }),
    [state, save],
  )

  return (
    <div className="tab-panel">
      <div className="card libertados-head">
        {club && (
          <ClubCrest club={displayClub(save, club)} customUrl={save.customClubCrests[club.id]} size={30} />
        )}
        <div>
          <strong>{LIBERTADOS_NAME}</strong>
          <p className="muted">
            {club ? clubDisplayName(save, club.id) : `Temporada ${state.year}`} · {STAGE_NAMES[state.stage]}
          </p>
        </div>
      </div>

      <div className="live-group libertados-switch" role="group" aria-label="Seção da Libertados">
        {(['chave', 'artilharia'] as const).map((option) => (
          <button
            key={option}
            className={`live-btn${view === option ? ' live-btn-active' : ''}`}
            onClick={() => setView(option)}
          >
            {option === 'chave' ? 'Grupos e chave' : 'Artilharia'}
          </button>
        ))}
      </div>

      {view === 'chave' && (
        <>
          <div className="libertados-groups">
            {state.groups.map((group, groupIndex) => (
              <div className="card card-wide" key={groupLetter(groupIndex)}>
                <span className="card-label">
                  Grupo {groupLetter(groupIndex)}
                  {groupIndex === 0 && state.playerClubId ? ' · o seu' : ''}
                </span>
                <div
                  className="league-table"
                  role="table"
                  aria-label={`Grupo ${groupLetter(groupIndex)}`}
                >
                  <div className="table-row table-head" role="row">
                    <span className="table-pos">#</span>
                    <span className="table-club">Clube</span>
                    <span className="table-num">P</span>
                    <span className="table-num">J</span>
                    <span className="table-num">GP</span>
                    <span className="table-num">GC</span>
                    <span className="table-num">SG</span>
                  </div>
                  {groupStandingsFor(state, group).map((row, position) => {
                    const rowClub = clubById(row.clubId)
                    const nation = nationById(nationOf(row.clubId))
                    if (!rowClub) return null
                    return (
                      <div
                        key={row.clubId}
                        className={`table-row${row.clubId === state.playerClubId ? ' table-player' : ''}${position < 2 ? ' table-through' : ''}`}
                        role="row"
                      >
                        <span className="table-pos">{position + 1}</span>
                        <span className="table-club">
                          <ClubCrest
                            club={displayClub(save, rowClub)}
                            customUrl={save.customClubCrests[rowClub.id]}
                            size={16}
                          />
                          <span className="table-club-name">{clubDisplayName(save, rowClub.id)}</span>
                          {nation && <NationFlag nationId={nation.id} size={12} title={nation.name} />}
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
                <p className="muted table-note">Os 2 primeiros avançam · ida e volta.</p>
              </div>
            ))}
          </div>

          {activeKnockout.map((stage) => (
            <div className="card card-wide" key={stage}>
              <span className="card-label">{STAGE_NAMES[stage]}</span>
              {knockoutPairs(state, stage).map((pair) => {
                const head = clubById(pair[0])
                const challenger = clubById(pair[1])
                if (!head || !challenger) return null
                const winner = tieWinner(state, stage, pair)
                return (
                  <div className="libertados-tie" key={`${stage}-${pair[0]}`}>
                    <span className={`libertados-tie-side${winner === pair[0] ? ' libertados-tie-won' : ''}`}>
                      <ClubCrest club={displayClub(save, head)} customUrl={save.customClubCrests[head.id]} size={16} />
                      {head.abbr}
                    </span>
                    <span className="libertados-tie-score">{aggregateLabel(state, stage, pair)}</span>
                    <span className={`libertados-tie-side${winner === pair[1] ? ' libertados-tie-won' : ''}`}>
                      {challenger.abbr}
                      <ClubCrest club={displayClub(save, challenger)} customUrl={save.customClubCrests[challenger.id]} size={16} />
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}

      {view === 'artilharia' && (
        <div className="card card-wide">
          <span className="card-label">Artilharia da {LIBERTADOS_NAME}</span>
          {artilharia.length > 0 ? (
            <div className="scorer-list">
              {artilharia.map((row, index) => {
                const rowClub = clubById(row.clubId)
                if (!rowClub) return null
                return (
                  <div
                    className={`scorer-row${row.isUser ? ' scorer-row-user' : ''}`}
                    key={row.playerId + row.clubId}
                  >
                    <span className="scorer-pos">{index + 1}</span>
                    <ClubCrest club={displayClub(save, rowClub)} customUrl={save.customClubCrests[rowClub.id]} size={16} />
                    <span className="scorer-name">
                      {row.name}{row.isUser ? ' — você' : ''}
                      <span className="scorer-club">{clubDisplayName(save, rowClub.id)}</span>
                    </span>
                    <strong className="scorer-goals">{row.goals}</strong>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="muted">Ainda não saiu gol nesta edição.</p>
          )}
        </div>
      )}
    </div>
  )
}
