import { Minus, Plus, Stamp, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GateBackdrop } from './auth/GateBackdrop'
import { GateField } from './auth/GateField'
import './styles/create.css'
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
import { recordConsent } from '../state/consent'
import { Legal } from './Legal'
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
  // consentimento LIVRE: nasce desmarcado, ninguém aceita sem clicar
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showLegal, setShowLegal] = useState(false)
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
        consent: recordConsent(Date.now()),
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
    <div className="gate gate-tall">
      <GateBackdrop
        place="Portaria · inscrição"
        onBack={onBack}
        isBackDisabled={isSubmitting}
      />

      <div className="ficha">
        <header className="ficha-head">
          <div>
            <span className="ficha-org">Federação · temporada de estreia</span>
            <h1 className="ficha-title">Ficha de inscrição</h1>
          </div>
          <span className="ficha-num">
            Form. 01
            <br />
            Série D
          </span>
        </header>

        <section className="ficha-sec">
          <div className="ficha-sec-head">
            <span className="ficha-sec-num">01</span>
            <h2 className="ficha-sec-title">O atleta</h2>
          </div>
          <div className="ficha-grid">
            <GateField
              label="Nome do craque"
              value={playerName}
              onChange={setPlayerName}
              type="text"
              maxLength={MAX_PLAYER_NAME}
              placeholder="Como a torcida vai te chamar?"
              error={fieldError('playerName')}
            />
            <GateField
              label={`Idade (${PLAYER_MIN_AGE}-${PLAYER_MAX_AGE})`}
              value={playerAge}
              onChange={(value) => setPlayerAge(Number(value))}
              type="number"
              min={PLAYER_MIN_AGE}
              max={PLAYER_MAX_AGE}
              error={fieldError('playerAge')}
            />
          </div>
        </section>

        <section className="ficha-sec">
          <div className="ficha-sec-head">
            <span className="ficha-sec-num">02</span>
            <h2 className="ficha-sec-title">O clube</h2>
          </div>
          <GateField
            label="Nome do seu time (entra na Série D)"
            value={teamName}
            onChange={setTeamName}
            type="text"
            maxLength={MAX_CLUB_NAME}
            placeholder="Ex.: Galáticos FC"
            error={fieldError('teamName')}
          />
        </section>

        <section className="ficha-sec">
          <div className="ficha-sec-head">
            <span className="ficha-sec-num">03</span>
            <h2 className="ficha-sec-title">Em campo</h2>
          </div>

          <p className="ficha-hint">Sua posição — goleiro não, você é craque de linha.</p>
          <div className="ficha-chips">
            {POSITIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`ficha-chip${option.id === position ? ' ficha-chip-on' : ''}`}
                aria-pressed={option.id === position}
                onClick={() => setPosition(option.id)}
              >
                <strong>{option.id}</strong> {option.label}
              </button>
            ))}
          </div>

          <p className="ficha-hint" style={{ marginTop: 18 }}>Gênero</p>
          <div className="ficha-chips">
            {([['masculino', 'Masculino'], ['feminino', 'Feminino']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`ficha-chip${id === gender ? ' ficha-chip-on' : ''}`}
                aria-pressed={id === gender}
                onClick={() => setGender(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="ficha-warn">
            <TriangleAlert size={14} aria-hidden="true" />
            <span>
              Escolha com calma: o gênero <strong>não pode ser trocado depois</strong>. Ele define
              a arte do seu atleta, os nomes de todo o mundo do jogo e a narração das partidas.
            </span>
          </p>

          <p className="ficha-hint" style={{ marginTop: 18 }}>
            Nacionalidade — a seleção que pode te convocar.
          </p>
          <div className="ficha-chips">
            {PLAYABLE_NATIONS.map((nation) => (
              <button
                key={nation.id}
                type="button"
                className={`ficha-chip${nation.id === nationalityId ? ' ficha-chip-on' : ''}`}
                aria-pressed={nation.id === nationalityId}
                onClick={() => setNationalityId(nation.id)}
              >
                <NationFlag nationId={nation.id} size={16} title={`Bandeira de ${nation.name}`} />
                {nation.name}
              </button>
            ))}
          </div>
        </section>

        <section className="ficha-sec">
          <div className="ficha-sec-head">
            <span className="ficha-sec-num">04</span>
            <h2 className="ficha-sec-title">Atributos</h2>
          </div>

          <span className={`ficha-points${remaining === 0 ? ' ficha-points-zero' : ''}`}>
            restam <b>{remaining}</b> pontos
          </span>

          <div className="ficha-attrs">
            {ATTRIBUTE_KEYS.map((key) => (
              <div key={key} className="ficha-attr">
                <span className="ficha-attr-name">{ATTRIBUTE_LABELS[key]}</span>
                <span className="ficha-attr-lead" aria-hidden="true" />
                <span className="ficha-attr-ctl">
                  <button
                    type="button"
                    className="ficha-step"
                    onClick={() => bump(key, -1)}
                    disabled={attributes[key] <= DEFAULT_ATTRIBUTES[key]}
                    aria-label={`Diminuir ${ATTRIBUTE_LABELS[key]}`}
                  >
                    <Minus size={13} />
                  </button>
                  <span className="ficha-attr-val">{attributes[key]}</span>
                  <button
                    type="button"
                    className="ficha-step"
                    onClick={() => bump(key, 1)}
                    disabled={remaining <= 0 || attributes[key] >= MAX_ATTR_LEVEL}
                    aria-label={`Aumentar ${ATTRIBUTE_LABELS[key]}`}
                  >
                    <Plus size={13} />
                  </button>
                </span>
              </div>
            ))}
          </div>
          {fieldError('attributes') && (
            <span className="field-error">{fieldError('attributes')}</span>
          )}
        </section>

        <section className="ficha-sec">
          <div className="ficha-sec-head">
            <span className="ficha-sec-num">05</span>
            <h2 className="ficha-sec-title">Sua conta</h2>
          </div>

          {sessionEmail !== null ? (
            <p className="ficha-account">
              Conta já conectada: <strong>{sessionEmail}</strong>
            </p>
          ) : (
            <div className="ficha-grid ficha-grid-2">
              <GateField
                label="E-mail"
                value={email}
                onChange={setEmail}
                type="email"
                autoComplete="email"
                placeholder="voce@email.com"
                error={fieldError('email')}
              />
              <GateField
                label="Nome de usuário (único)"
                value={username}
                onChange={setUsername}
                type="text"
                autoComplete="username"
                placeholder="craque_10"
                error={fieldError('username')}
              />
              <GateField
                label="Senha"
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete="new-password"
                error={fieldError('password')}
              />
              <GateField
                label="Confirmar senha"
                value={confirmPassword}
                onChange={setConfirmPassword}
                type="password"
                autoComplete="new-password"
                error={fieldError('confirmPassword')}
              />
            </div>
          )}
        </section>

        <label className="ficha-consent">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
          />
          <span>
            Li e aceito os{' '}
            <button type="button" className="ficha-link" onClick={() => setShowLegal(true)}>
              termos de uso e a política de privacidade
            </button>
            .
          </span>
        </label>

        {showLegal && <Legal onClose={() => setShowLegal(false)} />}

        {serverError && <p className="gate-alert" role="alert">{serverError}</p>}

        <div className="ficha-actions">
          <button
            className="gate-btn"
            disabled={isSubmitting || !acceptedTerms}
            onClick={() => void submit()}
          >
            <Stamp size={15} aria-hidden="true" />
            {isSubmitting ? 'Registrando…' : 'Assinar e entrar em campo'}
          </button>
        </div>
      </div>
    </div>
  )
}
