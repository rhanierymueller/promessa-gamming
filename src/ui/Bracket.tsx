import { clubById } from '../data/clubs'
import { continentalClubById } from '../data/continentalClubs'
import { nationById } from '../data/nations'
import { clubDisplayName, type PlayerSave } from '../state/save'
import { ClubCrest } from './ClubCrest'
import './styles/bracket.css'

/**
 * O chaveamento de um mata-mata, fase a fase.
 *
 * Serve as competições eliminatórias com uma estrutura só: cada uma monta os
 * confrontos do próprio jeito e entrega a lista pronta. O que a tela precisa
 * saber é sempre o mesmo — quem enfrenta quem, quem já passou e onde VOCÊ está.
 *
 * Vaga sem dono é `null` e aparece como "a definir". Preencher com um palpite
 * faria a chave inteira parecer decidida antes de a bola rolar.
 */

export interface BracketTie {
  readonly homeId: string | null
  readonly awayId: string | null
  /** Agregado, quando os dois jogos já aconteceram. */
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

const SideRow = ({
  save,
  id,
  goals,
  isWinner,
  isOut,
  isMine,
}: {
  save: PlayerSave
  id: string | null
  goals?: number
  isWinner: boolean
  isOut: boolean
  isMine: boolean
}) => {
  if (id === null) {
    return (
      <div className="bracket-side bracket-side-tbd">
        <span className="bracket-crest-hole" aria-hidden="true" />
        <span className="bracket-name">a definir</span>
      </div>
    )
  }
  const club = clubById(id) ?? continentalClubById(id)
  return (
    <div
      className={`bracket-side${isWinner ? ' bracket-side-won' : ''}${
        isOut ? ' bracket-side-out' : ''
      }${isMine ? ' bracket-side-you' : ''}`}
    >
      {club ? (
        <ClubCrest club={club} customUrl={save.customClubCrests[club.id]} size={18} />
      ) : (
        <span className="bracket-crest-hole" aria-hidden="true" />
      )}
      <span className="bracket-name">{nameOf(save, id)}</span>
      {goals !== undefined && <span className="bracket-goals">{goals}</span>}
    </div>
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

        {/*
          Cada confronto ocupa uma FATIA de altura igual, e a fase seguinte tem
          metade das fatias — então a fatia dobra de tamanho e o centro dela cai
          exatamente no meio dos dois confrontos que a alimentam. É o que faz as
          linhas ligarem certo, como numa chave impressa.
        */}
        <ul className="bracket-ties">
          {stage.ties.map((tie, index) => {
            const mine =
              myId !== null && (tie.homeId === myId || tie.awayId === myId)
            const decided = tie.winnerId !== undefined
            const open = tie.homeId === null || tie.awayId === null
            return (
              <li className="bracket-slot" key={`${stage.id}-${index}`}>
                <div
                  className={`bracket-tie${mine ? ' bracket-tie-mine' : ''}${
                    open ? ' bracket-tie-open' : ''
                  }`}
                >
                  <SideRow
                    save={save}
                    id={tie.homeId}
                    goals={tie.homeGoals}
                    isWinner={decided && tie.winnerId === tie.homeId}
                    isOut={decided && tie.winnerId !== tie.homeId}
                    isMine={tie.homeId !== null && tie.homeId === myId}
                  />
                  <SideRow
                    save={save}
                    id={tie.awayId}
                    goals={tie.awayGoals}
                    isWinner={decided && tie.winnerId === tie.awayId}
                    isOut={decided && tie.winnerId !== tie.awayId}
                    isMine={tie.awayId !== null && tie.awayId === myId}
                  />
                  {tie.onPenalties && <span className="bracket-pens">nos pênaltis</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    ))}
  </div>
)
