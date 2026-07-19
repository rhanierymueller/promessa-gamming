import { ArrowLeft, LogIn, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { currentSessionEmail, signInAccount } from '../online/account'
import { isOnlineAvailable } from '../online/leagues'

/**
 * Portão de acesso depois da landing: entrar com a conta ou criar uma.
 * Sem internet/servidor o jogo nunca trava — segue local com aviso.
 */

interface AuthGateProps {
  readonly hasSave: boolean
  /** Entra no jogo (com save) ou cai no cadastro de carreira (sem save). */
  readonly onEnter: () => void
  /** Vai para o cadastro (criar conta + carreira). */
  readonly onSignup: () => void
  readonly onBack: () => void
}

export const AuthGate = ({ hasSave, onEnter, onSignup, onBack }: AuthGateProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  useEffect(() => {
    void currentSessionEmail().then(setSessionEmail)
  }, [])

  const submit = async (): Promise<void> => {
    setError(null)
    setNotice(null)
    if (email.trim().length === 0 || password.length === 0) {
      setError('Preencha e-mail e senha.')
      return
    }
    setSubmitting(true)
    try {
      const result = await signInAccount(email, password)
      if (!result.ok) {
        setError(result.message)
        return
      }
      if ('offline' in result) {
        setNotice('Sem conexão com o servidor — seguindo no modo local.')
      }
      onEnter()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-gate">
      <button className="btn btn-secondary btn-icon auth-back" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true" /> Voltar
      </button>

      <div className="auth-card">
        <h2 className="create-title">Bem-vindo de volta</h2>

        {sessionEmail && hasSave && (
          <button className="btn btn-icon auth-continue" onClick={onEnter}>
            <LogIn size={15} aria-hidden="true" /> Continuar como {sessionEmail}
          </button>
        )}

        <label className="create-field">
          <span className="create-label">E-mail</span>
          <input
            className="create-input"
            type="email"
            value={email}
            autoComplete="email"
            placeholder="voce@email.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="create-field">
          <span className="create-label">Senha</span>
          <input
            className="create-input"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void submit() }}
          />
        </label>

        {error && <p className="crest-error" role="alert">{error}</p>}
        {notice && <p className="muted">{notice}</p>}
        {!isOnlineAvailable() && (
          <p className="muted">Modo local: o servidor não está configurado — dá para jogar mesmo assim.</p>
        )}

        <button className="btn btn-icon" disabled={isSubmitting} onClick={() => void submit()}>
          <LogIn size={15} aria-hidden="true" /> {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>

        <div className="auth-divider" role="separator">ou</div>

        <button className="btn btn-secondary btn-icon" onClick={onSignup}>
          <UserPlus size={15} aria-hidden="true" /> Criar conta e carreira
        </button>
      </div>
    </div>
  )
}
