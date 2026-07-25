import { ArrowLeftRight, X } from 'lucide-react'
import { useState } from 'react'
import { FORMATION_IDS, FORMATIONS, type Formation, type FormationId } from '../engine/squad/formation'
import { overallAt, positionFit, type SquadPlayer } from '../engine/squad/players'
import { FormationBoard } from './FormationBoard'
import { ovrClass } from './PlayerCard'

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
  readonly primaryColor: string
  /** Sem isto a prancheta é só leitura (elenco de adversário). */
  readonly editable: boolean
  readonly onFormationChange?: (formation: FormationId) => void
  readonly onSwap?: (slotIndex: number, squadIndex: number) => void
  readonly onSelect: (player: SquadPlayer) => void
  /** Ids marcados como reforço recém-chegado. */
  readonly signingIds?: ReadonlySet<string>
}

export const SquadBoard = ({
  squad,
  formation,
  lineup,
  userIndex,
  primaryColor,
  editable,
  onFormationChange,
  onSwap,
  onSelect,
  signingIds,
}: SquadBoardProps) => {
  /** Slot cuja troca está aberta, esperando quem entra. */
  const [swapSlot, setSwapSlot] = useState<number | null>(null)

  const shape: Formation = FORMATIONS[formation]
  const starters = lineup.slice(0, 11)
  const bench = squad.map((_, index) => index).filter((index) => !starters.includes(index))

  const applySwap = (slot: number, squadIndex: number): void => {
    onSwap?.(slot, squadIndex)
    setSwapSlot(null)
  }

  return (
    <>
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
                  setSwapSlot(null)
                  onFormationChange(event.target.value as FormationId)
                }}
              >
                {FORMATION_IDS.map((id) => (
                  <option key={id} value={id}>{FORMATIONS[id].label}</option>
                ))}
              </select>
            </label>
          )}
          {swapSlot !== null && (
            <p className="squad-swap-hint" role="status">
              Escolha quem fica no lugar de{' '}
              <strong>{squad[starters[swapSlot]]?.name}</strong>
              {' '}— outro titular (trocam de posição) ou alguém do banco
              <button className="banner-close" onClick={() => setSwapSlot(null)} aria-label="Cancelar troca">
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
            // com uma troca aberta, os OUTROS titulares também são alvo: dá
            // para inverter dois jogadores de posição sem passar pelo banco
            const isSwapTarget = editable && swapSlot !== null && swapSlot !== slot && !isUser
            const pick = (): void => {
              if (isSwapTarget && swapSlot !== null) {
                applySwap(swapSlot, squadIndex)
                return
              }
              onSelect(player)
            }
            return (
              <div
                key={player.id}
                className={`squad-row${isUser ? ' squad-row-user' : ''}${isSigning ? ' squad-row-signing' : ''}${swapSlot === slot ? ' squad-row-swapping' : ''}${isSwapTarget ? ' squad-row-target' : ''}`}
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
                {editable && !isUser && (
                  <button
                    className="squad-swap-btn"
                    title="Trocar este titular"
                    aria-label={`Trocar ${player.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSwapSlot(swapSlot === slot ? null : slot)
                    }}
                  >
                    <ArrowLeftRight size={13} />
                  </button>
                )}
              </div>
            )
          })}

          {bench.map((squadIndex, benchRow) => {
            const player = squad[squadIndex]
            if (!player) return null
            const isTarget = editable && swapSlot !== null
            const isSigning = signingIds?.has(player.id) ?? false
            const pick = (): void => {
              if (isTarget && swapSlot !== null) {
                applySwap(swapSlot, squadIndex)
                return
              }
              onSelect(player)
            }
            return (
              <div
                key={player.id}
                className={`squad-row${benchRow === 0 ? ' squad-row-bench' : ''}${isSigning ? ' squad-row-signing' : ''}${isTarget ? ' squad-row-target' : ''}`}
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
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
