import { FastForward, Star, TriangleAlert } from 'lucide-react'
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
  SIM_LINES,
  TACTIC_LINES,
  WALL_BLOCK_LINE,
  withName,
} from '../data/narration'
import { simulateToEnd, type AutoPlayEvent, type AutoPlayProbs } from '../engine/match/autoplay'
import { FORMATIONS, type FormationId, type PlayerFieldPosition } from '../engine/squad/formation'
import { squadWithSignings, type Signing } from '../engine/market/market'
import { rivalSquadFor } from '../engine/market/aiTransfers'
import { lineupRating, squadPlayersFor, userAsSquadPlayer, USER_SQUAD_INDEX } from '../engine/squad/players'
import { createRng, type RngState } from '../engine/rng'
import { DEFAULT_MATCH_CONFIG } from '../engine/match/config'
import { matchConfigForRatings, ratingEdgeFor } from '../engine/match/difficulty'
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
import { pickBestPlayer } from '../engine/match/facts'
import { displayRating } from '../engine/match/rating'
import { momentumFor, rollAutoGoal, rollMicroGoal, TACTIC_LABELS, type Tactic } from '../engine/match/tactics'
import type { MatchState } from '../engine/match/types'
import type { PassResolution } from '../engine/pass/pass'
import { DEFAULT_APPEARANCE, type Competition, type MatchRecord, type PlayerAppearance } from '../state/save'
import { ClubCrest } from '../ui/ClubCrest'
import { createLiveStats, LivePitch, type PitchDirective } from './LivePitch'
import { PassChallenge } from './PassChallenge'
import { ShotStage, type RoundSummary } from './ShotStage'

/** Minutos de jogo por segundo real, na velocidade 1x. */
const MINUTES_PER_SECOND = 0.9
const TICK_MS = 100
const MICRO_EVERY_MINUTES = 2.4
const SPEEDS = [1, 2, 4] as const
const FULLTIME_MINUTE = 90

/** Simulação automática: quem treinou converte mais (atributos 1-10). */
const AUTO_SHOT_BASE = 0.25
const AUTO_SHOT_PER_LEVEL = 0.03
const AUTO_PASS_BASE = 0.5
const AUTO_PASS_PER_LEVEL = 0.04
const AUTO_SAVE_BASE = 0.3
const AUTO_SAVE_PER_LEVEL = 0.04

const autoProbsFor = (attrs: PlayerAttributes): AutoPlayProbs => ({
  shotGoal: AUTO_SHOT_BASE + attrs.finalizacao * AUTO_SHOT_PER_LEVEL,
  passComplete: AUTO_PASS_BASE + attrs.passe * AUTO_PASS_PER_LEVEL,
  defenseSave: AUTO_SAVE_BASE + attrs.defesa * AUTO_SAVE_PER_LEVEL,
})

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
  /** Divisão do adversário (-1 = seleção/sem mercado da IA). */
  readonly opponentDivision?: number
  readonly competition?: Competition
  readonly attributes?: PlayerAttributes
  /** Comemoração escolhida no Perfil (índice em celeb_0..3). */
  readonly celebrationId?: number
  /** Aparência do craque (pele/cabelo). */
  readonly appearance?: PlayerAppearance
  /** Escudos enviados pelo jogador (clubId → data URL). */
  readonly crestUrls?: Readonly<Record<string, string>>
  /** Formação escolhida por você, o técnico (rival joga no padrão). */
  readonly formation?: FormationId
  /** Posição do craque — pesa no overall efetivo da escalação. */
  readonly playerPosition?: PlayerFieldPosition
  /** Escalação: índice do elenco em cada slot da formação (liga apenas). */
  readonly lineup?: readonly number[]
  /** Temporada atual — elencos envelhecem a cada ano. */
  readonly careerYear?: number
  /** Batismos locais dos SEUS jogadores (playerId → nome). */
  readonly playerNames?: Readonly<Record<string, string>>
  /** Cenário dos lances — o palco cresce com a divisão. */
  readonly stadiumUrl?: string
  /** Reforços contratados (só nos jogos do SEU clube). */
  readonly signings?: readonly Signing[]
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
  appearance = DEFAULT_APPEARANCE,
  crestUrls = {},
  formation = '4-3-3',
  playerPosition = 'ATA',
  lineup,
  careerYear = 1,
  playerNames = {},
  stadiumUrl,
  signings = [],
  opponentDivision = -1,
  onExit,
}: MatchScreenProps) => {
  // elenco com o SEU craque dentro — a força do time muda com a escalação
  const teamPlayers = useMemo(() => {
    const squad = squadWithSignings(squadPlayersFor(club, careerYear), signings, careerYear)
    return squad.map((player, index) =>
      index === USER_SQUAD_INDEX
        ? userAsSquadPlayer(player, playerName, attributes, playerPosition)
        : playerNames[player.id]
          ? { ...player, name: playerNames[player.id] }
          : player,
    )
  }, [club, careerYear, playerName, attributes, playerPosition, playerNames, signings])

  const effectiveLineup = useMemo(
    () => lineup ?? Array.from({ length: 11 }, (_, index) => index),
    [lineup],
  )

  const teamRating = useMemo(
    () =>
      lineupRating(
        effectiveLineup.map((squadIndex) => teamPlayers[squadIndex]),
        FORMATIONS[formation].slots,
      ),
    [effectiveLineup, teamPlayers, formation],
  )
  const opponentRating = useMemo(() => {
    const squad = rivalSquadFor(opponent, opponentDivision, careerYear)
    return lineupRating(squad.slice(0, 11), FORMATIONS['4-3-3'].slots)
  }, [opponent, opponentDivision, careerYear])

  const config = useMemo(
    () => matchConfigForRatings(DEFAULT_MATCH_CONFIG, teamRating, opponentRating),
    [teamRating, opponentRating],
  )
  const [match, setMatch] = useState<MatchState>(() => startMatch(seed, config))
  const [mode, setMode] = useState<MatchMode>('live')
  const [clock, setClock] = useState(0)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [tactic, setTactic] = useState<Tactic>('equilibrado')
  const [log, setLog] = useState<readonly LogLine[]>([])
  const [directive, setDirective] = useState<PitchDirective | null>(null)
  // modal "simular até o fim" — enquanto aberta, o relógio pausa
  const [isSimConfirmOpen, setSimConfirmOpen] = useState(false)

  // nomes no campo seguem a escalação
  const teamSquad = useMemo(
    () => effectiveLineup.map((squadIndex) => teamPlayers[squadIndex]?.name ?? `#${squadIndex}`),
    [effectiveLineup, teamPlayers],
  )
  const userIndex = Math.max(0, effectiveLineup.indexOf(USER_SQUAD_INDEX))
  const opponentSquad = useMemo(
    () => rivalSquadFor(opponent, opponentDivision, careerYear).slice(0, 11).map((player) => player.name),
    [opponent, opponentDivision, careerYear],
  )

  // contadores VIVOS: tudo que aparece no resumo aconteceu no campo
  const liveStatsRef = useRef(createLiveStats())

  const possessionPct = Math.round(
    (liveStatsRef.current.possessionTeam /
      (liveStatsRef.current.possessionTeam + liveStatsRef.current.possessionOpp)) * 100,
  )

  const bestPlayer = useMemo(
    () =>
      pickBestPlayer({
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
    if (mode !== 'live' || isSimConfirmOpen) return
    const interval = setInterval(() => {
      setClock((current) => current + (TICK_MS / 1000) * MINUTES_PER_SECOND * speed)
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [mode, speed, isSimConfirmOpen])

  useEffect(() => {
    if (mode !== 'handoff') return
    const failSafe = setTimeout(openPendingMoment, 2500)
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
        const roll = rollAutoGoal(moment.kind, tactic, tacticRngRef.current, momentumFor(displayRating(match.rating)))
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
      const goalRoll = rollMicroGoal(
        tactic,
        tacticRngRef.current,
        momentumFor(displayRating(match.rating)),
        ratingEdgeFor(teamRating, opponentRating),
      )
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

  const simLineFor = (event: AutoPlayEvent): LogLine => {
    switch (event.kind) {
      case 'playerShot':
      case 'playerFreeKick':
        return {
          minute: event.minute,
          text: withName(event.success ? SIM_LINES.shotGoal : SIM_LINES.shotMiss, playerName),
          tone: event.success ? 'good' : 'bad',
        }
      case 'playerPass':
        return {
          minute: event.minute,
          text: withName(event.success ? SIM_LINES.passOk : SIM_LINES.passFail, playerName),
          tone: event.success ? 'good' : 'bad',
        }
      case 'opponentFreeKick':
        return {
          minute: event.minute,
          text: withName(event.success ? SIM_LINES.defenseSave : SIM_LINES.defenseConcede, playerName),
          tone: event.success ? 'good' : 'bad',
        }
      case 'teamGoal':
        return { minute: event.minute, text: SIM_LINES.planTeamGoal, tone: 'good' }
      default:
        return { minute: event.minute, text: SIM_LINES.planOpponentGoal, tone: 'bad' }
    }
  }

  /** Simula o resto da partida: lances do jogador viram rolagens pelos atributos. */
  const simulateRest = (): void => {
    setSimConfirmOpen(false)
    if (mode !== 'live') return
    const result = simulateToEnd(match, config, autoProbsFor(attributes), tacticRngRef.current)
    tacticRngRef.current = result.next
    const stats = liveStatsRef.current
    for (const event of result.value.events) {
      if (event.kind === 'playerShot' || event.kind === 'playerFreeKick' || event.kind === 'teamGoal') {
        stats.teamShots += 1
        stats.teamOnTarget += 1
      } else if (event.kind === 'opponentFreeKick' || event.kind === 'opponentGoal') {
        stats.oppShots += 1
        stats.oppOnTarget += 1
      }
    }
    setLog((current) => [
      ...current,
      { minute: Math.floor(clock), text: SIM_LINES.start, tone: 'normal' },
      ...result.value.events.map(simLineFor),
    ])
    setDirective(null)
    setMatch(result.value.state)
    setClock(FULLTIME_MINUTE + 1)
  }

  const onShotResolved = (summary: RoundSummary): void => {
    // seu chute É uma finalização do time (no gol quando não saiu/trave)
    liveStatsRef.current.teamShots += 1
    if (summary.lastOutcome === 'goal' || summary.lastOutcome === 'save') {
      liveStatsRef.current.teamOnTarget += 1
    }
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
    // a falta deles é uma finalização do adversário, sempre na direção do gol
    liveStatsRef.current.oppShots += 1
    liveStatsRef.current.oppOnTarget += 1
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
  // No desktop, campo/lance à esquerda e comando (placar, stats, narração) à direita.
  const isLance = mode === 'shot' || mode === 'defense'

  return (
    <div className={`match match-live-layout${isLance ? ' match-in-lance' : ''}`}>
      <div className="match-header">
        <span className="match-team">
          <ClubCrest club={club} customUrl={crestUrls[club.id]} size={20} />
          {club.abbr}
        </span>
        <span className="match-score">{match.score.team} × {match.score.opponent}</span>
        <span className="match-team">
          {opponent.abbr}
          <ClubCrest club={opponent} customUrl={crestUrls[opponent.id]} size={20} />
        </span>
        <span className="match-minute">{displayMinute}&prime;</span>
      </div>

      {isLance ? (
        <ShotStage
          key={`lance-${match.cursor}`}
          backgroundUrl={stadiumUrl}
          shots={1}
          autoStart
          hideEndOverlay
          freeKick={mode === 'shot' && currentMoment(match).kind === 'playerFreeKick'}
          wallColor={opponent.colors.primary}
          defense={mode === 'defense' ? { skill: opponent.strength / 5, kitColor: opponent.colors.primary } : undefined}
          attrs={attributes}
          celebrationId={celebrationId}
          appearance={appearance}
          keeperQuality={keeperQualityFor(competition, opponent.strength)}
          onRoundEnd={mode === 'defense' ? onDefenseResolved : onShotResolved}
        />
      ) : (
        <>
          <LivePitch
            tactic={tactic}
            stats={liveStatsRef.current}
            teamLayout={FORMATIONS[formation].layout}
            userIndex={userIndex}
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
            <div className="live-group">
              <button
                className="live-btn live-btn-sim"
                onClick={() => setSimConfirmOpen(true)}
                disabled={mode !== 'live'}
              >
                <FastForward size={13} aria-hidden="true" />
                Simular até o fim
              </button>
            </div>
            <span className="wo-note">
              <TriangleAlert size={12} aria-hidden="true" />
              Sair no meio da partida conta derrota por W.O.: 3×0 para o adversário.
            </span>
          </div>

        </>
      )}

      <div className="live-stats" aria-label="Estatísticas ao vivo">
        <span className="live-stats-team">{club.abbr}</span>
        <span className="live-stats-cell">
          <strong>{teamRating}</strong> força <strong>{opponentRating}</strong>
        </span>
        <span className="live-stats-cell">
          <strong>{possessionPct}%</strong> posse <strong>{100 - possessionPct}%</strong>
        </span>
        <span className="live-stats-cell">
          <strong>{liveStatsRef.current.teamShots}</strong>
          <em>({liveStatsRef.current.teamOnTarget})</em> chutes{' '}
          <strong>{liveStatsRef.current.oppShots}</strong>
          <em>({liveStatsRef.current.oppOnTarget})</em>
        </span>
        <span className="live-stats-team">{opponent.abbr}</span>
      </div>

      <div className="match-log match-log-live" role="log">
        {log
          .map((line, index) => (
            <p key={`${line.minute}-${index}`} className={`log-line log-${line.tone}`}>
              <span className="log-minute">{line.minute}&prime;</span> {line.text}
            </p>
          ))
          .reverse()}
      </div>

      {isSimConfirmOpen && (
        <div className="sim-confirm" role="dialog" aria-modal="true" aria-labelledby="sim-confirm-title">
          <div className="sim-confirm-box">
            <h3 id="sim-confirm-title">Simular até o fim?</h3>
            <p>
              O relógio corre sozinho e os seus lances restantes são resolvidos
              automaticamente pelos seus atributos.
            </p>
            <div className="sim-confirm-actions">
              <button className="btn btn-secondary" onClick={() => setSimConfirmOpen(false)}>
                Voltar ao jogo
              </button>
              <button className="btn" onClick={simulateRest}>
                <FastForward size={14} aria-hidden="true" />
                Simular
              </button>
            </div>
          </div>
        </div>
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
          <div className="summary-content">
          <div className="summary-header">
            <h2>Fim de jogo</h2>
            <button className="btn summary-continue" onClick={finishMatch}>Continuar ▸</button>
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
              <span>{liveStatsRef.current.teamShots}</span>
              <span>Finalizações</span>
              <span>{liveStatsRef.current.oppShots}</span>
            </div>
            <div className="facts-row">
              <span>{liveStatsRef.current.teamOnTarget}</span>
              <span>No gol</span>
              <span>{liveStatsRef.current.oppOnTarget}</span>
            </div>
            <div className="facts-row">
              <span>
                {liveStatsRef.current.teamShots > 0
                  ? Math.round((liveStatsRef.current.teamOnTarget / liveStatsRef.current.teamShots) * 100)
                  : 0}%
              </span>
              <span>Pontaria</span>
              <span>
                {liveStatsRef.current.oppShots > 0
                  ? Math.round((liveStatsRef.current.oppOnTarget / liveStatsRef.current.oppShots) * 100)
                  : 0}%
              </span>
            </div>
            <div className="facts-row">
              <span>{Math.max(0, liveStatsRef.current.oppOnTarget - match.score.opponent)}</span>
              <span>Defesas</span>
              <span>{Math.max(0, liveStatsRef.current.teamOnTarget - match.score.team)}</span>
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
              <div className="stat"><span className="stat-value">{match.stats.passesCompleted}/{match.stats.passes}</span><span className="stat-label">passes certos</span></div>
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
          </div>
        </div>
      )}
    </div>
  )
}
