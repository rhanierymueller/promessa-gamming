import { Trophy } from 'lucide-react'
import type { Club } from '../../data/clubs'
import { nationById } from '../../data/nations'
import { isSeasonOver, tablePosition } from '../../engine/season/season'
import {
  playerTournamentOpponentId,
  TOURNAMENT_NAMES,
  tournamentKindForYear,
  type TournamentKind,
} from '../../engine/tournament/tournament'
import type { PlayerSave } from '../../state/save'
import { Stars } from '../Stars'

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
  readonly onTraining: () => void
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
  onTraining,
}: HomeTabProps) => {
  const seasonOver = isSeasonOver(save.season)
  const position = tablePosition(save.season, save.clubId)
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
                ? `🏆 CAMPEÃO DA ${TOURNAMENT_NAMES[tournament.kind].toUpperCase()}!`
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
            {position === 1 ? '🏆 CAMPEÃO! Que campanha histórica!' : `Vocês terminaram em ${ordinal(position)}.`}
          </p>
          {!callUpAvailable && !tournament && (
            <p className="muted callup-text">A seleção não te chamou desta vez — jogue mais e melhor.</p>
          )}
          {(!tournament || tournamentDone) && !callUpAvailable && (
            <button className="btn" onClick={onNewSeason}>Começar ano {save.careerYear + 1} ▸</button>
          )}
        </div>
      ) : (
        nextOpponent && (
          <div className="card next-match">
            <span className="card-label">Rodada {save.season.currentRound + 1} · próximo jogo</span>
            <div className="next-match-clubs">
              <span className="next-club">
                <span className="club-dot" style={{ background: club.colors.primary }} aria-hidden="true" />
                {club.name}
              </span>
              <span className="next-vs">×</span>
              <span className="next-club">
                {nextOpponent.name}
                <span className="club-dot" style={{ background: nextOpponent.colors.primary }} aria-hidden="true" />
              </span>
            </div>
            <p className="next-meta">
              {nextOpponent.city} · <Stars strength={nextOpponent.strength} />
            </p>
            <button className="btn" onClick={onPlayMatch}>⚽ Jogar partida</button>
          </div>
        )
      )}

      <button className="btn btn-secondary" onClick={onTraining}>Treino de finalização</button>
    </div>
  )
}
