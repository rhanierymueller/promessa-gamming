import portraitUrl from '../../assets/sprites/s_portrait.png'
import type { Club } from '../../data/clubs'
import { setShirtNumber, type PlayerSave } from '../../state/save'

interface ProfileTabProps {
  readonly save: PlayerSave
  readonly club: Club
  readonly onSaveChange: (save: PlayerSave) => void
  readonly onResetCareer: () => void
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

      <p className="muted menu-note">
        Personalização do avatar (aparência, comemorações) entra junto com a Fase 2.
      </p>

      <button className="btn btn-danger" onClick={confirmReset}>Recomeçar carreira</button>
    </div>
  )
}
