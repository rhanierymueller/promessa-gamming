import { useId } from 'react'

/**
 * Um campo dos documentos da portaria: rótulo carimbado e a linha
 * datilografada onde o jogador escreve. Nada de caixa com borda — o campo
 * pertence ao papel. Serve a credencial (login) e a ficha de inscrição.
 */

interface GateFieldProps {
  readonly label: string
  readonly value: string | number
  readonly onChange: (value: string) => void
  readonly type: 'text' | 'email' | 'password' | 'number'
  readonly autoComplete?: string
  readonly placeholder?: string
  readonly error?: string
  /** Enter no campo dispara o envio, como já era antes. */
  readonly onSubmit?: () => void
  readonly maxLength?: number
  readonly min?: number
  readonly max?: number
}

export const GateField = ({
  label,
  value,
  onChange,
  type,
  autoComplete,
  placeholder,
  error,
  onSubmit,
  maxLength,
  min,
  max,
}: GateFieldProps) => {
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
        maxLength={maxLength}
        min={min}
        max={max}
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
