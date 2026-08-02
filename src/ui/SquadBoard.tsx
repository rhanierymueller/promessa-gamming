import { ArrowLeftRight, LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'
import { FORMATION_IDS, FORMATIONS, type Formation, type FormationId } from '../engine/squad/formation'
import { overallAt, positionFit, type SquadPlayer } from '../engine/squad/players'
import { sectorRatings } from '../engine/squad/sectors'
import { FormationBoard } from './FormationBoard'
import { ovrClass } from '../engine/squad/overallTier'
import type { PlayerGender } from '../state/save'

/**
 * Prancheta do técnico: o campo com os titulares, o seletor de esquema e a
 * lista de elenco com as trocas.
 *
 * Vive fora das abas porque o clube e a SELEÇÃO usam exatamente a mesma
 * ferramenta — antes a seleção tinha uma lista própria, mais pobre, e que
 * ainda cortava os nomes por não bater com as colunas desta.
 */

interface SquadBoardProps {
  readonly squad: readonly SquadPlayer[]
  readonly formation: FormationId
  /** Índices do elenco em cada um dos 11 slots da formação. */
  readonly lineup: readonly number[]
  /** Índice do craque do jogador no elenco; -1 quando ele não está nele. */
  readonly userIndex: number
  /** Gênero do elenco: escolhe o banco de retratos dos atletas. */
  readonly gender: PlayerGender
  /** Retrato configurado no Perfil — só para o SEU craque. */
  readonly userFaceUrl?: string | null
  readonly primaryColor: string
  /** Sem isto a prancheta é só leitura (elenco de adversário). */
  readonly editable: boolean
  readonly onFormationChange?: (formation: FormationId) => void
  readonly onSwap?: (slotIndex: number, squadIndex: number) => void
  readonly onSelect: (player: SquadPlayer) => void
  /** Ids marcados como reforço recém-chegado. */
  readonly signingIds?: ReadonlySet<string>
}

/**
 * Quem está esperando um par. A troca começa dos dois lados: pelo titular
 * ("quem entra no lugar dele") ou pelo reserva ("qual titular sai para ele
 * entrar"). Um estado só, porque os dois nunca coexistem.
 */
type PendingSwap =
  | { readonly kind: 'starter'; readonly slot: number }
  | { readonly kind: 'bench'; readonly squadIndex: number }

export const SquadBoard = ({
  squad,
  formation,
  lineup,
  userIndex,
  gender,
  userFaceUrl,
  primaryColor,
  editable,
  onFormationChange,
  onSwap,
  onSelect,
  signingIds,
}: SquadBoardProps) => {
  /** Troca aberta, esperando o outro lado. */
  const [pending, setPending] = useState<PendingSwap | null>(null)

  const shape: Formation = FORMATIONS[formation]
  const starters = lineup.slice(0, 11)
  const bench = squad.map((_, index) => index).filter((index) => !starters.includes(index))

  const applySwap = (slot: number, squadIndex: number): void => {
    onSwap?.(slot, squadIndex)
    setPending(null)
  }

  /** Nome de quem abriu a troca, para a frase de instrução. */
  const pendingName = pending
    ? pending.kind === 'starter'
      ? squad[starters[pending.slot]]?.name
      : squad[pending.squadIndex]?.name
    : undefined

  /* recalculado a cada troca: o efeito da escalação aparece na hora */
  const sectors = sectorRatings(
    starters.map((squadIndex) => squad[squadIndex]),
    shape,
  )

  return (
    <>
      <div className="squad-sectors" aria-label="Força por setor da escalação">
        {([['def', 'Defesa'], ['mei', 'Meio'], ['ata', 'Ataque']] as const).map(([key, label]) => (
          <div className="squad-sector" key={key}>
            <span className="squad-sector-label">{label}</span>
            <strong className={`squad-sector-value ${ovrClass(sectors[key])}`}>{sectors[key]}</strong>
          </div>
        ))}
      </div>

      {editable && (
        <div className="squad-coach-bar">
          {onFormationChange && (
            <label className="squad-formation-pick">
              <span className="create-label">Formação</span>
              <select
                className="squad-select"
                value={formation}
                aria-label="Escolher formação tática"
                onChange={(event) => {
                  setPending(null)
                  onFormationChange(event.target.value as FormationId)
                }}
              >
                {FORMATION_IDS.map((id) => (
                  <option key={id} value={id}>{FORMATIONS[id].label}</option>
                ))}
              </select>
            </label>
          )}
          {pending && (
            <p className="squad-swap-hint" role="status">
              {pending.kind === 'starter' ? (
                <>
                  Escolha quem fica no lugar de <strong>{pendingName}</strong>
                  {' '}— outro titular (trocam de posição) ou alguém do banco
                </>
              ) : (
                <>
                  Escolha qual titular sai para <strong>{pendingName}</strong> entrar
                </>
              )}
              <button className="banner-close" onClick={() => setPending(null)} aria-label="Cancelar troca">
                <X size={13} />
              </button>
            </p>
          )}
        </div>
      )}

      {!editable && (
        <div className="squad-coach-bar">
          <p className="muted">Esquema: <strong>{shape.label}</strong></p>
        </div>
      )}

      <div className="squad-layout">
        <div className="squad-board-holder">
          <FormationBoard
            formation={shape}
            players={starters.map((squadIndex) => squad[squadIndex])}
            userSlot={starters.indexOf(userIndex)}
            gender={gender}
            userFaceUrl={userFaceUrl}
            primaryColor={primaryColor}
            onSelect={onSelect}
          />
        </div>

        <div className="squad-list">
          {starters.map((squadIndex, slot) => {
            const player = squad[squadIndex]
            if (!player) return null
            const isUser = squadIndex === userIndex
            const isSigning = signingIds?.has(player.id) ?? false
            const slotPosition = shape.slots[slot]
            const fit = positionFit(player, slotPosition)
            const effective = overallAt(player, slotPosition)
            const isSwapping = pending?.kind === 'starter' && pending.slot === slot
            /*
             * Todo titular é alvo — de outro titular (invertem posições) ou de
             * um reserva (substituição). O craque é exceção só na segunda: ele
             * muda de posição à vontade, mas não sai do time.
             */
            const isSwapTarget =
              editable &&
              pending !== null &&
              !isSwapping &&
              (!isUser || pending.kind === 'starter')
            const pick = (): void => {
              if (isSwapTarget && pending) {
                if (pending.kind === 'starter') applySwap(pending.slot, squadIndex)
                else applySwap(slot, pending.squadIndex)
                return
              }
              onSelect(player)
            }
            return (
              <div
                key={player.id}
                className={`squad-row${isUser ? ' squad-row-user' : ''}${isSigning ? ' squad-row-signing' : ''}`}
                role="button"
                tabIndex={0}
                onClick={pick}
                onKeyDown={(event) => { if (event.key === 'Enter') pick() }}
              >
                <span className="squad-shirt">{player.shirt}</span>
                <span className={`squad-pos${fit === 'improvisado' ? ' pos-wrong' : fit === 'secundaria' ? ' pos-alt' : ''}`}>
                  {slotPosition}
                </span>
                <span className="squad-name">
                  {player.name}{isUser ? ' — você' : ''}
                  {isSigning && <span className="signing-tag">reforço</span>}
                  {fit === 'improvisado' && (
                    <span className="pos-wrong-tag" title={`Fora de posição (é ${player.position})`}>
                      fora de posição
                    </span>
                  )}
                </span>
                <span className="squad-age">{player.age} anos</span>
                <span className={`squad-ovr ${fit === 'improvisado' ? 'ovr-wrong' : ovrClass(effective)}`}>
                  {effective}
                </span>
                {editable && (
                  <button
                    className={`squad-swap-btn${isSwapping ? ' squad-swap-btn-active' : ''}`}
                    title={
                      isSwapping
                        ? 'Cancelar a troca'
                        : isUser
                          ? 'Trocar de posição com outro titular'
                          : 'Trocar este titular'
                    }
                    aria-label={isSwapping ? `Cancelar troca de ${player.name}` : `Trocar ${player.name}`}
                    aria-pressed={isSwapping}
                    onClick={(event) => {
                      event.stopPropagation()
                      setPending(isSwapping ? null : { kind: 'starter', slot })
                    }}
                  >
                    {isSwapping
                      ? <LoaderCircle size={13} className="squad-swap-spin" />
                      : <ArrowLeftRight size={13} />}
                  </button>
                )}
              </div>
            )
          })}

          {bench.map((squadIndex, benchRow) => {
            const player = squad[squadIndex]
            if (!player) return null
            const isSwapping = pending?.kind === 'bench' && pending.squadIndex === squadIndex
            /*
             * Dois reservas trocando de lugar não mudam nada: só o titular
             * aberto transforma um reserva em alvo. E se o titular aberto for o
             * craque, ninguém do banco entra — a vaga dele não está em jogo.
             */
            const isTarget =
              editable &&
              pending?.kind === 'starter' &&
              starters[pending.slot] !== userIndex
            const isSigning = signingIds?.has(player.id) ?? false
            const pick = (): void => {
              if (isTarget && pending?.kind === 'starter') {
                applySwap(pending.slot, squadIndex)
                return
              }
              onSelect(player)
            }
            return (
              <div
                key={player.id}
                className={`squad-row${benchRow === 0 ? ' squad-row-bench' : ''}${isSigning ? ' squad-row-signing' : ''}`}
                role="button"
                tabIndex={0}
                onClick={pick}
                onKeyDown={(event) => { if (event.key === 'Enter') pick() }}
              >
                <span className="squad-shirt">{player.shirt}</span>
                <span className="squad-pos">{player.position}</span>
                <span className="squad-name">
                  {player.name}
                  {isSigning && <span className="signing-tag">reforço</span>}
                </span>
                <span className="squad-age">{player.age} anos</span>
                <span className={`squad-ovr ${ovrClass(player.overall)}`}>{player.overall}</span>
                {editable && (
                  <button
                    className={`squad-swap-btn${isSwapping ? ' squad-swap-btn-active' : ''}`}
                    title={isSwapping ? 'Cancelar a troca' : 'Colocar este reserva em campo'}
                    aria-label={isSwapping ? `Cancelar troca de ${player.name}` : `Escalar ${player.name}`}
                    aria-pressed={isSwapping}
                    onClick={(event) => {
                      event.stopPropagation()
                      setPending(isSwapping ? null : { kind: 'bench', squadIndex })
                    }}
                  >
                    {isSwapping
                      ? <LoaderCircle size={13} className="squad-swap-spin" />
                      : <ArrowLeftRight size={13} />}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
