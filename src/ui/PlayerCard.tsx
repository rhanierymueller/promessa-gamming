import { X } from 'lucide-react'
import { useState } from 'react'
import type { SquadPlayer } from '../engine/squad/players'
import { MAX_SQUAD_PLAYER_NAME } from '../state/save'
import { OverallStars } from './OverallStars'

/** Carta de jogador estilo FIFA: overall + estrelas, posição e seis barras. */

export const ovrClass = (overall: number): string =>
  overall >= 75 ? 'ovr-high' : overall >= 62 ? 'ovr-mid' : 'ovr-low'

const ATTR_LABELS: readonly { readonly key: keyof SquadPlayer['attrs']; readonly label: string }[] = [
  { key: 'pac', label: 'Ritmo' },
  { key: 'fin', label: 'Finalização' },
  { key: 'pas', label: 'Passe' },
  { key: 'dri', label: 'Drible' },
  { key: 'def', label: 'Defesa' },
  { key: 'fis', label: 'Físico' },
]

interface PlayerCardModalProps {
  readonly player: SquadPlayer
  readonly clubName: string
  readonly isUser: boolean
  /** null = não pode batizar; 'livre' = pode UMA vez; 'usado' = já batizou. */
  readonly renameState: 'livre' | 'usado' | null
  readonly onRename?: (name: string) => void
  readonly onClose: () => void
  /** Slot extra no rodapé (ex.: botão Contratar no mercado). */
  readonly footer?: React.ReactNode
}

export const PlayerCardModal = ({ player, clubName, isUser, renameState, onRename, onClose, footer }: PlayerCardModalProps) => {
  const [draft, setDraft] = useState('')
  return (
  <div className="player-modal" role="dialog" aria-modal="true" aria-label={`Carta de ${player.name}`} onClick={onClose}>
    <div className="player-card" onClick={(event) => event.stopPropagation()}>
      <button className="banner-close player-card-close" onClick={onClose} aria-label="Fechar carta">
        <X size={16} />
      </button>
      <div className="player-card-top">
        <div className="player-card-ovr">
          <span className={`player-ovr ${ovrClass(player.overall)}`}>{player.overall}</span>
          <OverallStars overall={player.overall} />
          <span className="player-pos">{player.position}</span>
        </div>
        <div className="player-card-id">
          <h3 className="player-card-name">{player.name}{isUser ? ' (você)' : ''}</h3>
          <p className="muted player-card-meta">
            {clubName}
            {player.shirt > 0 && <> · camisa {player.shirt}</>} · {player.age} anos
            {player.altPositions.length > 0 && (
              <> · também joga: {player.altPositions.join(', ')}</>
            )}
          </p>
          {player.age < 27 && (
            <p className={`player-potential potential-${player.potential}`}>
              potencial {player.potential === 'medio' ? 'médio' : player.potential}
            </p>
          )}
        </div>
      </div>
      <div className="player-attr-list">
        {ATTR_LABELS.map(({ key, label }) => (
          <div key={key} className="player-attr-row">
            <span className="player-attr-label">{label}</span>
            <div className="player-attr-bar">
              <div
                className={`player-attr-fill ${ovrClass(player.attrs[key])}`}
                style={{ width: `${Math.min(100, player.attrs[key])}%` }}
              />
            </div>
            <span className="player-attr-value">{player.attrs[key]}</span>
          </div>
        ))}
      </div>
      {renameState === 'livre' && onRename && (
        <div className="player-rename">
          <input
            className="create-input player-rename-input"
            type="text"
            maxLength={MAX_SQUAD_PLAYER_NAME}
            placeholder="Batizar jogador (vale UMA vez)"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className="btn btn-secondary player-rename-btn"
            disabled={draft.trim().length === 0}
            onClick={() => onRename(draft)}
          >
            Batizar
          </button>
        </div>
      )}
      {renameState === 'usado' && (
        <p className="muted player-rename-note">Nome já editado — cada jogador só pode ser batizado uma vez.</p>
      )}
      {footer}
    </div>
  </div>
  )
}
