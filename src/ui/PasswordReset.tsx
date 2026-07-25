import { KeyRound, LogIn } from 'lucide-react'
import { useState } from 'react'
import { updatePassword } from '../online/account'
import { validateNewPassword, type PasswordResetErrors } from '../state/passwordReset'

/**
 * Tela aberta pelo link de recuperação do e-mail: define a nova senha
 * usando a sessão temporária que o Supabase cria ao abrir o link.
 */

interface PasswordResetProps {
  /** Senha trocada com sucesso: seguir para o jogo. */
  readonly onDone: () => void
  /** Desistiu ou o link não vale mais: voltar ao login. */
  readonly onCancel: () => void
}

export const PasswordReset = ({ onDone, onCancel }: PasswordResetProps) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<PasswordResetErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const [isDone, setDone] = useState(false)

  const submit = async (): Promise<void> => {
    setServerError(null)
    const found = validateNewPassword(password, confirmPassword)
    setErrors(found)
    if (found.password || found.confirmPassword) return
    setSubmitting(true)
    try {
      const result = await updatePassword(password)
      if (!result.ok) {
        setServerError(result.message)
        return
      }
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (isDone) {
    return (
      <div className="auth-gate">
        <div className="auth-card">
          <h2 className="create-title">Senha atualizada!</h2>
          <p className="muted">Você já está conectado com a nova senha.</p>
          <button className="btn btn-icon" onClick={onDone}>
            <LogIn size={15} aria-hidden="true" /> Entrar no jogo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <h2 className="create-title">Criar nova senha</h2>
        <p className="muted">Defina a nova senha da sua conta.</p>

        <label className="create-field">
          <span className="create-label">Nova senha</span>
          <input
            className="create-input"
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
          {errors.password && <span className="create-error">{errors.password}</span>}
        </label>
        <label className="create-field">
          <span className="create-label">Confirmar nova senha</span>
          <input
            className="create-input"
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void submit() }}
          />
          {errors.confirmPassword && <span className="create-error">{errors.confirmPassword}</span>}
        </label>

        {serverError && <p className="crest-error" role="alert">{serverError}</p>}

        <button className="btn btn-icon" disabled={isSubmitting} onClick={() => void submit()}>
          <KeyRound size={15} aria-hidden="true" /> {isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
        </button>

        <button type="button" className="auth-link" disabled={isSubmitting} onClick={onCancel}>
          Voltar ao login
        </button>
      </div>
    </div>
  )
}
