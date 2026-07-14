import { useEffect, useMemo, useRef, useState } from 'react'
import type { Club } from '../data/clubs'
import {
  DEFAULT_ATTRIBUTES,
  trainingPointsForRating,
  type PlayerAttributes,
} from '../engine/career/attributes'
import {
  DEFENSE_RESULT_LINES,
  GOLACO_LINE,
  narrationForMoment,
  PASS_RESULT_LINES,
  SHOT_RESULT_LINES,
  TACTIC_LINES,
  WALL_BLOCK_LINE,
  withName,
} from '../data/narration'
import { createRng, type RngState } from '../engine/rng'
import { DEFAULT_MATCH_CONFIG } from '../engine/match/config'
import { matchConfigFor } from '../engine/match/difficulty'
import {
  advance,
  advanceAuto,
  applyDefenseResult,
  applyExtraGoal,
  applyPassResult,
  applyShotResult,
  currentMoment,
  isFinished,
  isPlayerMoment,
  startMatch,
} from '../engine/match/match'
import { buildMatchFacts } from '../engine/match/facts'
import { displayRating } from '../engine/match/rating'
import { rollAutoGoal, rollMicroGoal, TACTIC_LABELS, type Tactic } from '../engine/match/tactics'
import type { MatchState } from '../engine/match/types'
import type { PassResolution } from '../engine/pass/pass'
import { squadFor } from '../data/squadNames'
import type { Competition, MatchRecord } from '../state/save'
import { LivePitch, USER_FORMATION_INDEX, type PitchDirective } from './LivePitch'
import { PassChallenge } from './PassChallenge'
import { ShotStage, type RoundSummary } from './ShotStage'

/** Minutos de jogo por segundo real, na velocidade 1x. */
const MINUTES_PER_SECOND = 0.9
const TICK_MS = 100
const MICRO_EVERY_MINUTES = 2.4
const SPEEDS = [1, 2, 4] as const

type MatchMode = 'live' | 'handoff' | 'shot' | 'pass' | 'defense' | 'summary'

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
  readonly attributes?: PlayerAttributes
  /** Comemoração escolhida no Perfil (índice em celeb_0..3). */
  readonly celebrationId?: number
  readonly onExit: (record: MatchRecord) => void
}

/** Goleiro por competição: liga = muito bom, copa = elite (escala com as estrelas do rival). */
const KEEPER_QUALITY_LIGA = 0.55
const KEEPER_QUALITY_COPA = 0.65
const KEEPER_QUALITY_PER_STAR = 0.03

const keeperQualityFor = (competition: Competition, opponentStrength: number): number =>
  (competition === 'selecao' ? KEEPER_QUALITY_COPA : KEEPER_QUALITY_LIGA) +
  opponentStrength * KEEPER_QUALITY_PER_STAR

const ratingVerdict = (rating: number): string => {
  if (rating >= 8.5) return 'Atuação de gala. A várzea tem um craque.'
  if (rating >= 7) return 'Grande jogo. O olheiro anotou seu nome.'
  if (rating >= 5.5) return 'Jogo honesto. Dá pra mais.'
  return 'Dia difícil. Amanhã tem treino.'
}

export const MatchScreen = ({
  seed,
  playerName,
  club,
  opponent,
  competition = 'liga',
  attributes = DEFAULT_ATTRIBUTES,
  celebrationId = 0,
  onExit,
}: MatchScreenProps) => {
  const config = useMemo(
    () => matchConfigFor(DEFAULT_MATCH_CONFIG, club.strength, opponent.strength),
    [club, opponent],
  )
  const [match, setMatch] = useState<MatchState>(() => startMatch(seed, config))
  const [mode, setMode] = useState<MatchMode>('live')
  const [clock, setClock] = useState(0)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [tactic, setTactic] = useState<Tactic>('equilibrado')
  const [log, setLog] = useState<readonly LogLine[]>([])
  const [directive, setDirective] = useState<PitchDirective | null>(null)

  const teamSquad = useMemo(() => {
    const names = [...squadFor(`${club.id}-${seed}`, 11)]
    names[USER_FORMATION_INDEX] = playerName
    return names
  }, [club.id, seed, playerName])
  const opponentSquad = useMemo(() => squadFor(`${opponent.id}-${seed}`, 11), [opponent.id, seed])

  // estatísticas "de transmissão" do resumo — determinísticas por partida
  const facts = useMemo(
    () =>
      buildMatchFacts({
        seed,
        teamGoals: match.score.team,
        opponentGoals: match.score.opponent,
        playerRating: displayRating(match.rating),
        playerName,
        teamSquad,
        opponentSquad,
      }),
    [seed, match.score.team, match.score.opponent, match.rating, playerName, teamSquad, opponentSquad],
  )

  const passRngRef = useRef<RngState>(createRng((seed ^ 0x5bd1e995) >>> 0))
  const tacticRngRef = useRef<RngState>(createRng((seed ^ 0x2545f491) >>> 0))
  const directiveIdRef = useRef(1)
  const nextMicroRef = useRef(MICRO_EVERY_MINUTES)
  const logEndRef = useRef<HTMLDivElement>(null)

  const pushLine = (line: LogLine): void => setLog((current) => [...current, line])

  const choreographGoal = (side: 'team' | 'opponent'): void => {
    setDirective({ id: directiveIdRef.current++, kind: 'goal', side })
  }

  const pendingMomentRef = useRef<ReturnType<typeof currentMoment> | null>(null)

  /** A mesa entregou a bola ao protagonista: agora sim o mini-game abre. */
  const openPendingMoment = (): void => {
    const moment = pendingMomentRef.current
    if (!moment) return
    pendingMomentRef.current = null
    setDirective(null)
    pushLine({ minute: moment.minute, text: narrationForMoment(moment), tone: 'you' })
    if (moment.kind === 'playerPass') setMode('pass')
    else if (moment.kind === 'opponentFreeKick') setMode('defense')
    else setMode('shot')
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [log])

  useEffect(() => {
    if (mode !== 'live') return
    const interval = setInterval(() => {
      setClock((current) => current + (TICK_MS / 1000) * MINUTES_PER_SECOND * speed)
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [mode, speed])

  useEffect(() => {
    if (mode !== 'handoff') return
    const failSafe = setTimeout(openPendingMoment, 5000)
    return () => clearTimeout(failSafe)
    // openPendingMoment é estável o suficiente para o fail-safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // o relógio dirige a partida: momentos do plano disparam, lances corridos preenchem
  useEffect(() => {
    if (mode !== 'live') return

    if (isFinished(match)) {
      setMode('summary')
      return
    }

    const moment = currentMoment(match)
    if (clock >= moment.minute) {
      if (isPlayerMoment(moment)) {
        pendingMomentRef.current = moment
        setDirective({
          id: directiveIdRef.current++,
          kind: 'deliver',
          side: moment.kind === 'opponentFreeKick' ? 'opponent' : 'team',
        })
        setMode('handoff')
        return
      }
      if (moment.kind === 'teamGoal' || moment.kind === 'opponentGoal') {
        const roll = rollAutoGoal(moment.kind, tactic, tacticRngRef.current)
        tacticRngRef.current = roll.next
        const isOurs = moment.kind === 'teamGoal'
        if (roll.value) {
          pushLine({ minute: moment.minute, text: narrationForMoment(moment), tone: isOurs ? 'good' : 'bad' })
          choreographGoal(isOurs ? 'team' : 'opponent')
        } else {
          pushLine({
            minute: moment.minute,
            text: isOurs ? TACTIC_LINES.ourGoalCancelled : TACTIC_LINES.theirGoalCancelled,
            tone: isOurs ? 'bad' : 'good',
          })
        }
        setMatch(advanceAuto(match, roll.value))
        return
      }
      pushLine({ minute: moment.minute, text: narrationForMoment(moment), tone: 'normal' })
      setMatch(advance(match))
      return
    }

    // lance corrido entre os momentos
    if (clock >= nextMicroRef.current) {
      nextMicroRef.current = clock + MICRO_EVERY_MINUTES
      const goalRoll = rollMicroGoal(tactic, tacticRngRef.current)
      tacticRngRef.current = goalRoll.next
      if (goalRoll.value) {
        const side = goalRoll.value
        pushLine({
          minute: Math.floor(clock),
          text: side === 'team' ? TACTIC_LINES.extraTeamGoal : TACTIC_LINES.extraOpponentGoal,
          tone: side === 'team' ? 'good' : 'bad',
        })
        choreographGoal(side)
        setMatch(applyExtraGoal(match, side))
      }
    }
  }, [clock, mode, match, tactic])

  const changeTactic = (next: Tactic): void => {
    if (next === tactic) return
    setTactic(next)
    pushLine({ minute: Math.floor(clock), text: TACTIC_LINES.changed[next], tone: 'normal' })
  }

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
    setMode('live')
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
    setMode('live')
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
    setMode('live')
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

  const displayMinute = Math.min(90, Math.floor(clock))
  const lastLines = log.slice(-4)

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
        <span className="match-minute">{displayMinute}&prime;</span>
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
          attrs={attributes}
          celebrationId={celebrationId}
          keeperQuality={keeperQualityFor(competition, opponent.strength)}
          onRoundEnd={mode === 'defense' ? onDefenseResolved : onShotResolved}
        />
      ) : (
        <>
          <LivePitch
            speed={speed}
            teamColor={club.colors.primary}
            opponentColor={opponent.colors.primary}
            teamSquad={teamSquad}
            opponentSquad={opponentSquad}
            userName={playerName}
            directive={directive}
            onDirectiveComplete={openPendingMoment}
          />

          <div className="live-panel">
            <div className="live-group" role="group" aria-label="Velocidade do jogo">
              {SPEEDS.map((option) => (
                <button
                  key={option}
                  className={`live-btn${speed === option ? ' live-btn-active' : ''}`}
                  onClick={() => setSpeed(option)}
                >
                  {option}x
                </button>
              ))}
            </div>
            <div className="live-group" role="group" aria-label="Instrução tática">
              {(Object.keys(TACTIC_LABELS) as Tactic[]).map((option) => (
                <button
                  key={option}
                  className={`live-btn${tactic === option ? ' live-btn-active' : ''}`}
                  onClick={() => changeTactic(option)}
                >
                  {TACTIC_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="match-log match-log-live" role="log">
            {lastLines.map((line, index) => (
              <p key={`${line.minute}-${index}`} className={`log-line log-${line.tone}`}>
                <span className="log-minute">{line.minute}&prime;</span> {line.text}
              </p>
            ))}
            <div ref={logEndRef} />
          </div>
        </>
      )}

      {mode === 'pass' && (
        <PassChallenge
          intro={narrationForMoment(currentMoment(match))}
          rng={passRngRef.current}
          passeLevel={attributes.passe}
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

          <div className="facts-table">
            <div className="facts-row facts-head">
              <span>{club.abbr}</span>
              <span />
              <span>{opponent.abbr}</span>
            </div>
            <div className="facts-row">
              <span>{facts.possessionTeam}%</span>
              <span>Posse de bola</span>
              <span>{100 - facts.possessionTeam}%</span>
            </div>
            <div className="facts-row">
              <span>{facts.shotsTeam}</span>
              <span>Finalizações</span>
              <span>{facts.shotsOpponent}</span>
            </div>
            <div className="facts-row">
              <span>{facts.onTargetTeam}</span>
              <span>No gol</span>
              <span>{facts.onTargetOpponent}</span>
            </div>
            <div className="facts-row">
              <span>{facts.cornersTeam}</span>
              <span>Escanteios</span>
              <span>{facts.cornersOpponent}</span>
            </div>
          </div>

          <div className={`facts-motm${facts.bestPlayerIsUser ? ' facts-motm-user' : ''}`}>
            ⭐ Craque do jogo: <strong>{facts.bestPlayerName}</strong>
            {facts.bestPlayerIsUser ? ' — você!' : ''}
          </div>

          <p className="match-stats">
            {match.stats.goals} gol(s) em {match.stats.shots} finalizações
            {match.stats.golacos > 0 ? ` · ${match.stats.golacos} golaço(s)` : ''}
            {' · '}{match.stats.passesCompleted}/{match.stats.passes} passes certos
          </p>
          {trainingPointsForRating(displayRating(match.rating)) > 0 && (
            <p className="match-training">
              +{trainingPointsForRating(displayRating(match.rating))} pontos de treino
            </p>
          )}
          <button className="btn" onClick={finishMatch}>Continuar ▸</button>
        </div>
      )}
    </div>
  )
}
