import { useEffect, useMemo, useRef, useState } from 'react'
import type { Club } from '../data/clubs'
import {
  DEFENSE_RESULT_LINES,
  GOLACO_LINE,
  narrationForMoment,
  PASS_RESULT_LINES,
  SHOT_RESULT_LINES,
  WALL_BLOCK_LINE,
  withName,
} from '../data/narration'
import { createRng, type RngState } from '../engine/rng'
import { DEFAULT_MATCH_CONFIG } from '../engine/match/config'
import { matchConfigFor } from '../engine/match/difficulty'
import {
  advance,
  applyDefenseResult,
  applyPassResult,
  applyShotResult,
  currentMoment,
  isFinished,
  startMatch,
} from '../engine/match/match'
import { displayRating } from '../engine/match/rating'
import type { MatchState } from '../engine/match/types'
import type { PassResolution } from '../engine/pass/pass'
import type { Competition, MatchRecord } from '../state/save'
import { PassChallenge } from './PassChallenge'
import { ShotStage, type RoundSummary } from './ShotStage'

const FEED_DELAY_MS = 1400

type MatchMode = 'feed' | 'shot' | 'pass' | 'defense' | 'summary'

interface LogLine {
  readonly minute: number
  readonly text: string
  readonly tone: 'normal' | 'good' | 'bad' | 'you'
}

interface MatchScreenProps {
  readonly seed: number
  readonly playerName: string
  readonly club: Club
  readonly opponent: Club
  readonly competition?: Competition
  readonly onExit: (record: MatchRecord) => void
}

const ratingVerdict = (rating: number): string => {
  if (rating >= 8.5) return 'Atuação de gala. A várzea tem um craque.'
  if (rating >= 7) return 'Grande jogo. O olheiro anotou seu nome.'
  if (rating >= 5.5) return 'Jogo honesto. Dá pra mais.'
  return 'Dia difícil. Amanhã tem treino.'
}

export const MatchScreen = ({ seed, playerName, club, opponent, competition = 'liga', onExit }: MatchScreenProps) => {
  const config = useMemo(
    () => matchConfigFor(DEFAULT_MATCH_CONFIG, club.strength, opponent.strength),
    [club, opponent],
  )
  const [match, setMatch] = useState<MatchState>(() => startMatch(seed, config))
  const [mode, setMode] = useState<MatchMode>('feed')
  const [log, setLog] = useState<readonly LogLine[]>([])
  const passRngRef = useRef<RngState>(createRng((seed ^ 0x5bd1e995) >>> 0))
  const logEndRef = useRef<HTMLDivElement>(null)

  const pushLine = (line: LogLine): void => setLog((current) => [...current, line])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [log])

  useEffect(() => {
    if (mode !== 'feed') return
    if (isFinished(match)) {
      setMode('summary')
      return
    }
    const timer = setTimeout(() => {
      const moment = currentMoment(match)
      const tone =
        moment.kind === 'teamGoal' ? 'good'
        : moment.kind === 'opponentGoal' ? 'bad'
        : moment.kind === 'commentary' || moment.kind === 'kickoff' || moment.kind === 'fulltime' ? 'normal'
        : 'you'
      pushLine({ minute: moment.minute, text: narrationForMoment(moment), tone })

      if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') setMode('shot')
      else if (moment.kind === 'opponentFreeKick') setMode('defense')
      else if (moment.kind === 'playerPass') setMode('pass')
      else setMatch(advance(match))
    }, FEED_DELAY_MS)
    return () => clearTimeout(timer)
  }, [mode, match])

  const minute = isFinished(match) ? 90 : currentMoment(match).minute

  const onShotResolved = (summary: RoundSummary): void => {
    const moment = currentMoment(match)
    const isGoal = summary.lastOutcome === 'goal'
    pushLine({
      minute: moment.minute,
      text: withName(
        summary.lastBlocked
          ? WALL_BLOCK_LINE
          : isGoal && summary.lastGolaco
            ? GOLACO_LINE
            : SHOT_RESULT_LINES[summary.lastOutcome][0],
        playerName,
      ),
      tone: isGoal ? 'good' : 'bad',
    })
    setMatch(applyShotResult(match, summary.lastOutcome, summary.lastGolaco, config))
    setMode('feed')
  }

  const onPassResolved = (resolution: PassResolution, next: RngState, timedOut: boolean): void => {
    passRngRef.current = next
    const moment = currentMoment(match)
    pushLine({
      minute: moment.minute,
      text: timedOut
        ? PASS_RESULT_LINES.timeout[0]
        : resolution.completed
          ? PASS_RESULT_LINES.completed[0]
          : PASS_RESULT_LINES.failed[0],
      tone: resolution.completed ? 'good' : 'bad',
    })
    setMatch(applyPassResult(match, resolution.completed, resolution.ratingDelta, config))
    setMode('feed')
  }

  const onDefenseResolved = (summary: RoundSummary): void => {
    const moment = currentMoment(match)
    const saved = summary.lastOutcome === 'save'
    pushLine({
      minute: moment.minute,
      text: saved ? DEFENSE_RESULT_LINES.saved[0] : DEFENSE_RESULT_LINES.conceded[0],
      tone: saved ? 'good' : 'bad',
    })
    setMatch(applyDefenseResult(match, saved, config))
    setMode('feed')
  }

  const finishMatch = (): void => {
    onExit({
      opponentId: opponent.id,
      teamGoals: match.score.team,
      opponentGoals: match.score.opponent,
      rating: displayRating(match.rating),
      playerGoals: match.stats.goals,
      playedAt: Date.now(),
      competition,
    })
  }

  return (
    <div className="match">
      <div className="match-header">
        <span className="match-team">
          <span className="club-dot" style={{ background: club.colors.primary }} aria-hidden="true" />
          {club.abbr}
        </span>
        <span className="match-score">{match.score.team} × {match.score.opponent}</span>
        <span className="match-team">
          {opponent.abbr}
          <span className="club-dot" style={{ background: opponent.colors.primary }} aria-hidden="true" />
        </span>
        <span className="match-minute">{minute}&prime;</span>
      </div>

      {mode === 'shot' || mode === 'defense' ? (
        <ShotStage
          key={`lance-${match.cursor}`}
          shots={1}
          autoStart
          hideEndOverlay
          freeKick={mode === 'shot' && currentMoment(match).kind === 'playerFreeKick'}
          wallColor={opponent.colors.primary}
          defense={mode === 'defense' ? { skill: opponent.strength / 5, kitColor: opponent.colors.primary } : undefined}
          onRoundEnd={mode === 'defense' ? onDefenseResolved : onShotResolved}
        />
      ) : (
        <div className="match-log" role="log">
          {log.map((line, index) => (
            <p key={index} className={`log-line log-${line.tone}`}>
              <span className="log-minute">{line.minute}&prime;</span> {line.text}
            </p>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {mode === 'pass' && (
        <PassChallenge
          intro={narrationForMoment(currentMoment(match))}
          rng={passRngRef.current}
          onResolved={onPassResolved}
        />
      )}

      {mode === 'summary' && (
        <div className="match-summary">
          <h2>Fim de jogo</h2>
          <div className="match-final">{club.name} {match.score.team} × {match.score.opponent} {opponent.name}</div>
          <div className="match-rating">
            <span className="match-rating-value">{displayRating(match.rating).toFixed(1)}</span>
            <span className="match-rating-label">sua nota</span>
          </div>
          <p className="match-verdict">“{ratingVerdict(match.rating)}”</p>
          <p className="match-stats">
            {match.stats.goals} gol(s) em {match.stats.shots} finalizações
            {match.stats.golacos > 0 ? ` · ${match.stats.golacos} golaço(s)` : ''}
            {' · '}{match.stats.passesCompleted}/{match.stats.passes} passes certos
          </p>
          <button className="btn" onClick={finishMatch}>Voltar ao menu</button>
        </div>
      )}
    </div>
  )
}
