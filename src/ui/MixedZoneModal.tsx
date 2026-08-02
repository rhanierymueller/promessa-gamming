import { Mic, X } from 'lucide-react'
import reporterArt from '../assets/npcs/reporter.jpg'
import { eventById } from '../engine/career/events'
import type { PlayerSave } from '../state/save'
import { usePlayerPortrait } from './usePlayerPortrait'
import './styles/mixedZone.css'

/**
 * Zona mista: a entrevista depois do jogo, em modal.
 *
 * Era um card no meio da Home, disputando atenção com o próximo compromisso e
 * a tabela — e o jogador respondia no automático para a tela parar de pedir.
 * Em modal, com o fundo apagado, a pergunta vira o único assunto: repórter de
 * um lado, você do outro, microfone no meio.
 */

interface MixedZoneModalProps {
  readonly save: PlayerSave
  readonly onAnswer: (optionIndex: number) => void
  /** Sair sem falar: não mexe em moral nem em treino. */
  readonly onDecline: () => void
}

export const MixedZoneModal = ({ save, onAnswer, onDecline }: MixedZoneModalProps) => {
  const avatarUrl = usePlayerPortrait(save.appearance)
  const event = save.pendingEvent ? eventById(save.pendingEvent.templateId) : null
  if (!event) return null

  return (
    <div
      className="mixedzone-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mixedzone-prompt"
    >
      <div className="mixedzone-modal">
        <button
          type="button"
          className="mixedzone-close"
          onClick={onDecline}
          aria-label="Sair sem responder"
        >
          <X size={16} />
        </button>

        {/* o palco da entrevista: repórter, microfone e você */}
        <div className="mixedzone-stage" aria-hidden="true">
          <figure className="mixedzone-face mixedzone-face-reporter">
            <img src={reporterArt} alt="" />
            <figcaption>Imprensa</figcaption>
          </figure>

          <span className="mixedzone-mic">
            <Mic size={18} aria-hidden="true" />
          </span>

          <figure className="mixedzone-face mixedzone-face-player">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span className="mixedzone-face-empty" />}
            <figcaption>{save.playerName}</figcaption>
          </figure>
        </div>

        <p className="mixedzone-eyebrow">Zona mista</p>
        <p className="mixedzone-prompt" id="mixedzone-prompt">
          “{event.prompt}”
        </p>

        <div className="mixedzone-options">
          {event.options.map((option, index) => (
            <button
              key={option.label}
              type="button"
              className={`mixedzone-option mixedzone-tone-${option.tone}`}
              onClick={() => onAnswer(index)}
            >
              <span className="mixedzone-option-label">{option.label}</span>
              <span className="mixedzone-option-tone">
                {option.tone}
                {option.chance < 1 ? ` · ${Math.round(option.chance * 100)}%` : ' · garantido'}
              </span>
            </button>
          ))}
        </div>

        <button type="button" className="mixedzone-skip" onClick={onDecline}>
          Passar direto, sem falar
        </button>
      </div>
    </div>
  )
}
