import { clubById } from '../data/clubs'
import { continentalClubById } from '../data/continentalClubs'
import { nationById } from '../data/nations'
import { clubDisplayName, type PlayerSave } from '../state/save'
import { ClubCrest } from './ClubCrest'
import './styles/bracket.css'

/**
 * O chaveamento de um mata-mata, fase a fase.
 *
 * Serve as três competições eliminatórias do jogo com uma estrutura só: cada
 * uma monta os confrontos do próprio jeito e entrega a lista pronta. O que a
 * tela precisa saber é sempre o mesmo — quem enfrenta quem, quem já passou e
 * onde VOCÊ está.
 */

export interface BracketTie {
  readonly homeId: string
  readonly awayId: string
  /** Agregado, quando os jogos já aconteceram. */
  readonly homeGoals?: number
  readonly awayGoals?: number
  /** Quem avançou; undefined enquanto o confronto não terminou. */
  readonly winnerId?: string
  /** Levou nos pênaltis — some no agregado, mas decidiu. */
  readonly onPenalties?: boolean
}

export interface BracketStage {
  readonly id: string
  readonly name: string
  readonly ties: readonly BracketTie[]
}

interface BracketProps {
  readonly save: PlayerSave
  readonly stages: readonly BracketStage[]
  /** Fase que está sendo disputada agora — ganha destaque. */
  readonly currentStageId?: string
  /** O clube (ou seleção) do jogador, para marcar o caminho dele. */
  readonly myId: string | null
}

/** Nome de exibição: clube da liga, clube continental ou seleção. */
const nameOf = (save: PlayerSave, id: string): string =>
  nationById(id)?.name ??
  (clubById(id) ? clubDisplayName(save, id) : continentalClubById(id)?.name ?? '—')

const CrestOf = ({ save, id }: { save: PlayerSave; id: string }) => {
  const club = clubById(id) ?? continentalClubById(id)
  if (!club) return null
  return (
    <ClubCrest club={club} customUrl={save.customClubCrests[club.id]} size={18} />
  )
}

export const Bracket = ({ save, stages, currentStageId, myId }: BracketProps) => (
  <div className="bracket">
    {stages.map((stage) => (
      <section
        key={stage.id}
        className={`bracket-stage${stage.id === currentStageId ? ' bracket-stage-now' : ''}`}
      >
        <h3 className="bracket-stage-name">
          {stage.name}
          {stage.id === currentStageId && <span className="bracket-now">em jogo</span>}
        </h3>

        <ul className="bracket-ties">
          {stage.ties.map((tie, index) => {
            const mine = myId !== null && (tie.homeId === myId || tie.awayId === myId)
            const decided = tie.winnerId !== undefined
            return (
              <li
                key={`${stage.id}-${index}`}
                className={`bracket-tie${mine ? ' bracket-tie-mine' : ''}`}
              >
                {([tie.homeId, tie.awayId] as const).map((id, side) => {
                  const goals = side === 0 ? tie.homeGoals : tie.awayGoals
                  const isWinner = decided && tie.winnerId === id
                  const isOut = decided && tie.winnerId !== id
                  return (
                    <div
                      key={id}
                      className={`bracket-side${isWinner ? ' bracket-side-won' : ''}${
                        isOut ? ' bracket-side-out' : ''
                      }${id === myId ? ' bracket-side-you' : ''}`}
                    >
                      <CrestOf save={save} id={id} />
                      <span className="bracket-name">{nameOf(save, id)}</span>
                      {goals !== undefined && <span className="bracket-goals">{goals}</span>}
                    </div>
                  )
                })}
                {tie.onPenalties && <span className="bracket-pens">nos pênaltis</span>}
              </li>
            )
          })}
        </ul>
      </section>
    ))}
  </div>
)
