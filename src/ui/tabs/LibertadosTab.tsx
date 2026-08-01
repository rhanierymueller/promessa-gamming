import { clubById } from '../../data/clubs'
import { nationById } from '../../data/nations'
import { nationOf } from '../../engine/libertados/draw'
import { groupStandingsFor, knockoutPairs, tieWinner } from '../../engine/libertados/fixtures'
import {
  groupLetter,
  KNOCKOUT_ORDER,
  LIBERTADOS_NAME,
  STAGE_NAMES,
  type LibertadosKnockoutStage,
} from '../../engine/libertados/types'
import { clubDisplayName, displayClub, type PlayerSave } from '../../state/save'
import { ClubCrest } from '../ClubCrest'
import { NationFlag } from '../NationFlag'
import '../styles/libertados.css'

/**
 * A aba da Copa Libertados. Só existe enquanto a edição está aberta — é onde
 * se acompanha o grupo, os outros sete e a chave inteira com o agregado dos
 * confrontos.
 */

interface LibertadosTabProps {
  readonly save: PlayerSave
}

/** Placar somado do confronto, no formato "3 × 2 (ida e volta)". */
const aggregateLabel = (
  save: PlayerSave,
  stage: LibertadosKnockoutStage,
  pair: readonly [string, string],
): string => {
  const matches = save.libertados!.results.filter(
    (result) =>
      result.stage === stage && pair.includes(result.homeId) && pair.includes(result.awayId),
  )
  if (matches.length === 0) return 'a jogar'
  const goalsOf = (clubId: string): number =>
    matches.reduce(
      (sum, match) => sum + (match.homeId === clubId ? match.homeGoals : match.awayGoals),
      0,
    )
  const suffix = matches.length === 1 ? ' (ida)' : ''
  return `${goalsOf(pair[0])} × ${goalsOf(pair[1])}${suffix}`
}

export const LibertadosTab = ({ save }: LibertadosTabProps) => {
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

  const activeKnockout = KNOCKOUT_ORDER.filter((stage) =>
    state.results.some((result) => result.stage === stage),
  )

  return (
    <div className="tab-panel">
      <div className="card libertados-head">
        <div>
          <strong>{LIBERTADOS_NAME}</strong>
          <p className="muted">
            Temporada {state.year} · {STAGE_NAMES[state.stage]}
          </p>
        </div>
      </div>

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
                const club = clubById(row.clubId)
                const nation = nationById(nationOf(row.clubId))
                if (!club) return null
                return (
                  <div
                    key={row.clubId}
                    className={`table-row${row.clubId === state.playerClubId ? ' table-player' : ''}${position < 2 ? ' table-through' : ''}`}
                    role="row"
                  >
                    <span className="table-pos">{position + 1}</span>
                    <span className="table-club">
                      <ClubCrest
                        club={displayClub(save, club)}
                        customUrl={save.customClubCrests[club.id]}
                        size={16}
                      />
                      <span className="table-club-name">{clubDisplayName(save, club.id)}</span>
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
                <span className="libertados-tie-score">{aggregateLabel(save, stage, pair)}</span>
                <span className={`libertados-tie-side${winner === pair[1] ? ' libertados-tie-won' : ''}`}>
                  {challenger.abbr}
                  <ClubCrest club={displayClub(save, challenger)} customUrl={save.customClubCrests[challenger.id]} size={16} />
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
