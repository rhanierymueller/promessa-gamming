import { useMemo, useState, type CSSProperties } from 'react'
import { clubById, type Club } from '../../data/clubs'
import '../styles/team.css'
import { rivalSquadFor } from '../../engine/market/aiTransfers'
import { DIVISION_NAMES, divisionOf } from '../../engine/pyramid/pyramid'
import { tablePosition } from '../../engine/season/season'
import {
  squadPlayersFor,
  userAsSquadPlayer,
  USER_PLAYER_ID,
  USER_SQUAD_INDEX,
  type SquadPlayer,
} from '../../engine/squad/players'
import { formatMoney, squadWithSignings } from '../../engine/market/market'
import { myTeamRating } from '../../engine/squad/myTeam'
import { FORMATIONS, formationIdFor } from '../../engine/squad/formation'
import {
  clubDisplayName,
  continentalTitleYears,
  currentPlayerAge,
  displayClub,
  setFormation,
  setPlayerName,
  playerSaleValue,
  sellPlayer,
  swapLineup,
  type PlayerSave,
} from '../../state/save'
import { ClubCrest } from '../ClubCrest'
import { bestLineup } from '../../engine/squad/bestLineup'
import { SquadBoard } from '../SquadBoard'
import { TrophyRoom } from '../TrophyRoom'
import { OverallStars } from '../OverallStars'
import { PlayerCardModal } from '../PlayerCard'
import { usePlayerPortrait } from '../usePlayerPortrait'
import { lineupStrength } from '../../engine/squad/teamStrength'

interface TeamTabProps {
  readonly save: PlayerSave
  readonly club: Club
  readonly onSaveChange: (save: PlayerSave) => void
}

const averageRating = (save: PlayerSave): string => {
  if (save.career.games === 0) return '—'
  return (save.career.ratingSum / save.career.games).toFixed(1)
}

type TeamSection = 'clube' | 'elenco'

export const TeamTab = ({ save, club, onSaveChange }: TeamTabProps) => {
  const userPortrait = usePlayerPortrait(save.appearance)
  const wins = save.career.wins
  const goals = save.career.goals
  const [section, setSection] = useState<TeamSection>('clube')
  const [squadClubId, setSquadClubId] = useState(save.clubId)
  const [squadDivision, setSquadDivision] = useState<'all' | number>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<SquadPlayer | null>(null)
  const [confirmingSale, setConfirmingSale] = useState<SquadPlayer | null>(null)
  const [saleNote, setSaleNote] = useState<string | null>(null)
  // modo troca: slot do titular saindo (só no MEU time)

  const squadClubBase = clubById(squadClubId) ?? club
  const squadClub = displayClub(save, squadClubBase)
  const isMyClub = squadClub.id === save.clubId
  const squad = useMemo(() => {
    const generated = squadPlayersFor(
      squadClub,
      save.careerYear,
      save.appearance.gender,
      divisionOf(save.divisions, squadClub.id),
    )
    if (squadClub.id !== save.clubId) {
      return rivalSquadFor(
        squadClub,
        divisionOf(save.divisions, squadClub.id),
        save.careerYear,
        save.appearance.gender,
        continentalTitleYears(save, squadClub.id),
      )
    }
    const base = squadWithSignings(
      generated,
      save.signings,
      save.careerYear,
      USER_SQUAD_INDEX,
      save.playerSales,
    )
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
  }, [squadClub, save.careerYear, save.clubId, save.divisions, save.appearance.gender, save.playerName, save.attributes, save.shirtNumber, save.playerPosition, save.customPlayerNames, save.signings, save.playerSales, save.continentalChampions])

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
  /* o rival não entra com os 11 primeiros da lista: o técnico dele escala o
     melhor time possível para o esquema, como qualquer um faria */
  const starters: readonly number[] = isMyClub
    ? save.lineup
    : bestLineup(squad, FORMATIONS[formationIdFor(squadClub.id)])
  const displayedStrength = lineupStrength(squad, starters, formation)

  const openSaleSlots = useMemo(
    () => new Set(
      save.playerSales
        .filter((sale) => sale.filledByPlayerId === undefined)
        .map((sale) => sale.slotIndex),
    ),
    [save.playerSales],
  )

  const confirmSale = (player: SquadPlayer): void => {
    const slotIndex = squad.findIndex((entry) => entry.id === player.id)
    if (slotIndex < 0) return
    const value = playerSaleValue(save, player)
    const updated = sellPlayer(save, player, slotIndex, squad)
    if (updated === save) return
    onSaveChange(updated)
    setConfirmingSale(null)
    setSelectedPlayer(null)
    setSaleNote(`${player.name} foi vendido por ${formatMoney(value)}. O valor já entrou na verba.`)
  }

  return (
    <div className="tab-panel">
      <div className="subtabs" role="tablist" aria-label="Seções do time">
        {([['clube', 'Meu clube'], ['elenco', 'Elenco']] as const).map(([id, label]) => (
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
        {/* as cores vão como variáveis: o desenho da faixa é decisão do CSS */}
        <div
          className="team-banner"
          style={{ '--club-a': club.colors.primary, '--club-b': club.colors.secondary } as CSSProperties}
        />
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
          <div className="stat"><span className="stat-value">{save.career.goalsAgainst ?? 0}</span><span className="stat-label">gols sofridos</span></div>
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
              {displayedStrength.overall}
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
          gender={save.appearance.gender}
          userFaceUrl={isMyClub ? userPortrait : null}
          primaryColor={squadClub.colors.primary}
          editable={isMyClub}
          onFormationChange={(id) => onSaveChange(setFormation(save, id))}
          onSwap={(slot, squadIndex) => onSaveChange(swapLineup(save, slot, squadIndex))}
          onSelect={setSelectedPlayer}
          signingIds={newSigningIds}
          hiddenSquadIndices={isMyClub ? openSaleSlots : undefined}
        />

        {saleNote && <p className="market-hired-note" role="status">{saleNote}</p>}

        <p className="muted table-note">
          {isMyClub
            ? 'Você é o técnico: escolha a formação e use as setas para trocar titulares pelo banco.'
            : 'Titulares em cima, banco embaixo.'}
        </p>
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
          footer={
            isMyClub && selectedPlayer.id !== USER_PLAYER_ID ? (
              <div className="player-sale-footer">
                <span className="player-sale-value">
                  Oferta: <strong>{formatMoney(playerSaleValue(save, selectedPlayer))}</strong>
                </span>
                <button
                  className="btn player-sale-btn"
                  onClick={() => {
                    setConfirmingSale(selectedPlayer)
                    setSelectedPlayer(null)
                  }}
                >
                  Vender jogador
                </button>
              </div>
            ) : undefined
          }
        />
      )}

      {confirmingSale && (
        <div className="sim-confirm player-sale-confirm" role="dialog" aria-modal="true" aria-labelledby="sale-confirm-title">
          <div className="sim-confirm-box">
            <h3 id="sale-confirm-title">Confirmar venda?</h3>
            <p>
              <strong>{confirmingSale.name}</strong> ({confirmingSale.position} · overall {confirmingSale.overall})
              {' '}será vendido por <strong>{formatMoney(playerSaleValue(save, confirmingSale))}</strong>.
              <br />
              Nova verba: <strong>{formatMoney(save.budget + playerSaleValue(save, confirmingSale))}</strong>.
              O jogador sairá do elenco e a vaga ficará livre para uma contratação.
            </p>
            <div className="sim-confirm-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmingSale(null)}>
                Cancelar
              </button>
              <button className="btn" onClick={() => confirmSale(confirmingSale)}>
                Confirmar venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
