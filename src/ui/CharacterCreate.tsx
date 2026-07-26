import { ArrowLeft, Minus, Plus, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  DEFAULT_ATTRIBUTES,
  type AttributeKey,
  type PlayerAttributes,
} from '../engine/career/attributes'
import type { PlayerFieldPosition } from '../engine/squad/formation'
import { NATIONS, PLAYABLE_NATIONS } from '../data/nations'
import { currentSessionEmail, registerAccount } from '../online/account'
import {
  remainingCreatePoints,
  validateRegistration,
  type RegistrationErrors,
} from '../state/registration'
import {
  createSave,
  MAX_CLUB_NAME,
  MAX_PLAYER_NAME,
  PLAYER_MAX_AGE,
  PLAYER_MIN_AGE,
  type PlayerSave,
  type PlayerGender,
} from '../state/save'
import { NationFlag } from './NationFlag'

interface CharacterCreateProps {
  readonly onCreated: (save: PlayerSave) => void
  /** Volta para o login. Ausente quando o cadastro é a única saída. */
  readonly onBack?: () => void
}

const POSITIONS: readonly { readonly id: PlayerFieldPosition; readonly label: string }[] = [
  { id: 'LD', label: 'Lateral dir.' },
  { id: 'ZAG', label: 'Zagueiro' },
  { id: 'LE', label: 'Lateral esq.' },
  { id: 'VOL', label: 'Volante' },
  { id: 'MEI', label: 'Meia' },
  { id: 'PON', label: 'Ponta' },
  { id: 'ATA', label: 'Atacante' },
]

const DEFAULT_AGE = 18
const MAX_ATTR_LEVEL = 10

export const CharacterCreate = ({ onCreated, onBack }: CharacterCreateProps) => {
  const [playerName, setPlayerName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [playerAge, setPlayerAge] = useState(DEFAULT_AGE)
  const [position, setPosition] = useState<PlayerFieldPosition>('ATA')
  const [nationalityId, setNationalityId] = useState<string>(NATIONS[0].id)
  // decisão de uma vez só: o gênero não muda depois da criação
  const [gender, setGender] = useState<PlayerGender>('masculino')
  const [attributes, setAttributes] = useState<PlayerAttributes>(DEFAULT_ATTRIBUTES)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<RegistrationErrors>({})
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)

  useEffect(() => {
    void currentSessionEmail().then(setSessionEmail)
  }, [])

  const remaining = remainingCreatePoints(attributes)

  const bump = (key: AttributeKey, delta: 1 | -1): void => {
    const next = attributes[key] + delta
    if (next < DEFAULT_ATTRIBUTES[key] || next > MAX_ATTR_LEVEL) return
    if (delta > 0 && remaining <= 0) return
    setAttributes({ ...attributes, [key]: next })
  }

  const submit = async (): Promise<void> => {
    const form = {
      playerName, teamName, playerAge, playerPosition: position,
      nationalityId, gender, attributes, email, username, password, confirmPassword,
    }
    const found = validateRegistration(form, { skipAccount: sessionEmail !== null })
    setErrors(found)
    setServerError(null)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      if (sessionEmail === null) {
        const result = await registerAccount(email, username, password)
        if (!result.ok) {
          setServerError(result.message)
          return
        }
      }
      const accountEmail = sessionEmail ?? email.trim()
      const accountUsername = sessionEmail ? sessionEmail.split('@')[0] : username.trim()
      const save = createSave({
        playerName,
        teamName,
        nationalityId,
        gender,
        playerAge,
        playerPosition: position,
        attributes,
        account: { email: accountEmail, username: accountUsername },
      })
      if (save) onCreated(save)
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : 'erro inesperado ao criar a conta')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldError = (key: keyof RegistrationErrors): string | undefined => errors[key]

  return (
    <div className="create">
      {onBack && (
        <button
          className="btn btn-secondary btn-icon auth-back create-back"
          disabled={isSubmitting}
          onClick={onBack}
        >
          <ArrowLeft size={14} aria-hidden="true" /> Voltar
        </button>
      )}
      <h2 className="create-title">Crie a sua promessa</h2>

      <section className="create-section">
        <h3 className="create-section-title">O atleta</h3>
      <div className="create-grid">
        <label className="create-field">
          <span className="create-label">Nome do craque</span>
          <input
            className="create-input"
            type="text"
            value={playerName}
            maxLength={MAX_PLAYER_NAME}
            placeholder="Como a torcida vai te chamar?"
            onChange={(event) => setPlayerName(event.target.value)}
          />
          {fieldError('playerName') && <span className="create-error">{fieldError('playerName')}</span>}
        </label>

        <label className="create-field">
          <span className="create-label">Idade ({PLAYER_MIN_AGE}-{PLAYER_MAX_AGE})</span>
          <input
            className="create-input create-input-age"
            type="number"
            min={PLAYER_MIN_AGE}
            max={PLAYER_MAX_AGE}
            value={playerAge}
            onChange={(event) => setPlayerAge(Number(event.target.value))}
          />
          {fieldError('playerAge') && <span className="create-error">{fieldError('playerAge')}</span>}
        </label>
      </div>

      </section>

      <section className="create-section">
        <h3 className="create-section-title">O clube</h3>
      <label className="create-field">
        <span className="create-label">Nome do SEU time (entra na Série D)</span>
        <input
          className="create-input"
          type="text"
          value={teamName}
          maxLength={MAX_CLUB_NAME}
          placeholder="Ex.: Galáticos FC"
          onChange={(event) => setTeamName(event.target.value)}
        />
        {fieldError('teamName') && <span className="create-error">{fieldError('teamName')}</span>}
      </label>

      </section>

      <section className="create-section">
        <h3 className="create-section-title">Em campo</h3>
      <span className="create-label">Sua posição (goleiro não — você é craque de linha)</span>
      <div className="create-nations">
        {POSITIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`nation-chip${option.id === position ? ' nation-chip-active' : ''}`}
            onClick={() => setPosition(option.id)}
          >
            <strong>{option.id}</strong> {option.label}
          </button>
        ))}
      </div>

      <span className="create-label">Gênero</span>
      <div className="create-gender">
        {([['masculino', 'Masculino'], ['feminino', 'Feminino']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`nation-chip${id === gender ? ' nation-chip-active' : ''}`}
            onClick={() => setGender(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="create-warning">
        <TriangleAlert size={13} aria-hidden="true" />
        Escolha com calma: o gênero <strong>não pode ser trocado depois</strong>. Ele define a
        arte do seu atleta, os nomes de todo o mundo do jogo e a narração das partidas.
      </p>

      <span className="create-label">Nacionalidade (seleção que pode te convocar)</span>
      <div className="create-nations">
        {PLAYABLE_NATIONS.map((nation) => (
          <button
            key={nation.id}
            type="button"
            className={`nation-chip${nation.id === nationalityId ? ' nation-chip-active' : ''}`}
            onClick={() => setNationalityId(nation.id)}
          >
            <NationFlag nationId={nation.id} size={18} title={`Bandeira de ${nation.name}`} />
            {nation.name}
          </button>
        ))}
      </div>

      </section>

      <section className="create-section">
        <h3 className="create-section-title">Atributos</h3>
      <span className="create-label">
        Distribua seus pontos — restam <strong className="create-points">{remaining}</strong>
      </span>
      <div className="create-attrs">
        {ATTRIBUTE_KEYS.map((key) => (
          <div key={key} className="create-attr-row">
            <span className="create-attr-name">{ATTRIBUTE_LABELS[key]}</span>
            <div className="create-attr-controls">
              <button
                type="button"
                className="attr-btn"
                onClick={() => bump(key, -1)}
                disabled={attributes[key] <= DEFAULT_ATTRIBUTES[key]}
                aria-label={`Diminuir ${ATTRIBUTE_LABELS[key]}`}
              >
                <Minus size={13} />
              </button>
              <span className="create-attr-value">{attributes[key]}</span>
              <button
                type="button"
                className="attr-btn"
                onClick={() => bump(key, 1)}
                disabled={remaining <= 0 || attributes[key] >= MAX_ATTR_LEVEL}
                aria-label={`Aumentar ${ATTRIBUTE_LABELS[key]}`}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {fieldError('attributes') && <span className="create-error">{fieldError('attributes')}</span>}

      </section>

      <section className="create-section">
      {sessionEmail !== null && (
        <p className="muted">Conta conectada: <strong>{sessionEmail}</strong></p>
      )}

      {sessionEmail === null && (
      <>
      <h3 className="create-section-title">Sua conta</h3>
      <div className="create-grid">
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
          {fieldError('email') && <span className="create-error">{fieldError('email')}</span>}
        </label>
        <label className="create-field">
          <span className="create-label">Nome de usuário (único)</span>
          <input
            className="create-input"
            type="text"
            value={username}
            autoComplete="username"
            placeholder="craque_10"
            onChange={(event) => setUsername(event.target.value)}
          />
          {fieldError('username') && <span className="create-error">{fieldError('username')}</span>}
        </label>
        <label className="create-field">
          <span className="create-label">Senha</span>
          <input
            className="create-input"
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
          {fieldError('password') && <span className="create-error">{fieldError('password')}</span>}
        </label>
        <label className="create-field">
          <span className="create-label">Confirmar senha</span>
          <input
            className="create-input"
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {fieldError('confirmPassword') && <span className="create-error">{fieldError('confirmPassword')}</span>}
        </label>
      </div>
      </>
      )}
      </section>

      {serverError && <p className="crest-error" role="alert">{serverError}</p>}

      <button className="btn" disabled={isSubmitting} onClick={() => void submit()}>
        {isSubmitting ? 'Criando…' : 'Começar a carreira ▸'}
      </button>
    </div>
  )
}
