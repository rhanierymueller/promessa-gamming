import { LogOut, Trash2 } from 'lucide-react'
import { TrophyRoom } from '../TrophyRoom'
import { useEffect, useRef, useState } from 'react'
import portraitUrl from '../../assets/sprites/s_portrait.png'
import portraitFUrl from '../../assets/sprites/f_portrait.png'
import type { Club } from '../../data/clubs'
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  canUpgrade,
  MAX_ATTRIBUTE,
  upgradeCost,
} from '../../engine/career/attributes'
import { applyAppearance, HAIR_COLORS, KIT_COLORS, SKIN_TONES } from '../../game/appearance'
import { celebrationUrlsFor } from '../../game/assets'
import { CELEBRATION_NAMES } from '../../game/assets'
import {
  setAppearance,
  setCelebration,
  setShirtNumber,
  trainAttribute,
  type PlayerAppearance,
  type PlayerSave,
} from '../../state/save'

/** Cores dos swatches quando o índice 0 mantém a arte original. */
const ORIGINAL_SKIN_SWATCH = '#C08850'
const ORIGINAL_HAIR_SWATCH = '#2A1E14'
const ORIGINAL_KIT_SWATCH = '#E0C000'

const swatchColor = (rgb: readonly [number, number, number] | null, fallback: string): string =>
  rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : fallback

/** Retrato do craque com a aparência aplicada em tempo real. */
const AppearancePortrait = ({ appearance }: { appearance: PlayerAppearance }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const holder = { img, w: img.naturalWidth, h: img.naturalHeight }
      const recolored = applyAppearance(holder, appearance)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(recolored?.img ?? img, 0, 0)
    }
    img.src = appearance.gender === 'feminino' ? portraitFUrl : portraitUrl
  }, [appearance])

  return <canvas ref={canvasRef} className="profile-portrait" aria-label="Retrato do craque" />
}

interface ProfileTabProps {
  readonly save: PlayerSave
  readonly club: Club
  readonly onSaveChange: (save: PlayerSave) => void
  readonly onResetCareer: () => void
  /** Sai para a landing (home) — o save continua guardado. */
  readonly onLogout: () => void
  /** Apaga conta online + carreira local. Retorna mensagem de erro ou null. */
  readonly onDeleteAccount: () => Promise<string | null>
}

const ATTRIBUTE_HINTS: Record<string, string> = {
  finalizacao: 'chute mais preciso',
  passe: 'passes com mais chance',
  cobranca: 'barreira pula menos',
  defesa: 'luva mais comprida',
}

export const ProfileTab = ({ save, club, onSaveChange, onResetCareer, onLogout, onDeleteAccount }: ProfileTabProps) => {
  const [isDeleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isBusy, setBusy] = useState(false)

  const confirmReset = (): void => {
    if (window.confirm('Recomeçar a carreira apaga seu histórico. Tem certeza?')) {
      onResetCareer()
    }
  }

  return (
    <div className="tab-panel">
      <div className="card profile-card">
        <AppearancePortrait appearance={save.appearance} />
        <div className="profile-info">
          <h2 className="profile-name">{save.playerName}</h2>
          <p className="muted">{save.playerPosition} · {save.playerAge} anos · {club.name}</p>
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
        <span className="card-label">Aparência</span>
        <div className="appearance-row">
          <span className="appearance-label">Pele</span>
          <div className="swatch-row" role="radiogroup" aria-label="Tom de pele">
            {SKIN_TONES.map((tone, index) => (
              <button
                key={tone.name}
                type="button"
                role="radio"
                aria-checked={save.appearance.skin === index}
                aria-label={tone.name}
                title={tone.name}
                className={`swatch${save.appearance.skin === index ? ' swatch-active' : ''}`}
                style={{ background: swatchColor(tone.rgb, ORIGINAL_SKIN_SWATCH) }}
                onClick={() => onSaveChange(setAppearance(save, { ...save.appearance, skin: index }))}
              />
            ))}
          </div>
        </div>
        <div className="appearance-row">
          <span className="appearance-label">Cabelo</span>
          <div className="swatch-row" role="radiogroup" aria-label="Cor de cabelo">
            {HAIR_COLORS.map((color, index) => (
              <button
                key={color.name}
                type="button"
                role="radio"
                aria-checked={save.appearance.hair === index}
                aria-label={color.name}
                title={color.name}
                className={`swatch${save.appearance.hair === index ? ' swatch-active' : ''}`}
                style={{ background: swatchColor(color.rgb, ORIGINAL_HAIR_SWATCH) }}
                onClick={() => onSaveChange(setAppearance(save, { ...save.appearance, hair: index }))}
              />
            ))}
          </div>
        </div>
        <div className="appearance-row">
          <span className="appearance-label">Uniforme</span>
          <div className="swatch-row" role="radiogroup" aria-label="Cor do uniforme">
            {KIT_COLORS.map((color, index) => (
              <button
                key={color.name}
                type="button"
                role="radio"
                aria-checked={save.appearance.kit === index}
                aria-label={color.name}
                title={color.name}
                className={`swatch${save.appearance.kit === index ? ' swatch-active' : ''}`}
                style={{ background: swatchColor(color.rgb, ORIGINAL_KIT_SWATCH) }}
                onClick={() => onSaveChange(setAppearance(save, { ...save.appearance, kit: index }))}
              />
            ))}
          </div>
        </div>
        <div className="appearance-row">
          <span className="appearance-label">Gênero</span>
          <div className="swatch-row">
            {(['masculino', 'feminino'] as const).map((gender) => (
              <button
                key={gender}
                type="button"
                className={`btn appearance-gender${save.appearance.gender === gender ? ' appearance-gender-active' : ''}`}
                onClick={() => onSaveChange(setAppearance(save, { ...save.appearance, gender }))}
              >
                {gender === 'masculino' ? 'Masculino' : 'Feminino'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <span className="card-label">Comemoração</span>
        <p className="muted table-note">Como você celebra os seus gols.</p>
        <div className="celebration-grid" role="radiogroup" aria-label="Escolha de comemoração">
          {celebrationUrlsFor(save.appearance.gender).map((url, index) => {
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

      <TrophyRoom trophies={save.trophies} />

      <button className="btn btn-secondary btn-icon" onClick={onLogout}>
        <LogOut size={15} aria-hidden="true" /> Sair
      </button>
      <button className="btn btn-danger" onClick={confirmReset}>Recomeçar carreira</button>
      <button className="btn btn-danger btn-icon" onClick={() => { setDeleteError(null); setDeleting(true) }}>
        <Trash2 size={15} aria-hidden="true" /> Excluir conta
      </button>

      {isDeleting && (
        <div className="sim-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="sim-confirm-box">
            <h3 id="delete-account-title">Excluir a conta?</h3>
            <p>
              Isso apaga a sua conta online (e-mail, usuário, ligas) e a carreira
              deste aparelho. <strong>Não tem volta.</strong>
            </p>
            {deleteError && <p className="crest-error" role="alert">{deleteError}</p>}
            <div className="sim-confirm-actions">
              <button className="btn btn-secondary" disabled={isBusy} onClick={() => setDeleting(false)}>
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                disabled={isBusy}
                onClick={() => {
                  setBusy(true)
                  void onDeleteAccount()
                    .then((message) => {
                      if (message) setDeleteError(message)
                      else setDeleting(false)
                    })
                    .finally(() => setBusy(false))
                }}
              >
                {isBusy ? 'Excluindo…' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
