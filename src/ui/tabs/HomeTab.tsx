import { PartyPopper, Play, Trophy, TrendingDown, TrendingUp, X } from 'lucide-react'
import type { Club } from '../../data/clubs'
import { nationById } from '../../data/nations'
import { DIVISION_NAMES, divisionOf } from '../../engine/pyramid/pyramid'
import { isSeasonOver, tablePosition } from '../../engine/season/season'
import {
  playerTournamentOpponentId,
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
}

const ordinal = (position: number): string => `${position}º`

const STAGE_LABEL: Record<string, string> = {
  groups: 'Fase de grupos',
  semi: 'SEMIFINAL',
  final: 'FINAL',
}

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
}: HomeTabProps) => {
  const [isCelebrating, setCelebrating] = useState(false)
  const seasonOver = isSeasonOver(save.season)
  const position = tablePosition(save.season, save.clubId)
  const divisionName = DIVISION_NAMES[divisionOf(save.divisions, save.clubId)] ?? 'Liga'
  const nation = nationById(save.nationalityId)
  const tournament = save.tournament
  const tournamentActive =
    tournament && (tournament.stage === 'groups' || tournament.stage === 'semi' || tournament.stage === 'final')
  const tournamentDone =
    tournament && (tournament.stage === 'champion' || tournament.stage === 'eliminated')
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
      <p className="muted">
        Fala, <strong>{save.playerName}</strong> — {club.nickname} conta com você.
        {save.season.currentRound > 0 && <> Vocês estão em <strong>{ordinal(position)}</strong>.</>}
      </p>

      {callUpAvailable && nation && !tournament && seasonOver && (
        <div className="card callup-card">
          <Trophy size={20} aria-hidden="true" />
          <div>
            <strong>CONVOCADO!</strong>
            <p className="muted callup-text">
              Dezembro chegou e a sua fase convenceu: {nation.name} te chamou para a{' '}
              {TOURNAMENT_NAMES[tournamentKindForYear(save.careerYear, nation.confederation)]}.
            </p>
          </div>
          <button
            className="btn callup-btn"
            onClick={() => onStartTournament(tournamentKindForYear(save.careerYear, nation.confederation))}
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
          {tournament && !tournamentDone ? (
            <p className="muted callup-text">Termine a copa de seleções para virar o ano.</p>
          ) : callUpAvailable ? null : (
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
        nextOpponent && (
          <div className="card next-match">
            <span className="card-label">Rodada {save.season.currentRound + 1} · próximo jogo</span>
            <div className="next-match-clubs">
              <span className="next-club">
                <ClubCrest club={club} customUrl={save.customClubCrests[club.id]} size={30} />
                {club.name}
              </span>
              <span className="next-vs">×</span>
              <span className="next-club">
                {nextOpponent.name}
                <ClubCrest club={nextOpponent} customUrl={save.customClubCrests[nextOpponent.id]} size={30} />
              </span>
            </div>
            <p className="next-meta">{nextOpponent.city}</p>
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
      )}

      <div className="training-row">
        <button className="btn btn-secondary" onClick={onTraining}>Treino de finalização</button>
        <button className="btn btn-secondary" onClick={onGkTraining}>Treino de goleiro</button>
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
