import { Download, FileText, LogOut, RotateCcw, Trash2 } from 'lucide-react'
import '../styles/profile.css'
import { useEffect, useRef, useState } from 'react'
import { Legal } from '../Legal'
import portraitUrl from '../../assets/sprites/s_portrait.png'
import portraitFUrl from '../../assets/sprites/f_portrait.png'
import type { Club } from '../../data/clubs'
import { applyAppearance } from '../../game/appearance'
import {
  currentPlayerAge,
  setShirtNumber,
  type PlayerAppearance,
  type PlayerSave,
} from '../../state/save'

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

export const ProfileTab = ({ save, club, onSaveChange, onResetCareer, onLogout, onDeleteAccount }: ProfileTabProps) => {
  const { games, goals, wins, draws, ratingSum } = save.career
  const averageRating = games > 0 ? (ratingSum / games).toFixed(1) : '—'
  const goalsPerGame = games > 0 ? (goals / games).toFixed(2) : '—'
  // aproveitamento de pontos: 3 por vitória, 1 por empate (como na tabela)
  const winRate = games > 0 ? `${Math.round(((wins * 3 + draws) / (games * 3)) * 100)}%` : '—'
  const [isDeleting, setDeleting] = useState(false)
  const [showLegal, setShowLegal] = useState(false)
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
        <div className="profile-identity">
        <AppearancePortrait appearance={save.appearance} />
        <div className="profile-info">
          <h2 className="profile-name">{save.playerName}</h2>
          <p className="muted">{save.playerPosition} · {currentPlayerAge(save)} anos · {club.name}</p>
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

        <dl className="profile-career">
          <div className="stat"><dt className="stat-label">Gols na carreira</dt><dd className="stat-value">{save.career.goals}</dd></div>
          <div className="stat"><dt className="stat-label">Jogos</dt><dd className="stat-value">{save.career.games}</dd></div>
          <div className="stat"><dt className="stat-label">Gols por jogo</dt><dd className="stat-value">{goalsPerGame}</dd></div>
          <div className="stat"><dt className="stat-label">Nota média</dt><dd className="stat-value">{averageRating}</dd></div>
          <div className="stat"><dt className="stat-label">Vitórias</dt><dd className="stat-value">{save.career.wins}</dd></div>
          <div className="stat"><dt className="stat-label">Aproveitamento</dt><dd className="stat-value">{winRate}</dd></div>
          <div className="stat"><dt className="stat-label">Títulos</dt><dd className="stat-value">{save.trophies.length}</dd></div>
          <div className="stat"><dt className="stat-label">Temporadas</dt><dd className="stat-value">{save.careerYear}</dd></div>
        </dl>
      </div>

      <div className="card card-wide account-card">
        <span className="card-label">Conta e dados</span>
        <div className="account-actions">
          <button className="btn btn-secondary btn-icon" onClick={onLogout}>
            <LogOut size={15} aria-hidden="true" /> Sair
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => {
              /* portabilidade (LGPD): o save é tudo que guardamos sobre você */
              const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = 'promessa-meus-dados.json'
              link.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download size={15} aria-hidden="true" /> Baixar meus dados
          </button>
          <button className="btn btn-secondary btn-icon" onClick={() => setShowLegal(true)}>
            <FileText size={15} aria-hidden="true" /> Termos e privacidade
          </button>
        </div>

        {/* ações destrutivas separadas: nenhuma delas se clica sem querer */}
        <div className="danger-zone">
          <span className="danger-zone-title">Ações definitivas</span>
          <p className="muted danger-zone-note">
            Não dá para desfazer. Baixe seus dados antes, se quiser guardar.
          </p>
          <div className="account-actions">
            <button className="btn btn-danger btn-icon" onClick={confirmReset}>
              <RotateCcw size={15} aria-hidden="true" /> Recomeçar carreira
            </button>
            <button
              className="btn btn-danger btn-icon"
              onClick={() => { setDeleteError(null); setDeleting(true) }}
            >
              <Trash2 size={15} aria-hidden="true" /> Excluir conta
            </button>
          </div>
        </div>
      </div>

      {showLegal && <Legal onClose={() => setShowLegal(false)} />}

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
