import { X } from 'lucide-react'
import { useState } from 'react'
import { initialsOf } from '../engine/squad/initials'
import { ovrClass } from '../engine/squad/overallTier'
import type { SquadPlayer } from '../engine/squad/players'
import { facePresentationFor } from '../game/faces'
import { MAX_SQUAD_PLAYER_NAME } from '../state/save'
import { OverallStars } from './OverallStars'
import type { PlayerGender } from '../state/save'
import { HintTip } from './HintTip'

/** Carta de jogador estilo FIFA: retrato, overall + estrelas, posição e seis barras. */

const ATTR_LABELS: readonly { readonly key: keyof SquadPlayer['attrs']; readonly label: string }[] = [
  { key: 'pac', label: 'Ritmo' },
  { key: 'fin', label: 'Finalização' },
  { key: 'pas', label: 'Passe' },
  { key: 'dri', label: 'Drible' },
  { key: 'def', label: 'Defesa' },
  { key: 'fis', label: 'Físico' },
]

/**
 * Retrato da carta. O rosto vem do id do jogador, então é sempre o mesmo.
 * Sem banco de retratos (ou no SEU craque), cai nas iniciais — a carta
 * continua completa em vez de abrir um buraco no layout.
 */
const PlayerFace = ({
  player,
  userFaceUrl,
  gender = 'masculino',
}: {
  player: SquadPlayer
  userFaceUrl?: string | null
  gender?: PlayerGender
}) => {
  // o retrato do craque é pixel art com fundo vazado: cabe inteiro e sem
  // suavização; os do elenco são pinturas 256×256 que preenchem a moldura
  const isUserPortrait = Boolean(userFaceUrl)
  const presentation = isUserPortrait ? null : facePresentationFor(player.id, gender)
  const url = userFaceUrl ?? presentation?.url ?? null
  const initials = initialsOf(player.name)

  return (
    <div className="player-face">
      {url ? (
        <img
          className={`player-face-img${isUserPortrait ? ' player-face-pixel' : ''}`}
          src={url}
          alt=""
          aria-hidden="true"
          loading="lazy"
          style={presentation ? {
            transform: `translateX(${presentation.xShiftPercent}%)`,
            clipPath: presentation.topCropPercent > 0
              ? `inset(${presentation.topCropPercent}% 0 0)`
              : undefined,
          } : undefined}
        />
      ) : (
        <span className="player-face-initials" aria-hidden="true">{initials}</span>
      )}
    </div>
  )
}

interface PlayerCardModalProps {
  /** Gênero do mundo do jogo — decide de qual banco vem o rosto. */
  readonly gender?: PlayerGender
  readonly player: SquadPlayer
  readonly clubName: string
  readonly isUser: boolean
  /** Retrato configurado no Perfil — só para o SEU craque. */
  readonly userFaceUrl?: string | null
  /** null = não pode batizar; 'livre' = pode UMA vez; 'usado' = já batizou. */
  readonly renameState: 'livre' | 'usado' | null
  readonly onRename?: (name: string) => void
  readonly onClose: () => void
  /** Slot extra no rodapé (ex.: botão Contratar no mercado). */
  readonly footer?: React.ReactNode
}

export const PlayerCardModal = ({ player, clubName, isUser, userFaceUrl, renameState, onRename, onClose, footer, gender }: PlayerCardModalProps) => {
  const [draft, setDraft] = useState('')
  return (
  <div className="player-modal" role="dialog" aria-modal="true" aria-label={`Carta de ${player.name}`} onClick={onClose}>
    <div className="player-card" onClick={(event) => event.stopPropagation()}>
      <button className="banner-close player-card-close" onClick={onClose} aria-label="Fechar carta">
        <X size={16} />
      </button>
      <div className="player-card-top">
        <div className="player-card-portrait">
          <PlayerFace player={player} userFaceUrl={userFaceUrl} gender={gender} />
          <span className={`player-ovr ${ovrClass(player.overall)}`}>{player.overall}</span>
        </div>
        <div className="player-card-id">
          <h3 className="player-card-name">{player.name}{isUser ? ' (você)' : ''}</h3>
          {/* cada item é indivisível: a linha quebra nos "·", nunca em "19 / anos" */}
          <p className="muted player-card-meta">
            <span className="player-meta-item">{clubName}</span>
            {player.shirt > 0 && <> · <span className="player-meta-item">camisa {player.shirt}</span></>}
            {' · '}
            <span className="player-meta-item">{player.age} anos</span>
            {player.altPositions.length > 0 && (
              <> · <span className="player-meta-item">também joga: {player.altPositions.join(', ')}</span></>
            )}
          </p>
          {player.age < 27 && (
            <p className={`player-potential potential-${player.potential}`}>
              potencial {player.potential === 'medio' ? 'médio' : player.potential}
            </p>
          )}
          <div className="player-card-rank">
            <OverallStars overall={player.overall} />
            <span className="player-pos">{player.position}</span>
          </div>
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
          {/* a dica fica DENTRO do campo, à direita: é dele que ela fala, e
              fora dali virava mais um botão competindo com a ação */}
          <div className="player-rename-field">
            <input
              className="create-input player-rename-input"
              type="text"
              maxLength={MAX_SQUAD_PLAYER_NAME}
              placeholder="Batizar jogador"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <HintTip label="Como funciona batizar">
              Dê o nome que quiser a este jogador. Vale <strong>uma vez só</strong>: depois
              de batizado, o nome fica para o resto da carreira.
            </HintTip>
          </div>
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
