import { copaBrasilBracket } from '../../engine/copaBrasil/bracket'
import { isCopaBrasilRunning, COPA_BRASIL_NAME } from '../../engine/copaBrasil/types'
import { libertadosBracket } from '../../engine/libertados/bracket'
import { isKnockoutStage, LIBERTADOS_NAME } from '../../engine/libertados/types'
import type { PlayerSave } from '../../state/save'
import { Bracket } from '../Bracket'
import { competitionClass } from './competitionStyle'

/**
 * Os chaveamentos das competições de mata-mata em jogo.
 *
 * Mostra só o que está acontecendo: uma competição encerrada sai da lista, e
 * sem nenhuma o painel explica quando elas voltam em vez de ficar em branco.
 */

interface BracketsPanelProps {
  readonly save: PlayerSave
}

export const BracketsPanel = ({ save }: BracketsPanelProps) => {
  const copaBrasil = save.copaBrasil
  const libertados = save.libertados

  const hasCopaBrasil = copaBrasil !== null && copaBrasil.playerClubId !== null
  // a fase de grupos da Libertados não é chave: o mata-mata só começa depois
  const hasLibertados =
    libertados !== null && libertados.playerClubId !== null && isKnockoutStage(libertados.stage)

  if (!hasCopaBrasil && !hasLibertados) {
    return (
      <div className="card card-wide">
        <span className="card-label">Chaveamentos</span>
        <p className="muted">
          Nenhum mata-mata em andamento. A Copa do Brasil abre em março e a
          Libertados entra na chave depois da fase de grupos.
        </p>
      </div>
    )
  }

  return (
    <>
      {hasCopaBrasil && copaBrasil && (
        <div className={`card card-wide bracket-card ${competitionClass('copa-brasil')}`}>
          <div className="bracket-head">
            <span className="card-label">{COPA_BRASIL_NAME}</span>
            <span className="bracket-status">
              {isCopaBrasilRunning(copaBrasil.stage)
                ? 'em disputa'
                : copaBrasil.championId === save.clubId
                  ? 'você foi campeão'
                  : 'encerrada'}
            </span>
          </div>
          <Bracket
            save={save}
            stages={copaBrasilBracket(copaBrasil)}
            currentStageId={isCopaBrasilRunning(copaBrasil.stage) ? copaBrasil.stage : undefined}
            myId={copaBrasil.playerClubId}
          />
        </div>
      )}

      {hasLibertados && libertados && (
        <div className={`card card-wide bracket-card ${competitionClass('libertados')}`}>
          <div className="bracket-head">
            <span className="card-label">{LIBERTADOS_NAME}</span>
            <span className="bracket-status">em disputa</span>
          </div>
          <Bracket
            save={save}
            stages={libertadosBracket(libertados)}
            currentStageId={libertados.stage}
            myId={libertados.playerClubId}
          />
        </div>
      )}
    </>
  )
}
