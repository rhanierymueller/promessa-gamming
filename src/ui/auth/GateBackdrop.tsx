import { ArrowLeft } from 'lucide-react'
import '../styles/auth.css'

/**
 * O cenário da portaria: estádio à noite, o facho da guarita cortando na
 * diagonal, a tarja de lugar e o voltar. Compartilhado pelas telas de conta e
 * pela ficha de inscrição — é o que faz todas serem o mesmo lugar.
 */

interface GateBackdropProps {
  /** A tarja de lugar, canto superior esquerdo. */
  readonly place: string
  readonly onBack?: () => void
  readonly isBackDisabled?: boolean
}

export const GateBackdrop = ({ place, onBack, isBackDisabled = false }: GateBackdropProps) => (
  <>
    <div className="gate-bg" aria-hidden="true" />
    <div className="gate-dark" aria-hidden="true" />
    <div className="gate-beam" aria-hidden="true" />

    <span className="gate-place">{place}</span>

    {onBack && (
      <button type="button" className="gate-back" disabled={isBackDisabled} onClick={onBack}>
        <ArrowLeft size={13} aria-hidden="true" /> Voltar
      </button>
    )}
  </>
)
