import { Star } from 'lucide-react'
import type { Club } from '../data/clubs'
import { trainingPointsForRating } from '../engine/career/attributes'
import { displayRating } from '../engine/match/rating'
import type { BestPlayer } from '../engine/match/facts'
import type { MatchState } from '../engine/match/types'
import { ClubCrest } from '../ui/ClubCrest'
import type { LivePitchStats } from './LivePitch'

/**
 * Tela de fim de jogo.
 *
 * Saiu de `MatchScreen.tsx`, que passava de 1100 linhas. É puramente
 * apresentacional: recebe tudo pronto e não decide nada — quem calcula nota
 * final, melhor em campo e posse continua sendo a tela da partida.
 */

export type MatchOutcome = 'win' | 'draw' | 'loss'

export const OUTCOME_LABEL: Record<MatchOutcome, string> = {
  win: 'Vitória',
  draw: 'Empate',
  loss: 'Derrota',
}

const ratingVerdict = (rating: number): string => {
  if (rating >= 8.5) return 'Atuação de gala. A várzea tem um craque.'
  if (rating >= 7) return 'Grande jogo. O olheiro anotou seu nome.'
  if (rating >= 5.5) return 'Jogo honesto. Dá pra mais.'
  return 'Dia difícil. Amanhã tem treino.'
}

interface MatchSummaryProps {
  readonly club: Club
  readonly opponent: Club
  readonly crestUrls: Readonly<Record<string, string>>
  readonly match: MatchState
  readonly finalRating: number
  readonly outcome: MatchOutcome
  readonly bestPlayer: BestPlayer
  readonly possessionPct: number
  readonly liveStats: LivePitchStats
  readonly onContinue: () => void
}

export const MatchSummary = ({
  club,
  opponent,
  crestUrls,
  match,
  finalRating,
  outcome,
  bestPlayer,
  possessionPct,
  liveStats,
  onContinue,
}: MatchSummaryProps) => (
    <div className="match-summary">
      <div className="summary-content">
      <div className="summary-header">
        <h2>Fim de jogo</h2>
      </div>

      <div className="summary-scoreline">
        <span className="summary-side">
          <ClubCrest club={club} customUrl={crestUrls[club.id]} size={44} />
          <span className="summary-team">{club.abbr}</span>
        </span>
        <span className="summary-score">
          {match.score.team}
          <em>×</em>
          {match.score.opponent}
        </span>
        <span className="summary-side">
          <ClubCrest club={opponent} customUrl={crestUrls[opponent.id]} size={44} />
          <span className="summary-team">{opponent.abbr}</span>
        </span>
      </div>

      <span className={`summary-result summary-result-${outcome}`}>{OUTCOME_LABEL[outcome]}</span>


      <div className="match-rating">
        <span className="match-rating-value">{finalRating.toFixed(1)}</span>
        <span className="match-rating-label">sua nota</span>
      </div>
      <p className="match-verdict">“{ratingVerdict(finalRating)}”</p>

      <div className="facts-table">
        <div className="facts-row facts-head">
          <span>{club.abbr}</span>
          <span />
          <span>{opponent.abbr}</span>
        </div>
        <div className="facts-row">
          <span>{match.score.team}</span>
          <span>Gols</span>
          <span>{match.score.opponent}</span>
        </div>
        <div className="facts-row">
          <span>{possessionPct}%</span>
          <span>Posse de bola</span>
          <span>{100 - possessionPct}%</span>
        </div>
        <div className="facts-row">
          <span>{liveStats.teamShots}</span>
          <span>Finalizações</span>
          <span>{liveStats.oppShots}</span>
        </div>
        <div className="facts-row">
          <span>{liveStats.teamOnTarget}</span>
          <span>No gol</span>
          <span>{liveStats.oppOnTarget}</span>
        </div>
        <div className="facts-row">
          <span>
            {liveStats.teamShots > 0
              ? Math.round((liveStats.teamOnTarget / liveStats.teamShots) * 100)
              : 0}%
          </span>
          <span>Pontaria</span>
          <span>
            {liveStats.oppShots > 0
              ? Math.round((liveStats.oppOnTarget / liveStats.oppShots) * 100)
              : 0}%
          </span>
        </div>
        <div className="facts-row">
          <span>{Math.max(0, liveStats.oppOnTarget - match.score.opponent)}</span>
          <span>Defesas</span>
          <span>{Math.max(0, liveStats.teamOnTarget - match.score.team)}</span>
        </div>
      </div>

      <div className={`facts-motm${bestPlayer.isUser ? ' facts-motm-user' : ''}`}>
        <Star size={14} aria-hidden="true" /> Craque do jogo: <strong>{bestPlayer.name}</strong>
        {bestPlayer.isUser ? ' — você!' : ''}
      </div>

      <div className="summary-you">
        <span className="card-label">Seu jogo</span>
        <div className="stat-grid summary-you-grid">
          <div className="stat"><span className="stat-value">{match.stats.goals}</span><span className="stat-label">gols</span></div>
          <div className="stat"><span className="stat-value">{match.stats.shots}</span><span className="stat-label">finalizações</span></div>
          <div className="stat"><span className="stat-value">{match.stats.assists}</span><span className="stat-label">assistências</span></div>
          <div className="stat"><span className="stat-value">{match.stats.decisionsGood}/{match.stats.decisions}</span><span className="stat-label">decisões certas</span></div>
          <div className="stat">
            <span className="stat-value">
              {match.stats.golacos > 0 ? match.stats.golacos : displayRating(match.rating).toFixed(1)}
            </span>
            <span className="stat-label">{match.stats.golacos > 0 ? 'golaços' : 'nota'}</span>
          </div>
        </div>
      </div>

      {trainingPointsForRating(displayRating(match.rating)) > 0 && (
        <p className="match-training">
          +{trainingPointsForRating(displayRating(match.rating))} pontos de treino
        </p>
      )}

      <button className="btn summary-continue" onClick={onContinue}>Continuar ▸</button>
      </div>
    </div>
)
