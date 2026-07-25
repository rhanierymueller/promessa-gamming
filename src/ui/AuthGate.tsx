import { ArrowLeft, KeyRound, LogIn, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { currentSessionEmail, requestPasswordReset, signInAccount } from '../online/account'
import { isOnlineAvailable } from '../online/leagues'
import { markResetRequested, resetCooldownRemaining } from '../state/passwordReset'
import { EMAIL_PATTERN } from '../state/registration'

/**
 * Portão de acesso depois da landing: entrar com a conta, criar uma ou
 * recuperar a senha. Sem internet/servidor o jogo nunca trava — segue local.
 */

interface AuthGateProps {
  readonly hasSave: boolean
  /** Entra no jogo (com save) ou cai no cadastro de carreira (sem save). */
  readonly onEnter: () => void
  /** Vai para o cadastro (criar conta + carreira). */
  readonly onSignup: () => void
  readonly onBack: () => void
  /** Aviso vindo de fora (ex.: link de recuperação expirado). */
  readonly initialNotice?: string
}

type AuthView = 'login' | 'forgot'

export const AuthGate = ({ hasSave, onEnter, onSignup, onBack, initialNotice }: AuthGateProps) => {
  const [view, setView] = useState<AuthView>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null)
  const [isSubmitting, setSubmitting] = useState(false)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [cooldownLeft, setCooldownLeft] = useState(0)

  useEffect(() => {
    void currentSessionEmail().then(setSessionEmail)
  }, [])

  // contagem regressiva entre pedidos de link (anti-spam local)
  useEffect(() => {
    if (view !== 'forgot') return
    const update = (): void => setCooldownLeft(resetCooldownRemaining(localStorage, Date.now()))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [view])

  const swapView = (next: AuthView): void => {
    setView(next)
    setError(null)
    setNotice(null)
  }

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

  const submitReset = async (): Promise<void> => {
    setError(null)
    setNotice(null)
    const trimmed = email.trim()
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Digite um e-mail válido.')
      return
    }
    if (resetCooldownRemaining(localStorage, Date.now()) > 0) return
    setSubmitting(true)
    try {
      const result = await requestPasswordReset(trimmed)
      if (!result.ok) {
        setError(result.message)
        return
      }
      if ('offline' in result) {
        setNotice('Sem conexão com o servidor — tente de novo quando a internet voltar.')
        return
      }
      markResetRequested(localStorage, Date.now())
      setCooldownLeft(resetCooldownRemaining(localStorage, Date.now()))
      // resposta neutra de propósito: nunca dizemos se o e-mail tem conta
      setNotice('Se este e-mail tiver uma conta, o link de recuperação chega em instantes. Olhe também o spam.')
    } finally {
      setSubmitting(false)
    }
  }

  if (view === 'forgot') {
    const waitSeconds = Math.ceil(cooldownLeft / 1000)
    return (
      <div className="auth-gate">
        <button
          className="btn btn-secondary btn-icon auth-back"
          disabled={isSubmitting}
          onClick={() => swapView('login')}
        >
          <ArrowLeft size={14} aria-hidden="true" /> Voltar
        </button>

        <div className="auth-card">
          <h2 className="create-title">Recuperar senha</h2>
          <p className="muted">
            Digite o e-mail da conta. Se ele existir, você recebe um link para criar uma nova senha.
          </p>

          <label className="create-field">
            <span className="create-label">E-mail</span>
            <input
              className="create-input"
              type="email"
              value={email}
              autoComplete="email"
              placeholder="voce@email.com"
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void submitReset() }}
            />
          </label>

          {error && <p className="crest-error" role="alert">{error}</p>}
          {notice && <p className="muted" role="status">{notice}</p>}

          <button
            className="btn btn-icon"
            disabled={isSubmitting || cooldownLeft > 0}
            onClick={() => void submitReset()}
          >
            <KeyRound size={15} aria-hidden="true" />
            {cooldownLeft > 0
              ? `Aguarde ${waitSeconds}s para pedir outro`
              : isSubmitting
                ? 'Enviando…'
                : 'Enviar link de recuperação'}
          </button>

          <button
            type="button"
            className="auth-link"
            disabled={isSubmitting}
            onClick={() => swapView('login')}
          >
            Lembrei a senha — voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-gate">
      <button className="btn btn-secondary btn-icon auth-back" disabled={isSubmitting} onClick={onBack}>
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

        {isOnlineAvailable() && (
          <button
            type="button"
            className="auth-link"
            disabled={isSubmitting}
            onClick={() => swapView('forgot')}
          >
            Esqueci minha senha
          </button>
        )}

        {error && <p className="crest-error" role="alert">{error}</p>}
        {notice && <p className="muted" role="status">{notice}</p>}
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
