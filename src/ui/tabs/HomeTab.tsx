import { Flame, PartyPopper, Play, Sparkles, Trophy, TrendingDown, TrendingUp, X } from 'lucide-react'
import type { Club } from '../../data/clubs'
import { nationById } from '../../data/nations'
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
import { useState } from 'react'
import trophySerieA from '../../assets/trophies/serie-a.png'
import trophySerieB from '../../assets/trophies/serie-b.png'
import trophySerieC from '../../assets/trophies/serie-c.png'
import trophySerieD from '../../assets/trophies/serie-d.png'
import { titlePrizeFor, formatMoney } from '../../engine/market/market'
import { myTeamRating, opponentTeamRating } from '../../engine/squad/myTeam'
import type { PlayerSave } from '../../state/save'
import { ClubCrest } from '../ClubCrest'
import { usePlayerPortrait } from '../usePlayerPortrait'
import { NewsCarousel } from '../NewsCarousel'

interface HomeTabProps {
  readonly save: PlayerSave
  readonly club: Club
  readonly nextOpponent: Club | null
  readonly callUpAvailable: boolean
  readonly onPlayMatch: () => void
  readonly onStartTournament: (kind: TournamentKind) => void
  readonly onPlayTournamentMatch: () => void
  readonly onDismissTournament: () => void
  readonly onNewSeason: () => void
  readonly onDismissMovement: () => void
  readonly onTraining: () => void
  readonly onGkTraining: () => void
  readonly onDiceTraining: () => void
  readonly onChoosePerk: (perkId: PerkId) => void
  readonly onResolveEvent: (optionIndex: number) => void
  readonly onDismissEventNote: () => void
}

const ordinal = (position: number): string => `${position}º`

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
  onNewSeason,
  onDismissMovement,
  onTraining,
  onGkTraining,
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

      {tournamentActive && tournamentOpponent && (
        <div className="card callup-card">
          <Trophy size={20} aria-hidden="true" />
          <div>
            <strong>{TOURNAMENT_NAMES[tournament.kind]} · {STAGE_LABEL[tournament.stage]}</strong>
            <p className="muted callup-text">
              {tournament.stage === 'groups' && `Jogo ${tournament.round + 1}/3 do grupo: `}
              {nation?.name} × {tournamentOpponent.name}
            </p>
          </div>
          <button className="btn callup-btn" onClick={onPlayTournamentMatch}>Jogar</button>
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

      {seasonOver ? (
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
        nextOpponent && (() => {
          const isHomeGame = playerFixture(save.season, save.season.currentRound).homeId === save.clubId
          const homeClub = isHomeGame ? club : nextOpponent
          const awayClub = isHomeGame ? nextOpponent : club
          return (
          <div className="card next-match">
            <span className="card-label">Rodada {save.season.currentRound + 1} · próximo jogo</span>
            <div className="next-match-clubs">
              <span className="next-club">
                <ClubCrest club={homeClub} customUrl={save.customClubCrests[homeClub.id]} size={30} />
                {homeClub.name}
              </span>
              <span className="next-vs">×</span>
              <span className="next-club">
                {awayClub.name}
                <ClubCrest club={awayClub} customUrl={save.customClubCrests[awayClub.id]} size={30} />
              </span>
            </div>
            <p className="next-meta">{homeClub.city} · {isHomeGame ? 'em casa' : 'fora de casa'}</p>
            <div className="power-compare" aria-label="Força dos elencos">
              <span className="power-label">Força dos elencos (overall médio dos 11)</span>
              <div className="power-row">
                <span className="power-value">{myTeamRating(save, club)}</span>
                <div className="power-bar">
                  <div
                    className="power-fill"
                    style={{
                      width: `${Math.round(
                        (myTeamRating(save, club) /
                          (myTeamRating(save, club) + opponentTeamRating(nextOpponent, save.careerYear, divisionOf(save.divisions, nextOpponent.id)))) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <span className="power-value power-value-opp">{opponentTeamRating(nextOpponent, save.careerYear, divisionOf(save.divisions, nextOpponent.id))}</span>
              </div>
            </div>
            <button className="btn btn-icon" onClick={onPlayMatch}><Play size={15} aria-hidden="true" /> Jogar partida</button>
          </div>
          )
        })()
      )}

      <div className="training-row">
        <button className="btn btn-secondary" onClick={onTraining}>Treino de finalização</button>
        <button className="btn btn-secondary" onClick={onGkTraining}>Treino de goleiro</button>
        <button className="btn btn-secondary" onClick={onDiceTraining}>Lance decisivo</button>
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
