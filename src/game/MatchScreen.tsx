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
import { DiceDuelStage } from './DiceDuelStage'
import { MatchIntro } from './MatchIntro'
import { createRng, type RngState } from '../engine/rng'
import { DEFAULT_MATCH_CONFIG } from '../engine/match/config'
import {
  autoProbsForSectors,
  matchConfigForSectors,
  ratingEdgeFor,
} from '../engine/match/difficulty'
import { bestLineup } from '../engine/squad/bestLineup'
import { sectorRatings } from '../engine/squad/sectors'
import {
  advance,
  advanceAuto,
  applyDefenseResult,
  applyDecider,
  applyDiceResult,
  applyExtraGoal,
  applyPassResult,
  applyShotResult,
  currentMoment,
  isFinished,
  isPlayerMoment,
  needsDecider,
  startMatch,
} from '../engine/match/match'
import { pickBestPlayer } from '../engine/match/facts'
import { capRatingByResult, displayRating } from '../engine/match/rating'
import { DEFAULT_MORALE, moraleRatingBonus } from '../engine/career/events'
import { captainMomentum, type PerkId } from '../engine/career/perks'
import { momentumFor, rollAutoGoal, rollMicroGoal, TACTIC_LABELS, type Tactic } from '../engine/match/tactics'
import type { MatchState } from '../engine/match/types'
import type { PassResolution } from '../engine/pass/pass'
import { stopMatchAudio } from './audio'
import { startResultsMusic, stopResultsMusic } from './music'
import { DEFAULT_APPEARANCE, type Competition, type MatchRecord, type PlayerAppearance } from '../state/save'
import { ClubCrest } from '../ui/ClubCrest'
import { createLiveStats, LivePitch, type PitchDirective } from './LivePitch'
import {
  EMPTY_REVEAL,
  queueGoal,
  revealAll,
  revealUpTo,
  visibleScore,
  type GoalRevealState,
  type Reveal,
} from './goalReveal'
import type { LogLine } from './logLine'
import { PassChallenge } from './PassChallenge'
import { ShotStage, type RoundSummary } from './ShotStage'

/** Minutos de jogo por segundo real, na velocidade 1x. */
const MINUTES_PER_SECOND = 0.9
const TICK_MS = 100
const MICRO_EVERY_MINUTES = 2.4
const SPEEDS = [1, 2, 4] as const
const FULLTIME_MINUTE = 90
/**
 * Teto de espera pela coreografia do gol. Na velocidade 1x o pior caso (bola
 * troca de lado, sobe o campo e finaliza) fica em torno de 6s; acima disso
 * assumimos que a jogada travou e mostramos o gol assim mesmo.
 */
const GOAL_REVEAL_FAILSAFE_MS = 9000

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

type MatchMode = 'intro' | 'live' | 'handoff' | 'shot' | 'pass' | 'defense' | 'dice' | 'summary'

interface MatchScreenProps {
  readonly seed: number
  readonly playerName: string
  readonly club: Club
  readonly opponent: Club
  /** Divisão do adversário (-1 = seleção/sem mercado da IA). */
  readonly opponentDivision?: number
  readonly competition?: Competition
  /**
   * Jogo que não pode terminar empatado (mata-mata de seleção). Empatou no
   * apito final, o lance dos dados decide quem avança.
   */
  readonly decisive?: boolean
  readonly attributes?: PlayerAttributes
  /** Perks de RPG do craque — afetam lances, passes e momentum. */
  readonly perks?: readonly PerkId[]
  /** Moral do craque (0-100) — desloca a nota inicial da partida. */
  readonly morale?: number
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
  /** Idade ATUAL do craque — sem ela o elenco herda a do jogador gerado. */
  readonly playerAge?: number
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

type MatchOutcome = 'win' | 'draw' | 'loss'

const OUTCOME_LABEL: Record<MatchOutcome, string> = {
  win: 'Vitória',
  draw: 'Empate',
  loss: 'Derrota',
}

interface LiveStatProps {
  readonly label: string
  readonly mine: number
  readonly theirs: number
  readonly suffix?: string
  /** Detalhe entre parênteses, tipo quantos chutes foram no gol. */
  readonly mineNote?: string
  readonly theirsNote?: string
}

/** Uma linha de comparação: seu número, a fatia visual e o do adversário. */
const LiveStat = ({ label, mine, theirs, suffix = '', mineNote, theirsNote }: LiveStatProps) => {
  const total = mine + theirs
  // sem nada acontecendo ainda, a barra fica no meio em vez de zerada
  const share = total === 0 ? 50 : Math.round((mine / total) * 100)
  return (
    <div className="live-stat">
      <strong className="live-stat-value">
        {mine}{suffix}
        {mineNote && <em>({mineNote})</em>}
      </strong>
      <span className="live-stat-mid">
        <span className="live-stat-label">{label}</span>
        <span className="live-stat-bar">
          <span className="live-stat-fill" style={{ width: `${share}%` }} />
        </span>
      </span>
      <strong className="live-stat-value live-stat-value-opp">
        {theirsNote && <em>({theirsNote})</em>}
        {theirs}{suffix}
      </strong>
    </div>
  )
}

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
  decisive = false,
  attributes = DEFAULT_ATTRIBUTES,
  perks = [],
  morale = DEFAULT_MORALE,
  celebrationId = 0,
  appearance = DEFAULT_APPEARANCE,
  crestUrls = {},
  formation = '4-3-3',
  playerPosition = 'ATA',
  lineup,
  careerYear = 1,
  playerAge,
  playerNames = {},
  stadiumUrl,
  signings = [],
  opponentDivision = -1,
  onExit,
}: MatchScreenProps) => {
  // elenco com o SEU craque dentro — a força do time muda com a escalação
  const teamPlayers = useMemo(() => {
    const squad = squadWithSignings(squadPlayersFor(club, careerYear, appearance.gender), signings, careerYear)
    return squad.map((player, index) =>
      index === USER_SQUAD_INDEX
        ? userAsSquadPlayer(player, playerName, attributes, playerPosition, playerAge)
        : playerNames[player.id]
          ? { ...player, name: playerNames[player.id] }
          : player,
    )
  }, [club, careerYear, playerAge, playerName, attributes, playerPosition, playerNames, signings])

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
    const squad = rivalSquadFor(opponent, opponentDivision, careerYear, appearance.gender)
    const lineup = bestLineup(squad, FORMATIONS['4-3-3'])
    return lineupRating(lineup.map((index) => squad[index]), FORMATIONS['4-3-3'].slots)
  }, [opponent, opponentDivision, careerYear, appearance.gender])

  /* setores do SEU time e do rival: é o confronto entre eles que decide o jogo */
  const mySectors = useMemo(
    () =>
      sectorRatings(
        effectiveLineup.map((squadIndex) => teamPlayers[squadIndex]),
        FORMATIONS[formation],
      ),
    [effectiveLineup, teamPlayers, formation],
  )
  const theirSectors = useMemo(() => {
    const squad = rivalSquadFor(opponent, opponentDivision, careerYear, appearance.gender)
    // o rival entra com o melhor time dele, não com os 11 primeiros da lista
    return sectorRatings(
      bestLineup(squad, FORMATIONS['4-3-3']).map((index) => squad[index]),
      FORMATIONS['4-3-3'],
    )
  }, [opponent, opponentDivision, careerYear, appearance.gender])

  const config = useMemo(() => {
    const byRatings = matchConfigForSectors(DEFAULT_MATCH_CONFIG, mySectors, theirSectors)
    // moral entra em campo: nota inicial desloca até ±0.8
    return { ...byRatings, baseRating: byRatings.baseRating + moraleRatingBonus(morale) }
  }, [mySectors, theirSectors, morale])
  const [match, setMatch] = useState<MatchState>(() => startMatch(seed, config))
  /* a nota que vale é a limitada pelo resultado: empate não dá 10 */
  const finalRating = capRatingByResult(
    displayRating(match.rating),
    match.score.team,
    match.score.opponent,
  )

  const [mode, setMode] = useState<MatchMode>('intro')
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
  const opponentSquad = useMemo(() => {
    // os nomes em campo são os da MELHOR escalação do rival, não os 11 primeiros
    const squad = rivalSquadFor(opponent, opponentDivision, careerYear, appearance.gender)
    return bestLineup(squad, FORMATIONS['4-3-3']).map((index) => squad[index].name)
  }, [opponent, opponentDivision, careerYear, appearance.gender])

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
        playerRating: finalRating,
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

  /**
   * Gols que a engine já somou e o gramado ainda não mostrou. A engine não pode
   * esperar (o cursor do plano e o fim de jogo dependem dela), mas o placar na
   * tela pode — e deve, senão o número muda antes de a bola entrar.
   */
  const [reveal, setReveal] = useState<GoalRevealState>(EMPTY_REVEAL)

  const applyReveal = (next: Reveal): void => {
    if (next.lines.length === 0) return
    setReveal(next.state)
    setLog((current) => [...current, ...next.lines])
  }

  /** Manda o campo levar a bola até a rede; o placar e a narração esperam a coreografia. */
  const choreographGoal = (side: 'team' | 'opponent', line: LogLine): void => {
    const directiveId = directiveIdRef.current++
    setDirective({ id: directiveId, kind: 'goal', side })
    setReveal((current) => queueGoal(current, { directiveId, side, line }))
  }

  const pendingMomentRef = useRef<ReturnType<typeof currentMoment> | null>(null)

  /** A mesa entregou a bola ao protagonista: agora sim o mini-game abre. */
  const openPendingMoment = (): void => {
    const moment = pendingMomentRef.current
    if (!moment) return
    pendingMomentRef.current = null
    setDirective(null)
    pushLine({ minute: moment.minute, text: narrationForMoment(moment), tone: 'you' })
    if (moment.kind === 'playerDecision') setMode('pass')
    else if (moment.kind === 'opponentFreeKick') setMode('defense')
    else if (moment.kind === 'diceDuel') setMode('dice')
    else setMode('shot')
  }

  /**
   * O campo cumpriu uma ordem. Entrega: abre o mini-game. Gol: a bola acabou de
   * entrar, então agora o placar sobe e a narração entra.
   */
  const onDirectiveComplete = (id: number): void => {
    if (pendingMomentRef.current) {
      openPendingMoment()
      return
    }
    applyReveal(revealUpTo(reveal, id))
    // limpa a ordem cumprida — sem isso o campo repete a coreografia se remontar.
    // Só a própria ordem sai: uma mais nova emitida no mesmo frame fica de pé.
    setDirective((current) => (current?.id === id ? null : current))
  }

  useEffect(() => {
    if (mode !== 'live' || isSimConfirmOpen) return
    const interval = setInterval(() => {
      setClock((current) => current + (TICK_MS / 1000) * MINUTES_PER_SECOND * speed)
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [mode, speed, isSimConfirmOpen])

  // a música entra com o resultado na tela e para assim que ele sai
  useEffect(() => {
    if (mode !== 'summary') return
    // a torcida sai de cena: no fim de jogo quem fica é só a música
    stopMatchAudio()
    startResultsMusic()
    return stopResultsMusic
  }, [mode])

  useEffect(() => {
    if (mode !== 'handoff') return
    const failSafe = setTimeout(openPendingMoment, 2500)
    return () => clearTimeout(failSafe)
    // openPendingMoment é estável o suficiente para o fail-safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // gol pendente NUNCA some: se a coreografia travar, o placar sobe assim mesmo
  useEffect(() => {
    if (reveal.pending.length === 0) return
    const failSafe = setTimeout(() => applyReveal(revealAll(reveal)), GOAL_REVEAL_FAILSAFE_MS)
    return () => clearTimeout(failSafe)
    // applyReveal só depende do estado já capturado em `reveal`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

  // saiu do campo (lance, dado, fim de jogo): a coreografia foi abortada, revela tudo
  useEffect(() => {
    if (mode === 'live' || reveal.pending.length === 0) return
    applyReveal(revealAll(reveal))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, reveal])

  // o relógio dirige a partida: momentos do plano disparam, lances corridos preenchem
  useEffect(() => {
    if (mode !== 'live') return

    if (isFinished(match)) {
      // empatou num mata-mata: o dado decide antes de fechar a partida
      setMode(needsDecider(match, decisive) ? 'dice' : 'summary')
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
        const roll = rollAutoGoal(
          moment.kind,
          tactic,
          tacticRngRef.current,
          captainMomentum(momentumFor(displayRating(match.rating)), perks),
        )
        tacticRngRef.current = roll.next
        const isOurs = moment.kind === 'teamGoal'
        if (roll.value) {
          // a engine avança agora (o cursor não pode esperar), a TELA espera a bola entrar
          choreographGoal(isOurs ? 'team' : 'opponent', {
            minute: moment.minute,
            text: narrationForMoment(moment),
            tone: isOurs ? 'good' : 'bad',
          })
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
        captainMomentum(momentumFor(displayRating(match.rating)), perks),
        ratingEdgeFor(teamRating, opponentRating),
      )
      tacticRngRef.current = goalRoll.next
      if (goalRoll.value) {
        const side = goalRoll.value
        choreographGoal(side, {
          minute: Math.floor(clock),
          text: side === 'team' ? TACTIC_LINES.extraTeamGoal : TACTIC_LINES.extraOpponentGoal,
          tone: side === 'team' ? 'good' : 'bad',
        })
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
      case 'playerDecision':
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
    // a força dos elencos pesa: simular contra time melhor tem que ser difícil
    const probs = autoProbsForSectors(autoProbsFor(attributes), mySectors, theirSectors)
    const result = simulateToEnd(match, config, probs, tacticRngRef.current)
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
    // gol coreografado em andamento entra no log ANTES do resumo da simulação
    setLog((current) => [
      ...current,
      ...revealAll(reveal).lines,
      { minute: Math.floor(clock), text: SIM_LINES.start, tone: 'normal' },
      ...result.value.events.map(simLineFor),
    ])
    setReveal(EMPTY_REVEAL)
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

  /** Fecha a dividida no dado: quem ganhou marca e o jogo segue. */
  const onDiceResolved = (winner: 'player' | 'ai'): void => {
    const mine = winner === 'player'
    if (isFinished(match)) {
      // desempate do mata-mata: entra como gol de decisão e fecha o jogo
      pushLine({
        minute: FULLTIME_MINUTE,
        text: mine
          ? `NOS DADOS! O ${club.name} leva a vaga na decisão.`
          : `Nos dados, a vaga fica com o ${opponent.name}.`,
        tone: mine ? 'good' : 'bad',
      })
      setMatch(applyDecider(match, mine))
      setMode('summary')
      return
    }
    const moment = currentMoment(match)
    if (mine) {
      liveStatsRef.current.teamShots += 1
      liveStatsRef.current.teamOnTarget += 1
    }
    else {
      liveStatsRef.current.oppShots += 1
      liveStatsRef.current.oppOnTarget += 1
    }
    pushLine({
      minute: moment.minute,
      text: mine
        ? `Sobrou pra você na confusão e é GOL do ${club.name}!`
        : `A bola sobrou pra eles e é gol do ${opponent.name}.`,
      tone: mine ? 'good' : 'bad',
    })
    setMatch(applyDiceResult(match, mine, config))
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
      rating: finalRating,
      playerGoals: match.stats.goals,
      playedAt: Date.now(),
      competition,
    })
  }

  const displayMinute = Math.min(90, Math.floor(clock))
  // o placar do cabeçalho segue o GRAMADO: gol pendente ainda não conta na tela
  const shownScore = visibleScore(match.score, reveal)
  // No desktop, campo/lance à esquerda e comando (placar, stats, narração) à direita.
  // lance decisivo: o mini-game TOMA a tela no lugar do campo ao vivo
  /** O que valeu no fim: nas copas quem decide é a disputa de pênaltis. */
  const outcome: MatchOutcome =
    match.score.team > match.score.opponent
      ? 'win'
      : match.score.team < match.score.opponent
        ? 'loss'
        : 'draw'

  const isLance = mode === 'shot' || mode === 'defense' || mode === 'dice'

  return (
    <div className={`match match-live-layout${isLance ? ' match-in-lance' : ''}`}>
      <div className="match-header">
        <span className="match-team">
          <ClubCrest club={club} customUrl={crestUrls[club.id]} size={20} />
          {club.abbr}
        </span>
        <span className="match-score">{shownScore.team} × {shownScore.opponent}</span>
        <span className="match-team">
          {opponent.abbr}
          <ClubCrest club={opponent} customUrl={crestUrls[opponent.id]} size={20} />
        </span>
        <span className="match-minute">{displayMinute}&prime;</span>
      </div>

      {mode === 'intro' && (
        <MatchIntro
          club={club}
          opponent={opponent}
          crestUrls={crestUrls}
          subtitle={competition === 'selecao' ? 'Jogo da seleção' : 'Dia de jogo'}
          onDone={() => setMode('live')}
        />
      )}

      {mode === 'dice' ? (
        <div className="dice-lance">
          <span className="card-label">
            {isFinished(match)
              ? 'Empatou no tempo normal · os dados dão a vaga'
              : 'Lance decisivo · a sorte decide'}
          </span>
          <DiceDuelStage
            key={`dado-${match.cursor}`}
            seed={(seed ^ Math.imul(match.cursor + 1, 0x9e3779b9)) >>> 0}
            teamName={club.name}
            opponentName={opponent.name}
            onResolved={onDiceResolved}
            forQualification={isFinished(match)}
          />
        </div>
      ) : isLance ? (
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
          perks={perks}
          perkContext={{
            clutch: match.score.team <= match.score.opponent,
            tournament: competition === 'selecao',
          }}
          celebrationId={celebrationId}
          appearance={appearance}
          kitColor={club.colors.primary}
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
            onDirectiveComplete={onDirectiveComplete}
          />

          <div className="live-panel">
            <div className="live-control">
            <span className="live-panel-label">Velocidade</span>
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
            </div>
            <div className="live-control">
            <span className="live-panel-label">Postura do time</span>
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
        <div className="live-stats-head">
          <span className="live-stats-team">{club.abbr}</span>
          <span className="live-stats-title">Números do jogo</span>
          <span className="live-stats-team">{opponent.abbr}</span>
        </div>
        <LiveStat label="Força" mine={teamRating} theirs={opponentRating} />
        <LiveStat label="Posse" mine={possessionPct} theirs={100 - possessionPct} suffix="%" />
        <LiveStat
          label="Chutes (no gol)"
          mine={liveStatsRef.current.teamShots}
          theirs={liveStatsRef.current.oppShots}
          mineNote={`${liveStatsRef.current.teamOnTarget}`}
          theirsNote={`${liveStatsRef.current.oppOnTarget}`}
        />
      </div>

      <div className="match-log match-log-live" role="log">
        <span className="match-log-title">Narração</span>
        {log.length === 0 && <p className="match-log-empty">A bola vai rolar…</p>}
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
          perks={perks}
          onResolved={onPassResolved}
        />
      )}

      {mode === 'summary' && (
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

          <button className="btn summary-continue" onClick={finishMatch}>Continuar ▸</button>
          </div>
        </div>
      )}
    </div>
  )
}
