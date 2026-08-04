import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Um campo dos documentos da portaria: rótulo carimbado e a linha
 * datilografada onde o jogador escreve. Nada de caixa com borda — o campo
 * pertence ao papel. Serve a credencial (login) e a ficha de inscrição.
 */

/**
 * O `type` que o input usa de fato. Fica de fora do componente para ser
 * verificável: é a regra que decide se a senha aparece, e ela vale só para
 * campos de senha — revelar não pode transformar um e-mail em outra coisa.
 */
export const fieldInputType = (
  type: GateFieldProps['type'],
  revealed: boolean,
): GateFieldProps['type'] => (type === 'password' && revealed ? 'text' : type)

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
  /*
   * Senha em bolinhas é o certo por padrão, mas errar a digitação sem poder
   * conferir é o que mais trava um cadastro — ainda mais no celular. O olho
   * fica só nos campos de senha, e cada campo lembra do próprio estado: revelar
   * a senha não deve revelar a confirmação junto.
   */
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className={`field-line${isPassword ? ' field-line-secret' : ''}`}>
        <input
          id={id}
          className="field-input"
          type={fieldInputType(type, revealed)}
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
        {isPassword && (
          <button
            type="button"
            className="field-reveal"
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={revealed}
            /* o botão vive dentro do <label>: sem isto o clique era repassado
               ao input e o campo roubava o foco a cada alternância */
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.preventDefault()
              setRevealed((current) => !current)
            }}
          >
            {revealed ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        )}
      </span>
      {error && (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      )}
    </label>
  )
}
