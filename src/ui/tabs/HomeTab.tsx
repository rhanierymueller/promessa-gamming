import { Flame, PartyPopper, Play, Sparkles, Trophy, TrendingDown, TrendingUp, X } from 'lucide-react'
import { clubById, type Club } from '../../data/clubs'
import { nationAsClub, nationById } from '../../data/nations'
import { nationOf } from '../../engine/libertados/draw'
import { isTournamentRunning, seasonEndAction } from '../../engine/career/seasonEnd'
import { eventById } from '../../engine/career/events'
import { PERK_OFFER_REASON, perkById, type PerkId } from '../../engine/career/perks'
import { DIVISION_NAMES, divisionOf } from '../../engine/pyramid/pyramid'
import { isSeasonOver, playerFixture, tablePosition } from '../../engine/season/season'
import {
  playerTournamentOpponentId,
  STAGE_NAMES,
  TOURNAMENT_NAMES,
  tournamentKindForYear,
  type TournamentKind,
} from '../../engine/tournament/tournament'
import { nextFixture } from '../../engine/career/nextFixture'
import {
  isLibertadosRunning,
  LIBERTADOS_NAME,
  STAGE_NAMES as LIBERTADOS_STAGE_NAMES,
} from '../../engine/libertados/types'
import {
  playerFixture as libertadosPlayerFixture,
  playerOpponentId as libertadosOpponentId,
} from '../../engine/libertados/fixtures'
import { useState } from 'react'
import treinoChute from '../../assets/backgrounds/gramado.jpg'
import treinoGoleiro from '../../assets/backgrounds/estadio-medio.jpg'
import treinoDado from '../../assets/backgrounds/varzea.jpg'
import treinoFalta from '../../assets/backgrounds/estadio.jpg'
import trophySerieA from '../../assets/trophies/serie-a.png'
import trophySerieB from '../../assets/trophies/serie-b.png'
import trophySerieC from '../../assets/trophies/serie-c.png'
import trophySerieD from '../../assets/trophies/serie-d.png'
import { titlePrizeFor, formatMoney } from '../../engine/market/market'
import { myTeamSectors, opponentSectors } from '../../engine/squad/myTeam'
import { SectorBars } from '../SectorBars'
import { continentalTitleYears, displayClub, type PlayerSave } from '../../state/save'
import { ClubCrest } from '../ClubCrest'
import { usePlayerPortrait } from '../usePlayerPortrait'
import { NewsCarousel } from '../NewsCarousel'
import '../styles/libertados.css'

interface HomeTabProps {
  readonly save: PlayerSave
  readonly club: Club
  readonly nextOpponent: Club | null
  readonly callUpAvailable: boolean
  readonly onPlayMatch: () => void
  readonly onStartTournament: (kind: TournamentKind) => void
  readonly onPlayTournamentMatch: () => void
  readonly onDismissTournament: () => void
  readonly onPlayLibertadosMatch: () => void
  readonly onDismissLibertados: () => void
  readonly onNewSeason: () => void
  readonly onDismissMovement: () => void
  readonly onTraining: () => void
  readonly onGkTraining: () => void
  readonly onFreeKickTraining: () => void
  readonly onDiceTraining: () => void
  readonly onChoosePerk: (perkId: PerkId) => void
  readonly onResolveEvent: (optionIndex: number) => void
  readonly onDismissEventNote: () => void
}

const ordinal = (position: number): string => `${position}º`

/** País do clube, para o card de Copa dizer de onde vem o adversário. */
const countryNameOf = (clubId: string): string =>
  nationById(nationOf(clubId))?.name ?? ''

// STAGE_NAMES cobre todas as fases, inclusive oitavas e quartas — a lista
// local ficava desatualizada a cada mudança de formato
const STAGE_LABEL = STAGE_NAMES

export const HomeTab = ({
  save,
  club,
  nextOpponent,
  callUpAvailable,
  onPlayMatch,
  onStartTournament,
  onPlayTournamentMatch,
  onDismissTournament,
  onPlayLibertadosMatch,
  onDismissLibertados,
  onNewSeason,
  onDismissMovement,
  onTraining,
  onGkTraining,
  onFreeKickTraining,
  onDiceTraining,
  onChoosePerk,
  onResolveEvent,
  onDismissEventNote,
}: HomeTabProps) => {
  const [isCelebrating, setCelebrating] = useState(false)
  const avatarUrl = usePlayerPortrait(save.appearance)
  const seasonOver = isSeasonOver(save.season)
  const position = tablePosition(save.season, save.clubId)
  const divisionName = DIVISION_NAMES[divisionOf(save.divisions, save.clubId)] ?? 'Liga'
  const nation = nationById(save.nationalityId)
  // null em ano sem competição de seleção — aí não há convocação
  const callUpKind = nation ? tournamentKindForYear(save.careerYear, nation.confederation) : null
  const tournament = save.tournament
  // isTournamentRunning cobre oitavas e quartas: a lista fixa antiga não as
  // tinha, e o jogo da seleção sumia da tela no meio da Copa
  const tournamentActive = tournament !== null && isTournamentRunning(tournament.stage)
  const tournamentDone = tournament !== null && !isTournamentRunning(tournament.stage)
  const endAction = seasonEndAction({
    eligible: callUpAvailable,
    hasTournamentThisYear: callUpKind !== null,
    stage: tournament?.stage ?? null,
  })
  const tournamentOpponent = tournamentActive
    ? nationById(playerTournamentOpponentId(tournament) ?? '')
    : null

  const libertados = save.libertados
  const libertadosActive = libertados !== null && isLibertadosRunning(libertados.stage)
  const libertadosDone = libertados !== null && !isLibertadosRunning(libertados.stage)
  const libertadosRivalBase = libertadosActive ? clubById(libertadosOpponentId(libertados) ?? '') : null
  const libertadosRival = libertadosRivalBase ? displayClub(save, libertadosRivalBase) : null
  // com duas competições, quem joga primeiro é quem tem a data mais próxima
  const upNext = nextFixture(save)?.kind ?? 'liga'
  // a Copa toma o card do próximo jogo quando é ela que vem primeiro na data
  const isCupNext = upNext === 'libertados' && libertadosActive && libertadosRival !== null
  // a seleção vem depois de tudo, em dezembro: enquanto ela roda, é ela o jogo
  const nationRival = tournamentOpponent ? nationAsClub(tournamentOpponent) : null
  const isNationalNext = tournamentActive && nationRival !== null && nation !== null

  return (
    <div className="tab-panel">
      {save.divisionMovement === 'up' && (
        <div className="division-banner division-up">
          <TrendingUp size={16} aria-hidden="true" />
          <span className="division-banner-text">ACESSO! Seu clube subiu para a {divisionName}!</span>
          <button className="banner-close" onClick={onDismissMovement} aria-label="Fechar aviso">
            <X size={14} />
          </button>
        </div>
      )}
      {save.divisionMovement === 'down' && (
        <div className="division-banner division-down">
          <TrendingDown size={16} aria-hidden="true" />
          <span className="division-banner-text">Rebaixado… esta temporada é na {divisionName}. Hora da volta por cima.</span>
          <button className="banner-close" onClick={onDismissMovement} aria-label="Fechar aviso">
            <X size={14} />
          </button>
        </div>
      )}
      <div className="hero-bar">
        <div className="hero-avatar">
          {avatarUrl ? (
            <img className="hero-avatar-img" src={avatarUrl} alt="" aria-hidden="true" />
          ) : (
            <ClubCrest club={club} customUrl={save.customClubCrests[club.id]} size={48} />
          )}
        </div>
        <div className="hero-id">
          <h2 className="hero-name">Fala, {save.playerName}</h2>
          <p className="muted hero-sub">
            {club.nickname} conta com você · {DIVISION_NAMES[divisionOf(save.divisions, save.clubId)]}
          </p>
        </div>
        <dl className="hero-stats">
          {save.season.currentRound > 0 && (
            <div className="hero-stat">
              <dt>Na tabela</dt>
              <dd>{ordinal(position)}</dd>
            </div>
          )}
          <div className="hero-stat">
            <dt>Moral</dt>
            <dd className={save.morale >= 65 ? 'hero-good' : save.morale <= 35 ? 'hero-bad' : ''}>
              <Flame size={13} aria-hidden="true" /> {save.morale}
            </dd>
          </div>
          <div className="hero-stat">
            <dt>Gols</dt>
            <dd>{save.career.goals}</dd>
          </div>
          <div className="hero-stat">
            <dt>Nota média</dt>
            <dd>
              {save.career.games > 0 ? (save.career.ratingSum / save.career.games).toFixed(1) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {save.eventNote && (
        <div className="division-banner event-note">
          <Sparkles size={16} aria-hidden="true" />
          <span className="division-banner-text">{save.eventNote}</span>
          <button className="banner-close" onClick={onDismissEventNote} aria-label="Fechar aviso">
            <X size={14} />
          </button>
        </div>
      )}

      {save.pendingEvent && (() => {
        const event = eventById(save.pendingEvent.templateId)
        if (!event) return null
        return (
          <div className="card perk-offer event-card">
            <div className="perk-offer-header">
              <Flame size={18} aria-hidden="true" />
              <div>
                <strong>VIDA DE CRAQUE</strong>
                <p className="muted perk-offer-reason">{event.prompt}</p>
              </div>
            </div>
            <div className="perk-options">
              {event.options.map((option, index) => (
                <button key={option.label} className="perk-option" onClick={() => onResolveEvent(index)}>
                  <span className="perk-name">{option.label}</span>
                  <span className={`perk-desc event-tone event-${option.tone}`}>
                    {option.tone}{option.chance < 1 ? ` · ${Math.round(option.chance * 100)}%` : ' · garantido'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {save.perkOffer && (
        <div className="card perk-offer">
          <div className="perk-offer-header">
            <Sparkles size={18} aria-hidden="true" />
            <div>
              <strong>NOVA HABILIDADE!</strong>
              <p className="muted perk-offer-reason">{PERK_OFFER_REASON} Escolha UMA — sem volta.</p>
            </div>
          </div>
          <div className="perk-options">
            {save.perkOffer.options.map((perkId) => {
              const perk = perkById(perkId)
              return (
                <button key={perkId} className="perk-option" onClick={() => onChoosePerk(perkId)}>
                  <span className="perk-name">{perk.name}</span>
                  <span className="perk-desc">{perk.description}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {endAction === 'callup' && nation && callUpKind && seasonOver && (
        <div className="card callup-card">
          <Trophy size={20} aria-hidden="true" />
          <div>
            <strong>CONVOCADO!</strong>
            <p className="muted callup-text">
              Dezembro chegou e a sua fase convenceu: {nation.name} te chamou para a{' '}
              {TOURNAMENT_NAMES[callUpKind]}.
            </p>
          </div>
          <button
            className="btn callup-btn"
            onClick={() => onStartTournament(callUpKind)}
          >
            Apresentar-se
          </button>
        </div>
      )}

      {libertadosDone && (
        <div className="card callup-card">
          <div>
            <strong>
              {libertados.stage === 'champion'
                ? `CAMPEÃO DA ${LIBERTADOS_NAME.toUpperCase()}!`
                : `Fim de linha na ${LIBERTADOS_NAME}.`}
            </strong>
            <p className="muted">
              {libertados.stage === 'champion'
                ? 'O continente é seu. A taça já está na estante.'
                : `Quem levou a taça foi ${clubById(libertados.championId ?? '')?.name ?? 'outro clube'}. Ano que vem tem mais.`}
            </p>
          </div>
          <button className="btn btn-secondary callup-btn" onClick={onDismissLibertados}>OK</button>
        </div>
      )}

      {tournamentDone && (
        <div className="card callup-card">
          <Trophy size={20} aria-hidden="true" />
          <div>
            <strong>
              {tournament.stage === 'champion'
                ? `CAMPEÃO DA ${TOURNAMENT_NAMES[tournament.kind].toUpperCase()}!`
                : `Fim de linha na ${TOURNAMENT_NAMES[tournament.kind]}.`}
            </strong>
            <p className="muted callup-text">
              {tournament.stage === 'champion'
                ? 'O país inteiro grita o seu nome.'
                : 'A seleção volta pra casa — e você, pro clube.'}
            </p>
          </div>
          <button className="btn btn-secondary callup-btn" onClick={onDismissTournament}>OK</button>
        </div>
      )}

      {/*
        * O balanço da temporada só entra quando não há mais nada a jogar: com
        * Copa ou seleção em andamento, o card do jogo tem a vez. Mostrar as
        * conquistas antes disso anunciava o fim do ano no meio de uma decisão.
        */}
      {seasonOver && !isCupNext && !isNationalNext ? (
        <div className="card next-match">
          <span className="card-label">Ano {save.careerYear} · temporada encerrada</span>
          <p className="season-final">
            {position === 1 ? 'CAMPEÃO! Que campanha histórica!' : `Vocês terminaram em ${ordinal(position)}.`}
          </p>
          {endAction === 'tournament' ? (
            <p className="muted callup-text">Termine a copa de seleções para virar o ano.</p>
          ) : endAction === 'callup' ? null : (
            <button
              className="btn btn-icon"
              onClick={() => {
                if (position === 1) setCelebrating(true)
                else onNewSeason()
              }}
            >
              <Play size={15} aria-hidden="true" /> Encerrar temporada e começar o ano {save.careerYear + 1}
            </button>
          )}
        </div>
      ) : (
        (isNationalNext ? nationRival : isCupNext ? libertadosRival : nextOpponent) && (() => {
          /*
           * Um card só para o próximo compromisso — liga, Libertados ou
           * seleção. Cada competição num card próprio deixava a tela com duas
           * partidas disponíveis ao mesmo tempo, sem dizer qual vinha primeiro.
           */
          const myTeam = isNationalNext && nation ? nationAsClub(nation) : club
          const rival = (isNationalNext ? nationRival : isCupNext ? libertadosRival : nextOpponent)!
          const cupFixture = isCupNext && libertados ? libertadosPlayerFixture(libertados) : null
          // jogo de seleção é em campo neutro: não há mando a anunciar
          const isHomeGame = isNationalNext
            ? true
            : cupFixture
              ? cupFixture.homeId === save.clubId
              : playerFixture(save.season, save.season.currentRound).homeId === save.clubId
          const homeClub = isHomeGame ? myTeam : rival
          const awayClub = isHomeGame ? rival : myTeam
          const libertadosLabel = libertados
            ? libertados.stage === 'groups'
              ? `jogo ${libertados.round + 1}/6 do grupo`
              : libertados.round === 0
                ? `${LIBERTADOS_STAGE_NAMES[libertados.stage]} · ida`
                : `${LIBERTADOS_STAGE_NAMES[libertados.stage]} · volta`
            : ''
          const label = isNationalNext && tournament
            ? `${TOURNAMENT_NAMES[tournament.kind]} · ${STAGE_LABEL[tournament.stage]}${
                tournament.stage === 'groups' ? ` · jogo ${tournament.round + 1}/3` : ''
              }`
            : isCupNext
              ? `${LIBERTADOS_NAME} · ${libertadosLabel}`
              : `Rodada ${save.season.currentRound + 1} · próximo jogo`
          const showCountry = isCupNext
          return (
          <div className={`card next-match${isCupNext || isNationalNext ? ' next-match-cup' : ''}`}>
            <span className="card-label">{label}</span>
            <div className="next-match-clubs">
              <span className="next-club">
                <ClubCrest club={homeClub} customUrl={save.customClubCrests[homeClub.id]} size={30} />
                <span className="next-club-id">
                  {homeClub.name}
                  {showCountry && (
                    <small className="next-club-nation">{countryNameOf(homeClub.id)}</small>
                  )}
                </span>
              </span>
              <span className="next-vs">×</span>
              <span className="next-club next-club-away">
                <span className="next-club-id">
                  {awayClub.name}
                  {showCountry && (
                    <small className="next-club-nation">{countryNameOf(awayClub.id)}</small>
                  )}
                </span>
                <ClubCrest club={awayClub} customUrl={save.customClubCrests[awayClub.id]} size={30} />
              </span>
            </div>
            <p className="next-meta">
              {isNationalNext
                ? 'Campo neutro · decide quem chega mais inteiro'
                : `${homeClub.city} · ${isHomeGame ? 'em casa' : 'fora de casa'}`}
            </p>
            <SectorBars
              mine={myTeamSectors(save, club)}
              theirs={opponentSectors(
                rival,
                save.careerYear,
                // seleção e clube continental jogam no topo do país deles
                isCupNext || isNationalNext ? 0 : divisionOf(save.divisions, rival.id),
                save.appearance.gender,
                continentalTitleYears(save, rival.id),
              )}
              myAbbr={myTeam.abbr}
              theirAbbr={rival.abbr}
            />
            <button
              className="btn btn-icon"
              onClick={
                isNationalNext
                  ? onPlayTournamentMatch
                  : isCupNext
                    ? onPlayLibertadosMatch
                    : onPlayMatch
              }
            >
              <Play size={15} aria-hidden="true" /> Jogar partida
            </button>
          </div>
          )
        })()
      )}

      <div className="training-section card-wide">
        <span className="card-label">Treinamento</span>
        <div className="training-row">
          {([
            { url: treinoChute, label: 'Finalização', hint: 'Chutes a gol', onClick: onTraining },
            { url: treinoFalta, label: 'Falta', hint: 'Por cima da barreira', onClick: onFreeKickTraining },
            { url: treinoGoleiro, label: 'Goleiro', hint: 'Defenda as cobranças', onClick: onGkTraining },
            { url: treinoDado, label: 'Lance decisivo', hint: 'A sorte nos dados', onClick: onDiceTraining },
          ] as const).map((modo) => (
            <button key={modo.label} className="training-card" onClick={modo.onClick}>
              <span
                className="training-art"
                style={{ backgroundImage: `url(${modo.url})` }}
                aria-hidden="true"
              />
              <strong className="training-name">{modo.label}</strong>
              <span className="training-hint">{modo.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <NewsCarousel save={save} club={club} />

      {isCelebrating && (
        <div className="champion-overlay" role="dialog" aria-modal="true" aria-label="Campeão da temporada">
          <div className="champion-box">
            <PartyPopper size={26} aria-hidden="true" className="champion-pop" />
            <h2 className="champion-title">
              CAMPEÃO DA {DIVISION_NAMES[divisionOf(save.divisions, save.clubId)].toUpperCase()}!
            </h2>
            <img
              className="champion-trophy"
              src={[trophySerieA, trophySerieB, trophySerieC, trophySerieD][divisionOf(save.divisions, save.clubId)]}
              alt="Troféu da divisão"
            />
            <p className="champion-team">{club.name} · ano {save.careerYear}</p>
            <p className="champion-prize">
              Prêmio: <strong>{formatMoney(titlePrizeFor(divisionOf(save.divisions, save.clubId)))}</strong> + taça na estante
            </p>
            <button
              className="btn"
              onClick={() => {
                setCelebrating(false)
                onNewSeason()
              }}
            >
              Levantar a taça e começar o ano {save.careerYear + 1} ▸
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
