import portraitUrl from '../../assets/sprites/s_portrait.png'
import type { Club } from '../../data/clubs'
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  canUpgrade,
  MAX_ATTRIBUTE,
  upgradeCost,
} from '../../engine/career/attributes'
import { CELEBRATION_NAMES, CELEBRATION_URLS } from '../../game/assets'
import { setCelebration, setShirtNumber, trainAttribute, type PlayerSave } from '../../state/save'

interface ProfileTabProps {
  readonly save: PlayerSave
  readonly club: Club
  readonly onSaveChange: (save: PlayerSave) => void
  readonly onResetCareer: () => void
}

const ATTRIBUTE_HINTS: Record<string, string> = {
  finalizacao: 'chute mais preciso',
  passe: 'passes com mais chance',
  cobranca: 'barreira pula menos',
  defesa: 'luva mais comprida',
}

export const ProfileTab = ({ save, club, onSaveChange, onResetCareer }: ProfileTabProps) => {
  const confirmReset = (): void => {
    if (window.confirm('Recomeçar a carreira apaga seu histórico. Tem certeza?')) {
      onResetCareer()
    }
  }

  return (
    <div className="tab-panel">
      <div className="card profile-card">
        <img className="profile-portrait" src={portraitUrl} alt={`Retrato de ${save.playerName}`} />
        <div className="profile-info">
          <h2 className="profile-name">{save.playerName}</h2>
          <p className="muted">Atacante · {club.name}</p>
          <label className="profile-shirt">
            <span className="create-label">Camisa</span>
            <input
              className="create-input profile-shirt-input"
              type="number"
              min={1}
              max={99}
              value={save.shirtNumber}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (Number.isFinite(value)) onSaveChange(setShirtNumber(save, value))
              }}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <div className="attr-header">
          <span className="card-label">Atributos</span>
          <span className="attr-points">{save.trainingPoints} pts de treino</span>
        </div>
        {ATTRIBUTE_KEYS.map((key) => {
          const level = save.attributes[key]
          const cost = upgradeCost(level)
          const affordable = canUpgrade(save.attributes, key, save.trainingPoints)
          return (
            <div key={key} className="attr-row">
              <div className="attr-info">
                <span className="attr-name">{ATTRIBUTE_LABELS[key]}</span>
                <span className="attr-hint">{ATTRIBUTE_HINTS[key]}</span>
              </div>
              <div className="attr-bar" aria-label={`${ATTRIBUTE_LABELS[key]} nível ${level} de ${MAX_ATTRIBUTE}`}>
                {Array.from({ length: MAX_ATTRIBUTE }, (_, i) => (
                  <span key={i} className={`attr-pip${i < level ? ' attr-pip-on' : ''}`} />
                ))}
              </div>
              <button
                className="btn attr-btn"
                disabled={!affordable}
                onClick={() => onSaveChange(trainAttribute(save, key))}
              >
                {level >= MAX_ATTRIBUTE ? 'MAX' : `+1 (${cost}pt)`}
              </button>
            </div>
          )
        })}
        <p className="muted table-note">Pontos vêm das suas notas: 8.0+ rende 3, 6.5+ rende 2, 5.0+ rende 1.</p>
      </div>

      <div className="card">
        <span className="card-label">Comemoração</span>
        <p className="muted table-note">Como você celebra os seus gols.</p>
        <div className="celebration-grid" role="radiogroup" aria-label="Escolha de comemoração">
          {CELEBRATION_URLS.map((url, index) => {
            const isActive = save.celebrationId === index
            return (
              <button
                key={url}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`celebration-option${isActive ? ' celebration-active' : ''}`}
                onClick={() => onSaveChange(setCelebration(save, index))}
              >
                <img src={url} alt={CELEBRATION_NAMES[index]} />
                <span>{CELEBRATION_NAMES[index]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <button className="btn btn-danger" onClick={confirmReset}>Recomeçar carreira</button>
    </div>
  )
}
