import { ArrowLeftRight, Camera, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CLUBS, clubById, type Club } from '../../data/clubs'
import { rivalSquadFor } from '../../engine/market/aiTransfers'
import { DIVISION_NAMES, divisionOf } from '../../engine/pyramid/pyramid'
import { tablePosition } from '../../engine/season/season'
import {
  lineupRating,
  overallAt,
  positionFit,
  squadPlayersFor,
  userAsSquadPlayer,
  USER_PLAYER_ID,
  USER_SQUAD_INDEX,
  type SquadPlayer,
} from '../../engine/squad/players'
import { squadWithSignings } from '../../engine/market/market'
import { myTeamRating } from '../../engine/squad/myTeam'
import { FORMATION_IDS, FORMATIONS, formationIdFor } from '../../engine/squad/formation'
import {
  clubDisplayName,
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
import { FormationBoard } from '../FormationBoard'
import { TrophyRoom } from '../TrophyRoom'
import { OverallStars } from '../OverallStars'
import { ovrClass, PlayerCardModal } from '../PlayerCard'
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

type TeamSection = 'clube' | 'elenco' | 'trofeus' | 'editor'

export const TeamTab = ({ save, club, onSaveChange }: TeamTabProps) => {
  const userPortrait = usePlayerPortrait(save.appearance)
  const wins = save.career.wins
  const goals = save.career.goals
  const [section, setSection] = useState<TeamSection>('clube')
  const [crestError, setCrestError] = useState<string | null>(null)
  const [squadClubId, setSquadClubId] = useState(save.clubId)
  const [squadDivision, setSquadDivision] = useState<'all' | number>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer | null>(null)
  // modo troca: slot do titular saindo (só no MEU time)
  const [swapSlot, setSwapSlot] = useState<number | null>(null)

  const squadClubBase = clubById(squadClubId) ?? club
  const squadClub = displayClub(save, squadClubBase)
  const isMyClub = squadClub.id === save.clubId
  const squad = useMemo(() => {
    const generated = squadPlayersFor(squadClub, save.careerYear)
    if (squadClub.id !== save.clubId) {
      return rivalSquadFor(squadClub, divisionOf(save.divisions, squadClub.id), save.careerYear)
    }
    const base = squadWithSignings(generated, save.signings, save.careerYear)
    // o SEU craque entra com atributos reais; os demais ganham o batismo local
    return base.map((player, index) =>
      index === USER_SQUAD_INDEX
        ? {
            ...userAsSquadPlayer(player, save.playerName, save.attributes, save.playerPosition),
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
  const starters = isMyClub ? save.lineup : squad.slice(0, 11).map((_, index) => index)
  const bench = squad
    .map((_, index) => index)
    .filter((index) => !starters.includes(index))

  return (
    <div className="tab-panel">
      <div className="subtabs" role="tablist" aria-label="Seções do time">
        {([['clube', 'Meu clube'], ['elenco', 'Elenco'], ['trofeus', 'Troféus'], ['editor', 'Editor de clubes']] as const).map(([id, label]) => (
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
      <div className="card team-card">
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
      </div>

      <div className="card">
        <span className="card-label campaign-label">Sua campanha pelo clube</span>
        <div className="stat-grid">
          <div className="stat"><span className="stat-value">{save.career.games}</span><span className="stat-label">jogos</span></div>
          <div className="stat"><span className="stat-value">{wins}</span><span className="stat-label">vitórias</span></div>
          <div className="stat"><span className="stat-value">{goals}</span><span className="stat-label">gols seus</span></div>
          <div className="stat"><span className="stat-value">{averageRating(save)}</span><span className="stat-label">nota média</span></div>
        </div>
      </div>
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
                setSwapSlot(null)
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
                setSwapSlot(null)
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
        {isMyClub && (
          <div className="squad-coach-bar">
            <label className="squad-formation-pick">
              <span className="create-label">Formação</span>
              <select
                className="squad-select"
                value={save.formation}
                aria-label="Escolher formação tática"
                onChange={(event) => {
                  setSwapSlot(null)
                  onSaveChange(setFormation(save, event.target.value as typeof FORMATION_IDS[number]))
                }}
              >
                {FORMATION_IDS.map((id) => (
                  <option key={id} value={id}>{FORMATIONS[id].label}</option>
                ))}
              </select>
            </label>
            {swapSlot !== null && (
              <p className="squad-swap-hint" role="status">
                Escolha quem fica no lugar de{' '}
                <strong>{squad[starters[swapSlot]]?.name}</strong>
                {' '}— outro titular (trocam de posição) ou alguém do banco
                <button className="banner-close" onClick={() => setSwapSlot(null)} aria-label="Cancelar troca">
                  <X size={13} />
                </button>
              </p>
            )}
          </div>
        )}
        {!isMyClub && (
          <div className="squad-coach-bar">
            <p className="muted">
              Esquema do adversário: <strong>{formation.label}</strong>
            </p>
          </div>
        )}
        <div className="squad-layout">
        <div className="squad-board-holder">
          <FormationBoard
            formation={formation}
            players={starters.map((squadIndex) => squad[squadIndex])}
            userSlot={isMyClub ? starters.indexOf(USER_SQUAD_INDEX) : -1}
            primaryColor={squadClub.colors.primary}
            onSelect={setSelectedPlayer}
          />
        </div>
        <div className="squad-list">
          {starters.map((squadIndex, slot) => {
            const player = squad[squadIndex]
            if (!player) return null
            const isUser = isMyClub && squadIndex === USER_SQUAD_INDEX
            const isSigning = newSigningIds.has(player.id)
            const slotPosition = isMyClub ? formation.slots[slot] : player.position
            const fit = positionFit(player, slotPosition)
            const effective = overallAt(player, slotPosition)
            // com uma troca aberta, os OUTROS titulares também são alvo: dá
            // para inverter dois jogadores de posição sem passar pelo banco
            const isSwapTarget = isMyClub && swapSlot !== null && swapSlot !== slot && !isUser
            const pickForSwap = (): void => {
              if (isSwapTarget && swapSlot !== null) {
                onSaveChange(swapLineup(save, swapSlot, squadIndex))
                setSwapSlot(null)
                return
              }
              setSelectedPlayer(player)
            }
            return (
              <div
                key={player.id}
                className={`squad-row${isUser ? ' squad-row-user' : ''}${isSigning ? ' squad-row-signing' : ''}${swapSlot === slot ? ' squad-row-swapping' : ''}${isSwapTarget ? ' squad-row-target' : ''}`}
                role="button"
                tabIndex={0}
                onClick={pickForSwap}
                onKeyDown={(event) => { if (event.key === 'Enter') pickForSwap() }}
              >
                <span className="squad-shirt">{player.shirt}</span>
                <span className={`squad-pos${fit === 'improvisado' ? ' pos-wrong' : fit === 'secundaria' ? ' pos-alt' : ''}`}>
                  {slotPosition}
                </span>
                <span className="squad-name">
                  {player.name}{isUser ? ' — você' : ''}
                  {isSigning && <span className="signing-tag">reforço</span>}
                  {fit === 'improvisado' && (
                    <span className="pos-wrong-tag" title={`Fora de posição (é ${player.position})`}>
                      fora de posição
                    </span>
                  )}
                </span>
                <span className="squad-age">{player.age} anos</span>
                <span className={`squad-ovr ${fit === 'improvisado' ? 'ovr-wrong' : ovrClass(effective)}`}>
                  {effective}
                </span>
                {isMyClub && !isUser && (
                  <button
                    className="squad-swap-btn"
                    title="Trocar este titular"
                    aria-label={`Trocar ${player.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSwapSlot(swapSlot === slot ? null : slot)
                    }}
                  >
                    <ArrowLeftRight size={13} />
                  </button>
                )}
              </div>
            )
          })}
          {bench.map((squadIndex, benchRow) => {
            const player = squad[squadIndex]
            if (!player) return null
            const isTarget = isMyClub && swapSlot !== null
            const isSigning = newSigningIds.has(player.id)
            return (
              <div
                key={player.id}
                className={`squad-row${benchRow === 0 ? ' squad-row-bench' : ''}${isSigning ? ' squad-row-signing' : ''}${isTarget ? ' squad-row-target' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (isTarget && swapSlot !== null) {
                    onSaveChange(swapLineup(save, swapSlot, squadIndex))
                    setSwapSlot(null)
                    return
                  }
                  setSelectedPlayer(player)
                }}
                onKeyDown={(event) => { if (event.key === 'Enter') setSelectedPlayer(player) }}
              >
                <span className="squad-shirt">{player.shirt}</span>
                <span className="squad-pos">{player.position}</span>
                <span className="squad-name">
                  {player.name}
                  {isSigning && <span className="signing-tag">reforço</span>}
                </span>
                <span className="squad-age">{player.age} anos</span>
                <span className={`squad-ovr ${ovrClass(player.overall)}`}>{player.overall}</span>
              </div>
            )
          })}
        </div>
        </div>
        <p className="muted table-note">
          {isMyClub
            ? 'Você é o técnico: escolha a formação e use as setas para trocar titulares pelo banco.'
            : 'Titulares em cima, banco embaixo.'}
        </p>
      </div>
      )}

      {section === 'trofeus' && <TrophyRoom trophies={save.trophies} />}

      {section === 'editor' && (
      <div className="card card-wide">
        <span className="card-label">Editor de clubes</span>
        <p className="muted table-note">
          Renomeie qualquer clube da liga do seu jeito e clique no escudo
          (ícone da câmera) para enviar o seu próprio (PNG/JPG). Tudo vale só no
          SEU jogo (fica no seu save). Apague o texto para voltar ao nome original.
        </p>
        {crestError && <p className="crest-error" role="alert">{crestError}</p>}
        <div className="club-edit-list">
        {CLUBS.map((entry) => (
          <label key={entry.id} className="club-edit-row">
            <span className="crest-upload" title={`Clique para enviar o escudo de ${entry.name} (só no seu jogo)`}>
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
            </span>
            <span className="club-edit-original">{entry.name}</span>
            <span className="club-color-pick" title="Cores do clube (só no seu jogo)">
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
            <input
              className="create-input club-edit-input"
              type="text"
              maxLength={MAX_CLUB_NAME}
              placeholder={entry.name}
              defaultValue={save.customClubNames[entry.id] ?? ''}
              aria-label={`Renomear ${entry.name}`}
              onBlur={(event) => onSaveChange(renameClub(save, entry.id, event.target.value))}
            />
          </label>
        ))}
        </div>
      </div>
      )}

      {selectedPlayer && (
        <PlayerCardModal
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
