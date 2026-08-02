import { Sparkles } from 'lucide-react'
import { PERK_OFFER_REASON, perkById, type PerkId } from '../engine/career/perks'
import type { PlayerSave } from '../state/save'
import { usePlayerPortrait } from './usePlayerPortrait'
import './styles/mixedZone.css'

/**
 * A habilidade nova, em modal.
 *
 * Escolher uma habilidade é a decisão mais definitiva da carreira — não tem
 * volta. Como card no meio da Home, ela dividia a tela com o próximo jogo e a
 * tabela e o jogador clicava na primeira para seguir. Em modal, com o fundo
 * apagado, ela ocupa o momento que merece.
 *
 * Divide a estrutura com a zona mista de propósito: as duas são "o jogo parou
 * para você escolher", e um formato só ensina a leitura das duas.
 */

interface PerkOfferModalProps {
  readonly save: PlayerSave
  readonly onChoose: (perkId: PerkId) => void
}

export const PerkOfferModal = ({ save, onChoose }: PerkOfferModalProps) => {
  const avatarUrl = usePlayerPortrait(save.appearance)
  if (!save.perkOffer) return null

  return (
    <div
      className="mixedzone-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perkoffer-title"
    >
      <div className="mixedzone-modal perkoffer-modal">
        {/* sem botão de fechar: a escolha é obrigatória, e é isso que dá peso */}
        <div className="perkoffer-stage" aria-hidden="true">
          <span className="perkoffer-glow" />
          {avatarUrl ? (
            <img className="perkoffer-portrait" src={avatarUrl} alt="" />
          ) : (
            <span className="perkoffer-portrait perkoffer-portrait-empty" />
          )}
          <span className="perkoffer-badge">
            <Sparkles size={16} aria-hidden="true" />
          </span>
        </div>

        <p className="mixedzone-eyebrow">Nova habilidade</p>
        <h2 className="perkoffer-title" id="perkoffer-title">
          O estrelato cobra o preço
        </h2>
        <p className="perkoffer-reason">{PERK_OFFER_REASON}</p>

        <div className="mixedzone-options">
          {save.perkOffer.options.map((perkId) => {
            const perk = perkById(perkId)
            return (
              <button
                key={perkId}
                type="button"
                className="mixedzone-option perkoffer-option"
                onClick={() => onChoose(perkId)}
              >
                <span className="mixedzone-option-label">{perk.name}</span>
                <span className="perkoffer-desc">{perk.description}</span>
              </button>
            )
          })}
        </div>

        <p className="perkoffer-warning">Escolha uma. Não tem volta.</p>
      </div>
    </div>
  )
}
