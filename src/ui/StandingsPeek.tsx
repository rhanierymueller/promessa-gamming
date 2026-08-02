import { clubById } from '../data/clubs'
import { computeTable, recentForm } from '../engine/season/season'
import { divisionOf } from '../engine/pyramid/pyramid'
import { clubDisplayName, displayClub, type PlayerSave } from '../state/save'
import { ClubCrest } from './ClubCrest'

/**
 * A tabela em recorte: a sua posição, dois acima e dois abaixo.
 *
 * A classificação inteira mora na aba Liga. Aqui na Home o que interessa é a
 * vizinhança — quem você alcança com uma vitória e quem te ultrapassa com um
 * tropeço. As linhas das pontas desbotam para dizer, sem legenda, que a tabela
 * continua fora do recorte.
 */

/** Quantas linhas mostrar acima e abaixo da sua. */
const NEIGHBORS = 3

const DIVISION_NAMES = ['Série A', 'Série B', 'Série C', 'Série D'] as const

interface StandingsPeekProps {
  readonly save: PlayerSave
}

export const StandingsPeek = ({ save }: StandingsPeekProps) => {
  const table = computeTable(save.season)
  const myIndex = table.findIndex((row) => row.clubId === save.clubId)
  if (myIndex < 0) return null

  /*
   * A janela desliza nas pontas: líder ou lanterna continuam vendo cinco
   * linhas, em vez de três. Sem isso o recorte encolhia justamente para quem
   * está no topo — que é onde a tabela mais importa.
   */
  const size = NEIGHBORS * 2 + 1
  const start = Math.max(0, Math.min(myIndex - NEIGHBORS, table.length - size))
  const window = table.slice(start, start + size)

  const division = divisionOf(save.divisions, save.clubId)

  return (
    // mesma estrutura do bloco de treinos ao lado: rótulo FORA, conteúdo no
    // card. Com o rótulo dentro, o card começava mais alto que a grade de
    // treinos e as duas colunas não fechavam em cima.
    <div className="standings-peek">
      <div className="peek-head">
        <span className="card-label">{DIVISION_NAMES[division] ?? 'Liga'}</span>
        <span className="peek-position">
          {myIndex + 1}º de {table.length}
        </span>
      </div>

      <div className="card peek-table" role="table" aria-label="Sua posição na tabela">
        {window.map((row, index) => {
          const club = clubById(row.clubId)
          if (!club) return null
          const isPlayer = row.clubId === save.clubId
          const position = start + index
          // primeira e última linha do recorte desbotam: a tabela continua
          const isEdge = index === 0 || index === window.length - 1
          return (
            <div
              key={row.clubId}
              className={`peek-row${isPlayer ? ' peek-row-you' : ''}${isEdge ? ' peek-row-fade' : ''}`}
              role="row"
            >
              <span className="peek-pos">{position + 1}</span>
              <ClubCrest
                club={displayClub(save, club)}
                customUrl={save.customClubCrests[club.id]}
                size={16}
              />
              <span className="peek-club">{clubDisplayName(save, club.id)}</span>
              <span className="peek-form" aria-label="Últimas cinco partidas">
                {recentForm(save.season, row.clubId, 5).map((result, formIndex) => (
                  <span key={formIndex} className={`form-dot form-${result}`} />
                ))}
              </span>
              <span className="peek-points">{row.points}</span>
              <span className="peek-played">{row.played}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
