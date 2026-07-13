import { useState } from 'react'
import { CLUBS } from '../data/clubs'
import { NATIONS } from '../data/nations'
import { createSave, MAX_PLAYER_NAME, type PlayerSave } from '../state/save'

interface CharacterCreateProps {
  readonly onCreated: (save: PlayerSave) => void
}

export const CharacterCreate = ({ onCreated }: CharacterCreateProps) => {
  const [name, setName] = useState('')
  const [clubId, setClubId] = useState<string>(CLUBS[0].id)
  const [nationalityId, setNationalityId] = useState<string>(NATIONS[0].id)

  const submit = (): void => {
    const save = createSave(name, clubId, nationalityId)
    if (save) onCreated(save)
  }

  const canSubmit = name.trim().length > 0

  return (
    <div className="create">
      <h2 className="create-title">Crie a sua promessa</h2>

      <label className="create-field">
        <span className="create-label">Nome do craque</span>
        <input
          className="create-input"
          type="text"
          value={name}
          maxLength={MAX_PLAYER_NAME}
          placeholder="Como a torcida vai te chamar?"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') submit() }}
        />
      </label>

      <span className="create-label">Sua nacionalidade (seleção que pode te convocar)</span>
      <div className="create-nations">
        {NATIONS.map((nation) => (
          <button
            key={nation.id}
            className={`nation-chip${nation.id === nationalityId ? ' nation-chip-active' : ''}`}
            onClick={() => setNationalityId(nation.id)}
          >
            <span
              className="club-dot"
              style={{ background: nation.colors.primary }}
              aria-hidden="true"
            />
            {nation.name}
          </button>
        ))}
      </div>

      <span className="create-label">Seu clube</span>
      <div className="create-clubs">
        {CLUBS.map((club) => (
          <button
            key={club.id}
            className={`club-card${club.id === clubId ? ' club-card-active' : ''}`}
            onClick={() => setClubId(club.id)}
          >
            <span className="club-colors" aria-hidden="true">
              <span style={{ background: club.colors.primary }} />
              <span style={{ background: club.colors.secondary }} />
            </span>
            <span className="club-name">{club.name}</span>
            <span className="club-city">{club.city}</span>
          </button>
        ))}
      </div>

      <button className="btn" disabled={!canSubmit} onClick={submit}>
        Começar a carreira ▸
      </button>
    </div>
  )
}
