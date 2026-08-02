import { Camera } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CLUBS } from '../../data/clubs'
import { DIVISION_NAMES, divisionOf } from '../../engine/pyramid/pyramid'
import {
  CLUB_ABBR_LENGTH,
  clubDisplayName,
  displayClub,
  MAX_CLUB_CITY,
  MAX_CLUB_NAME,
  renameClub,
  setClubAbbr,
  setClubCity,
  setClubColors,
  setClubCrest,
  type PlayerSave,
} from '../../state/save'
import { ClubCrest, fileToCrestDataUrl } from '../ClubCrest'

/**
 * Editor de clubes: nome, região, sigla, escudo e cores de qualquer time da
 * pirâmide.
 *
 * Morava como terceira seção da aba Time, escondido atrás de dois cliques —
 * e é justamente a ferramenta que o jogador usa para transformar a liga
 * fictícia nos times de verdade dele, coisa que se faz no começo da carreira
 * e depois quase nunca. Aba própria porque é destino, não sub-item.
 */

const MAX_CREST_BYTES = 4 * 1024 * 1024
const ACCEPTED_CREST_TYPES = ['image/png', 'image/jpeg', 'image/webp']

interface EditorTabProps {
  readonly save: PlayerSave
  readonly onSaveChange: (save: PlayerSave) => void
}

export const EditorTab = ({ save, onSaveChange }: EditorTabProps) => {
  const [crestError, setCrestError] = useState<string | null>(null)
  // abre na divisão do jogador: é onde ele quer mexer primeiro
  const [division, setDivision] = useState<number>(() => divisionOf(save.divisions, save.clubId))

  const clubs = useMemo(
    () => CLUBS.filter((entry) => divisionOf(save.divisions, entry.id) === division),
    [save.divisions, division],
  )

  return (
    <div className="tab-panel">
      <div className="card card-wide">
        <span className="card-label">Editor de clubes</span>
        <p className="muted table-note">
          Deixe a liga com a sua cara: nome, região, sigla, escudo e cores de
          qualquer clube. Vale só no SEU jogo — deixe o campo em branco para
          voltar ao original.
        </p>
        {crestError && <p className="crest-error" role="alert">{crestError}</p>}

        <div className="editor-divisions" role="tablist" aria-label="Divisão a editar">
          {[0, 1, 2, 3].map((entry) => (
            <button
              key={entry}
              type="button"
              role="tab"
              aria-selected={division === entry}
              className={`editor-division${division === entry ? ' editor-division-active' : ''}`}
              onClick={() => setDivision(entry)}
            >
              {DIVISION_NAMES[entry]}
            </button>
          ))}
        </div>

        <div className="club-edit-list">
          {clubs.map((entry) => (
            <div key={entry.id} className="club-edit-row">
              <label className="crest-upload" title={`Clique para enviar o escudo de ${entry.name}`}>
                <ClubCrest
                  club={displayClub(save, entry)}
                  customUrl={save.customClubCrests[entry.id]}
                  size={26}
                />
                <span className="crest-upload-badge" aria-hidden="true"><Camera size={10} /></span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label={`Enviar escudo para ${entry.name}`}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    if (!ACCEPTED_CREST_TYPES.includes(file.type)) {
                      setCrestError('Formato não aceito — envie PNG, JPG ou WebP.')
                      return
                    }
                    if (file.size > MAX_CREST_BYTES) {
                      setCrestError('Imagem grande demais — máximo 4MB.')
                      return
                    }
                    void fileToCrestDataUrl(file)
                      .then((dataUrl) => {
                        setCrestError(null)
                        onSaveChange(setClubCrest(save, entry.id, dataUrl))
                      })
                      .catch(() =>
                        setCrestError(
                          `Não deu para usar essa imagem em ${clubDisplayName(save, entry.id)}. Tente um PNG ou JPG.`,
                        ),
                      )
                  }}
                />
              </label>

              <div className="club-edit-fields">
                <input
                  className="create-input club-edit-input"
                  type="text"
                  maxLength={MAX_CLUB_NAME}
                  placeholder={entry.name}
                  defaultValue={save.customClubNames[entry.id] ?? ''}
                  aria-label={`Renomear ${entry.name}`}
                  onBlur={(event) => onSaveChange(renameClub(save, entry.id, event.target.value))}
                />
                {/* região e sigla dividem a linha de baixo: são campos curtos e
                    andam juntos na cabeça de quem está montando o time real */}
                <div className="club-edit-sub">
                  <input
                    className="create-input club-edit-city"
                    type="text"
                    maxLength={MAX_CLUB_CITY}
                    placeholder={entry.city}
                    defaultValue={save.customClubCities[entry.id] ?? ''}
                    aria-label={`Região de ${entry.name}`}
                    onBlur={(event) => onSaveChange(setClubCity(save, entry.id, event.target.value))}
                  />
                  <input
                    className="create-input club-edit-abbr"
                    type="text"
                    maxLength={CLUB_ABBR_LENGTH}
                    placeholder={entry.abbr}
                    defaultValue={save.customClubAbbrs[entry.id] ?? ''}
                    aria-label={`Sigla de ${entry.name} (${CLUB_ABBR_LENGTH} letras)`}
                    onBlur={(event) => onSaveChange(setClubAbbr(save, entry.id, event.target.value))}
                  />
                </div>
                {save.customClubNames[entry.id] && (
                  <span className="club-edit-original">{entry.name}</span>
                )}
              </div>

              <span className="club-color-pick" title="Cores do clube">
                <input
                  type="color"
                  className="club-color-input"
                  aria-label={`Cor principal de ${entry.name}`}
                  value={displayClub(save, entry).colors.primary}
                  onChange={(event) =>
                    onSaveChange(
                      setClubColors(
                        save,
                        entry.id,
                        event.target.value,
                        displayClub(save, entry).colors.secondary,
                      ),
                    )
                  }
                />
                <input
                  type="color"
                  className="club-color-input"
                  aria-label={`Cor secundária de ${entry.name}`}
                  value={displayClub(save, entry).colors.secondary}
                  onChange={(event) =>
                    onSaveChange(
                      setClubColors(
                        save,
                        entry.id,
                        displayClub(save, entry).colors.primary,
                        event.target.value,
                      ),
                    )
                  }
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
