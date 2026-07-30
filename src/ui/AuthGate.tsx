import { KeyRound, LogIn, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AuthField } from './auth/AuthField'
import { AuthScene } from './auth/AuthScene'
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
      <AuthScene
        place="Portaria · segunda via"
        kicker="Balcão da portaria"
        title="Perdi a senha"
        subtitle="Deixe o e-mail da conta. Se ela existir, sai um link para você criar uma senha nova."
        onBack={() => swapView('login')}
        isBackDisabled={isSubmitting}
      >
        <div className="badge-fields">
          <AuthField
            label="E-mail"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
            placeholder="voce@email.com"
            onSubmit={() => void submitReset()}
          />
        </div>

        {error && <p className="gate-alert" role="alert">{error}</p>}
        {notice && <p className="gate-note" role="status">{notice}</p>}

        <div className="gate-actions">
          <button
            className="gate-btn"
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
            className="gate-link"
            disabled={isSubmitting}
            onClick={() => swapView('login')}
          >
            Lembrei a senha — voltar ao login
          </button>
        </div>
      </AuthScene>
    )
  }

  return (
    <AuthScene
      place="Túnel · portaria"
      kicker="Credencial de atleta"
      title="De volta ao clube"
      onBack={onBack}
      isBackDisabled={isSubmitting}
    >
      {sessionEmail && hasSave && (
        <button type="button" className="gate-resume" onClick={onEnter}>
          <LogIn size={14} aria-hidden="true" />
          <span>Continuar como {sessionEmail}</span>
        </button>
      )}

      <div className="badge-fields">
        <AuthField
          label="E-mail"
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
        />
        <AuthField
          label="Senha"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="current-password"
          onSubmit={() => void submit()}
        />
      </div>

      {isOnlineAvailable() && (
        <button
          type="button"
          className="gate-link"
          disabled={isSubmitting}
          onClick={() => swapView('forgot')}
        >
          Esqueci minha senha
        </button>
      )}

      {error && <p className="gate-alert" role="alert">{error}</p>}
      {notice && <p className="gate-note" role="status">{notice}</p>}
      {!isOnlineAvailable() && (
        <p className="gate-note">
          Modo local: o servidor não está configurado — dá para jogar mesmo assim.
        </p>
      )}

      <div className="gate-actions">
        <button className="gate-btn" disabled={isSubmitting} onClick={() => void submit()}>
          <LogIn size={15} aria-hidden="true" /> {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>

        <div className="gate-or" role="separator">ou</div>

        <button type="button" className="gate-btn gate-btn-ghost" onClick={onSignup}>
          <UserPlus size={15} aria-hidden="true" /> Criar conta e carreira
        </button>
      </div>
    </AuthScene>
  )
}
