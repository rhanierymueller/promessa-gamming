import { Camera } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CLUBS, clubById, type Club } from '../../data/clubs'
import { rivalSquadFor } from '../../engine/market/aiTransfers'
import { DIVISION_NAMES, divisionOf } from '../../engine/pyramid/pyramid'
import { tablePosition } from '../../engine/season/season'
import {
  lineupRating,
  squadPlayersFor,
  userAsSquadPlayer,
  USER_PLAYER_ID,
  USER_SQUAD_INDEX,
  type SquadPlayer,
} from '../../engine/squad/players'
import { squadWithSignings } from '../../engine/market/market'
import { myTeamRating } from '../../engine/squad/myTeam'
import { FORMATIONS, formationIdFor } from '../../engine/squad/formation'
import {
  clubDisplayName,
  currentPlayerAge,
  displayClub,
  MAX_CLUB_NAME,
  renameClub,
  setClubColors,
  setClubCrest,
  setFormation,
  setPlayerName,
  swapLineup,
  type PlayerSave,
} from '../../state/save'
import { ClubCrest, fileToCrestDataUrl } from '../ClubCrest'
import { SquadBoard } from '../SquadBoard'
import { TrophyRoom } from '../TrophyRoom'
import { OverallStars } from '../OverallStars'
import { PlayerCardModal } from '../PlayerCard'
import { usePlayerPortrait } from '../usePlayerPortrait'

interface TeamTabProps {
  readonly save: PlayerSave
  readonly club: Club
  readonly onSaveChange: (save: PlayerSave) => void
}

const averageRating = (save: PlayerSave): string => {
  if (save.career.games === 0) return '—'
  return (save.career.ratingSum / save.career.games).toFixed(1)
}

type TeamSection = 'clube' | 'elenco' | 'editor'

export const TeamTab = ({ save, club, onSaveChange }: TeamTabProps) => {
  const userPortrait = usePlayerPortrait(save.appearance)
  const wins = save.career.wins
  const goals = save.career.goals
  const [section, setSection] = useState<TeamSection>('clube')
  const [crestError, setCrestError] = useState<string | null>(null)
  const [squadClubId, setSquadClubId] = useState(save.clubId)
  const [squadDivision, setSquadDivision] = useState<'all' | number>('all')
  // o editor lista as 4 divisões inteiras: sem recorte viram 56 clubes soltos
  const [editorDivision, setEditorDivision] = useState<number>(() => divisionOf(save.divisions, save.clubId))
  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer | null>(null)
  // modo troca: slot do titular saindo (só no MEU time)

  const squadClubBase = clubById(squadClubId) ?? club
  const editorClubs = useMemo(
    () => CLUBS.filter((entry) => divisionOf(save.divisions, entry.id) === editorDivision),
    [save.divisions, editorDivision],
  )
  const squadClub = displayClub(save, squadClubBase)
  const isMyClub = squadClub.id === save.clubId
  const squad = useMemo(() => {
    const generated = squadPlayersFor(squadClub, save.careerYear, save.appearance.gender)
    if (squadClub.id !== save.clubId) {
      return rivalSquadFor(squadClub, divisionOf(save.divisions, squadClub.id), save.careerYear, save.appearance.gender)
    }
    const base = squadWithSignings(generated, save.signings, save.careerYear)
    // o SEU craque entra com atributos reais; os demais ganham o batismo local
    return base.map((player, index) =>
      index === USER_SQUAD_INDEX
        ? {
            ...userAsSquadPlayer(player, save.playerName, save.attributes, save.playerPosition, currentPlayerAge(save)),
            shirt: save.shirtNumber,
          }
        : save.customPlayerNames[player.id]
          ? { ...player, name: save.customPlayerNames[player.id] }
          : player,
    )
  }, [squadClub, save.careerYear, save.clubId, save.divisions, save.playerName, save.attributes, save.shirtNumber, save.playerPosition, save.customPlayerNames, save.signings])

  // a etiqueta REFORÇO só vale na temporada da chegada
  const newSigningIds = useMemo(
    () =>
      new Set(
        save.signings
          .filter((signing) => signing.boughtYear === save.careerYear)
          .map((signing) => signing.id),
      ),
    [save.signings, save.careerYear],
  )

  // no seu time você escolhe; cada rival joga no esquema próprio dele
  const formation = isMyClub ? FORMATIONS[save.formation] : FORMATIONS[formationIdFor(squadClub.id)]
  const starters: readonly number[] = isMyClub
    ? save.lineup
    : squad.slice(0, 11).map((_, index) => index)

  return (
    <div className="tab-panel">
      <div className="subtabs" role="tablist" aria-label="Seções do time">
        {([['clube', 'Meu clube'], ['elenco', 'Elenco'], ['editor', 'Editor de clubes']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            className={`subtab${section === id ? ' subtab-active' : ''}`}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'clube' && (
      <>
      <div className="card card-wide team-card">
        <div className="team-banner" style={{ background: `linear-gradient(120deg, ${club.colors.primary}, ${club.colors.secondary})` }} />
        <div className="team-crest-holder">
          <ClubCrest club={club} customUrl={save.customClubCrests[club.id]} size={52} />
        </div>
        <h2 className="team-name">{club.name}</h2>
        <p className="muted">“{club.nickname}” · {club.city}</p>
        <p className="team-strength">
          <OverallStars overall={myTeamRating(save, club)} size={15} />
          <span className="team-rating">força {myTeamRating(save, club)}</span>
        </p>
        {save.season.currentRound > 0 && (
          <p className="muted">{tablePosition(save.season, save.clubId)}º na {DIVISION_NAMES[divisionOf(save.divisions, save.clubId)]}</p>
        )}

        {/* a campanha vive no mesmo card: dois painéis para o mesmo assunto
            deixavam metade da tela vazia no computador */}
        <div className="stat-grid team-campaign">
          <div className="stat"><span className="stat-value">{save.career.games}</span><span className="stat-label">jogos</span></div>
          <div className="stat"><span className="stat-value">{wins}</span><span className="stat-label">vitórias</span></div>
          <div className="stat"><span className="stat-value">{goals}</span><span className="stat-label">gols seus</span></div>
          <div className="stat"><span className="stat-value">{averageRating(save)}</span><span className="stat-label">nota média</span></div>
        </div>
      </div>

      <TrophyRoom trophies={save.trophies} />
      </>
      )}

      {section === 'elenco' && (
      <div className="card card-wide">
        <div className="squad-header">
          <span className="card-label">
            Elenco · força{' '}
            <strong className="squad-strength">
              {lineupRating(starters.map((index) => squad[index]), formation.slots)}
            </strong>
          </span>
          <span className="squad-club-pick">
            <select
              className="squad-select squad-division-select"
              value={String(squadDivision)}
              aria-label="Filtrar clubes por divisão"
              onChange={(event) => {
                const value = event.target.value
                const division = value === 'all' ? 'all' : Number(value)
                setSquadDivision(division)
                if (division !== 'all' && divisionOf(save.divisions, squadClubId) !== division) {
                  setSquadClubId(save.divisions[division][0])
                }
              }}
            >
              <option value="all">Todas as divisões</option>
              {DIVISION_NAMES.map((name, division) => (
                <option key={name} value={division}>{name}</option>
              ))}
            </select>
            <ClubCrest club={squadClub} customUrl={save.customClubCrests[squadClub.id]} size={20} />
            <select
              className="squad-select"
              value={squadClubId}
              aria-label="Escolher clube do elenco"
              onChange={(event) => {
                setSquadClubId(event.target.value)
              }}
            >
              {(squadDivision === 'all' ? [0, 1, 2, 3] : [squadDivision]).map((division) => (
                <optgroup key={division} label={DIVISION_NAMES[division]}>
                  {save.divisions[division].map((clubId) => (
                    <option key={clubId} value={clubId}>
                      {clubDisplayName(save, clubId)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </span>
        </div>
        <SquadBoard
          squad={squad}
          formation={isMyClub ? save.formation : formationIdFor(squadClub.id)}
          lineup={isMyClub ? save.lineup : starters}
          userIndex={isMyClub ? USER_SQUAD_INDEX : -1}
          primaryColor={squadClub.colors.primary}
          editable={isMyClub}
          onFormationChange={(id) => onSaveChange(setFormation(save, id))}
          onSwap={(slot, squadIndex) => onSaveChange(swapLineup(save, slot, squadIndex))}
          onSelect={setSelectedPlayer}
          signingIds={newSigningIds}
        />

        <p className="muted table-note">
          {isMyClub
            ? 'Você é o técnico: escolha a formação e use as setas para trocar titulares pelo banco.'
            : 'Titulares em cima, banco embaixo.'}
        </p>
      </div>
      )}


      {section === 'editor' && (
      <div className="card card-wide">
        <span className="card-label">Editor de clubes</span>
        <p className="muted table-note">
          Deixe a liga com a sua cara: troque nome, escudo e cores de qualquer
          clube. Vale só no SEU jogo. Apague o nome para voltar ao original.
        </p>
        {crestError && <p className="crest-error" role="alert">{crestError}</p>}
        <div className="editor-divisions" role="tablist" aria-label="Divisão a editar">
          {[0, 1, 2, 3].map((division) => (
            <button
              key={division}
              type="button"
              role="tab"
              aria-selected={editorDivision === division}
              className={`editor-division${editorDivision === division ? ' editor-division-active' : ''}`}
              onClick={() => setEditorDivision(division)}
            >
              {DIVISION_NAMES[division]}
            </button>
          ))}
        </div>
        <div className="club-edit-list">
        {editorClubs.map((entry) => (
          <div key={entry.id} className="club-edit-row">
            <label className="crest-upload" title={`Clique para enviar o escudo de ${entry.name}`}>
              <ClubCrest club={displayClub(save, entry)} customUrl={save.customClubCrests[entry.id]} size={26} />
              <span className="crest-upload-badge" aria-hidden="true"><Camera size={10} /></span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label={`Enviar escudo para ${entry.name}`}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                    setCrestError('Formato não aceito — envie PNG, JPG ou WebP.')
                    return
                  }
                  if (file.size > 4 * 1024 * 1024) {
                    setCrestError('Imagem grande demais — máximo 4MB.')
                    return
                  }
                  void fileToCrestDataUrl(file)
                    .then((dataUrl) => {
                      setCrestError(null)
                      onSaveChange(setClubCrest(save, entry.id, dataUrl))
                    })
                    .catch(() => setCrestError(`Não deu para usar essa imagem em ${entry.name}. Tente um PNG ou JPG.`))
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
              <span className="club-edit-original">
                {save.customClubNames[entry.id] ? entry.name : `${entry.city} · ${entry.abbr}`}
              </span>
            </div>
            <span className="club-color-pick" title="Cores do clube">
              <input
                type="color"
                className="club-color-input"
                aria-label={`Cor principal de ${entry.name}`}
                value={displayClub(save, entry).colors.primary}
                onChange={(event) =>
                  onSaveChange(setClubColors(save, entry.id, event.target.value, displayClub(save, entry).colors.secondary))
                }
              />
              <input
                type="color"
                className="club-color-input"
                aria-label={`Cor secundária de ${entry.name}`}
                value={displayClub(save, entry).colors.secondary}
                onChange={(event) =>
                  onSaveChange(setClubColors(save, entry.id, displayClub(save, entry).colors.primary, event.target.value))
                }
              />
            </span>
          </div>
        ))}
        </div>
      </div>
      )}

      {selectedPlayer && (
        <PlayerCardModal
          gender={save.appearance.gender}
          player={selectedPlayer}
          clubName={clubDisplayName(save, squadClub.id)}
          isUser={selectedPlayer.id === USER_PLAYER_ID}
          userFaceUrl={selectedPlayer.id === USER_PLAYER_ID ? userPortrait : null}
          renameState={
            !isMyClub || selectedPlayer.id === USER_PLAYER_ID
              ? null
              : save.customPlayerNames[selectedPlayer.id] !== undefined
                ? 'usado'
                : 'livre'
          }
          onRename={(name) => {
            onSaveChange(setPlayerName(save, selectedPlayer.id, name))
            setSelectedPlayer(null)
          }}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  )
}
