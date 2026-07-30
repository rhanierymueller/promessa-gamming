import { useId } from 'react'

/**
 * Um campo da credencial: rótulo carimbado e a linha datilografada onde o
 * jogador escreve. Nada de caixa com borda — o campo pertence ao objeto.
 */

interface AuthFieldProps {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly type: 'email' | 'password'
  readonly autoComplete: string
  readonly placeholder?: string
  readonly error?: string
  /** Enter no campo dispara o envio, como já era antes. */
  readonly onSubmit?: () => void
}

export const AuthField = ({
  label,
  value,
  onChange,
  type,
  autoComplete,
  placeholder,
  error,
  onSubmit,
}: AuthFieldProps) => {
  const id = useId()
  const errorId = `${id}-erro`

  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        className="field-input"
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onSubmit) onSubmit()
        }}
      />
      {error && (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      )}
    </label>
  )
}
