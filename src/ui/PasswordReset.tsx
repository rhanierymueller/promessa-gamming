import { KeyRound, LogIn } from 'lucide-react'
import { useState } from 'react'
import { AuthField } from './auth/AuthField'
import { AuthScene } from './auth/AuthScene'
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
      <AuthScene
        place="Portaria · credencial nova"
        kicker="Balcão da portaria"
        title="Credencial liberada"
        subtitle="Senha trocada. Você já está conectado com ela."
        stamp="deferido"
      >
        <div className="gate-actions">
          <button className="gate-btn" onClick={onDone}>
            <LogIn size={15} aria-hidden="true" /> Entrar no jogo
          </button>
        </div>
      </AuthScene>
    )
  }

  return (
    <AuthScene
      place="Portaria · credencial nova"
      kicker="Balcão da portaria"
      title="Nova senha"
      subtitle="Escolha a senha nova da conta. A antiga deixa de valer na hora."
    >
      <div className="badge-fields">
        <AuthField
          label="Nova senha"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="new-password"
          error={errors.password}
        />
        <AuthField
          label="Confirmar nova senha"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword}
          onSubmit={() => void submit()}
        />
      </div>

      {serverError && <p className="gate-alert" role="alert">{serverError}</p>}

      <div className="gate-actions">
        <button className="gate-btn" disabled={isSubmitting} onClick={() => void submit()}>
          <KeyRound size={15} aria-hidden="true" /> {isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
        </button>

        <button type="button" className="gate-link" disabled={isSubmitting} onClick={onCancel}>
          Voltar ao login
        </button>
      </div>
    </AuthScene>
  )
}
