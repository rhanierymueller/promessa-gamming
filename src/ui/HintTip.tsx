import { useId, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'

/**
 * A explicação que não cabe na tela.
 *
 * Abre no clique, e não só no passar do mouse: num celular não existe passar o
 * mouse, e uma dica que só o computador enxerga não é dica. O texto vive aqui
 * em vez de espremido dentro de um campo, onde ficava cortado no meio.
 */

interface HintTipProps {
  /** O que o leitor de tela anuncia no botão. */
  readonly label: string
  readonly children: ReactNode
}

export const HintTip = ({ label, children }: HintTipProps) => {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="tip">
      <button
        type="button"
        className={`tip-btn${open ? ' tip-btn-open' : ''}`}
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        /* o toque também dispara `pointerenter`: sem filtrar o tipo, o dedo
           abria a bolha na descida e o clique a fechava logo em seguida */
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setOpen(true)
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setOpen(false)
        }}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      {open && (
        <span className="tip-bubble" role="tooltip" id={id}>
          {children}
        </span>
      )}
    </span>
  )
}
