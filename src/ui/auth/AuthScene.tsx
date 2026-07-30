import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import portraitSprite from '../../assets/sprites/s_portrait.png'
import '../styles/auth.css'

/**
 * A cena das telas de conta: a portaria do estádio à noite, com a credencial
 * pendurada no cordão. As três telas (entrar, recuperar senha, nova senha)
 * usam esta casca — é o que faz elas serem reconhecidamente o mesmo lugar.
 */

interface AuthSceneProps {
  /** A tarja de lugar, canto superior esquerdo. */
  readonly place: string
  /** Linha miúda acima do título, dentro da credencial. */
  readonly kicker: string
  readonly title: string
  readonly subtitle?: string
  /** Carimbo na diagonal, para estado concluído. */
  readonly stamp?: string
  readonly onBack?: () => void
  readonly isBackDisabled?: boolean
  readonly children: ReactNode
}

export const AuthScene = ({
  place,
  kicker,
  title,
  subtitle,
  stamp,
  onBack,
  isBackDisabled = false,
  children,
}: AuthSceneProps) => (
  <div className="gate">
    <div className="gate-bg" aria-hidden="true" />
    <div className="gate-dark" aria-hidden="true" />
    <div className="gate-beam" aria-hidden="true" />

    <span className="gate-place">{place}</span>

    {onBack && (
      <button type="button" className="gate-back" disabled={isBackDisabled} onClick={onBack}>
        <ArrowLeft size={13} aria-hidden="true" /> Voltar
      </button>
    )}

    <div className="badge">
      <div className="badge-cord" aria-hidden="true" />
      <div className="badge-clip" aria-hidden="true" />

      <div className="badge-body">
        {stamp && <span className="gate-stamp">{stamp}</span>}

        <div className="badge-head">
          <img className="badge-photo" src={portraitSprite} alt="" aria-hidden="true" />
          <div className="badge-titles">
            <span className="badge-kicker">{kicker}</span>
            <h2 className="badge-title">{title}</h2>
          </div>
        </div>

        {subtitle && <p className="badge-sub">{subtitle}</p>}

        {children}
      </div>
    </div>
  </div>
)
