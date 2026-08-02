import { FastForward, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Club } from '../data/clubs'
import { DEFAULT_ATTRIBUTES, type PlayerAttributes } from '../engine/career/attributes'
import {
  acaoDaJogada,
  DEFENSE_RESULT_LINES,
  fechoDaDecisao,
  GOLACO_LINE,
  SHOT_RESULT_LINES,
  SIM_LINES,
  TACTIC_LINES,
  WALL_BLOCK_LINE,
  withCast,
  withName,
} from '../data/narration'
import { simulateToEnd, type AutoPlayProbs } from '../engine/match/autoplay'
import { FORMATIONS, type FormationId, type PlayerFieldPosition } from '../engine/squad/formation'
import { squadWithSignings, type PlayerSale, type Signing } from '../engine/market/market'
import { rivalSquadFor } from '../engine/market/aiTransfers'
import { squadPlayersFor, userAsSquadPlayer, USER_SQUAD_INDEX } from '../engine/squad/players'
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
import { bestLineupStrength, lineupStrength } from '../engine/squad/teamStrength'
import {
  advance,
  advanceAuto,
  applyDefenseResult,
  applyDecider,
  applyDiceResult,
  applyExtraGoal,
  applyDecisionResult,
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
import { matchupEdges, tightness } from '../engine/match/sectorDuel'
import { momentumFor, rollAutoGoal, rollMicroGoal, TACTIC_LABELS, type Tactic } from '../engine/match/tactics'
import type { ContextoDaJogada } from '../engine/decision/context'
import type { MatchState } from '../engine/match/types'

import { playStageEvent, stopMatchAudio } from './audio'
import { startResultsMusic, stopResultsMusic } from './music'
import { DEFAULT_APPEARANCE, type Competition, type MatchRecord, type PlayerAppearance } from '../state/save'
import { ClubCrest } from '../ui/ClubCrest'
import { usePlayerPortrait } from '../ui/usePlayerPortrait'
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
import { DecisionChallenge, type DecisionOutcome } from './DecisionChallenge'
import { LiveStat } from './LiveStat'
import { createMatchNarrator } from './matchNarrator'
import { MatchSummary, type MatchOutcome } from './MatchSummary'
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
 *
 * Divide pela velocidade porque a coreografia TAMBÉM acelera: em 4x ela fecha
 * em um quarto do tempo, e um teto fixo de 9s deixaria de ser rede de
 * segurança para virar espera garantida quando algo travasse.
 */
const GOAL_REVEAL_FAILSAFE_MS = 9000

/** Simulação automática: quem treinou converte mais (atributos 1-10). */
const AUTO_SHOT_BASE = 0.25
const AUTO_SHOT_PER_LEVEL = 0.03
const AUTO_SAVE_BASE = 0.3
const AUTO_SAVE_PER_LEVEL = 0.04

const autoProbsFor = (attrs: PlayerAttributes): AutoPlayProbs => ({
  shotGoal: AUTO_SHOT_BASE + attrs.finalizacao * AUTO_SHOT_PER_LEVEL,
  defenseSave: AUTO_SAVE_BASE + attrs.defesa * AUTO_SAVE_PER_LEVEL,
})

type MatchMode = 'intro' | 'live' | 'handoff' | 'shot' | 'decision' | 'defense' | 'dice' | 'summary'

interface MatchScreenProps {
  readonly seed: number
  readonly playerName: string
  readonly club: Club
  readonly opponent: Club
  /** Divisão do adversário (-1 = seleção/sem mercado da IA). */
  readonly opponentDivision?: number
  /** Divisão que o SEU clube disputa hoje — define a força do seu elenco. */
  readonly division?: number
  /** Anos em que o ADVERSÁRIO levantou a taça continental — cofre cheio na janela seguinte. */
  readonly continentalTitleYears?: readonly number[]
  readonly competition?: Competition
  /**
   * Jogo que encerra um confronto eliminatório. Se o agregado terminar
   * empatado, o lance dos dados decide quem avança.
   */
  readonly decisive?: boolean
  /** Saldo do jogador no agregado antes deste jogo (gols pró menos gols contra). */
  readonly aggregateGoalDifference?: number
  readonly attributes?: PlayerAttributes
  /** Perks de RPG do craque — afetam lances, decisões e momentum. */
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
  /** Jogadores vendidos (só nos jogos do SEU clube). */
  readonly playerSales?: readonly PlayerSale[]
  readonly onExit: (record: MatchRecord) => void
}

/** Goleiro por competição: liga = muito bom, copa = elite (escala com as estrelas do rival). */
const KEEPER_QUALITY_LIGA = 0.55
const KEEPER_QUALITY_COPA = 0.65
const KEEPER_QUALITY_PER_STAR = 0.03


const keeperQualityFor = (competition: Competition, opponentStrength: number): number =>
  (competition === 'selecao' ? KEEPER_QUALITY_COPA : KEEPER_QUALITY_LIGA) +
  opponentStrength * KEEPER_QUALITY_PER_STAR

export const MatchScreen = ({
  seed,
  playerName,
  club,
  opponent,
  competition = 'liga',
  decisive = false,
  aggregateGoalDifference = 0,
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
  playerSales = [],
  opponentDivision = -1,
  division = -1,
  continentalTitleYears = [],
  onExit,
}: MatchScreenProps) => {
  const userPortrait = usePlayerPortrait(appearance)

  // elenco com o SEU craque dentro — a força do time muda com a escalação
  const teamPlayers = useMemo(() => {
    const squad = squadWithSignings(
      squadPlayersFor(club, careerYear, appearance.gender, division),
      signings,
      careerYear,
      USER_SQUAD_INDEX,
      playerSales,
    )
    return squad.map((player, index) =>
      index === USER_SQUAD_INDEX
        ? userAsSquadPlayer(player, playerName, attributes, playerPosition, playerAge)
        : playerNames[player.id]
          ? { ...player, name: playerNames[player.id] }
          : player,
    )
  }, [club, careerYear, division, playerAge, playerName, attributes, playerPosition, playerNames, signings, playerSales])

  const effectiveLineup = useMemo(
    () => lineup ?? Array.from({ length: 11 }, (_, index) => index),
    [lineup],
  )

  const teamLineupStrength = useMemo(
    () => lineupStrength(teamPlayers, effectiveLineup, FORMATIONS[formation]),
    [effectiveLineup, teamPlayers, formation],
  )
  const opponentLineupStrength = useMemo(() => {
    const squad = rivalSquadFor(opponent, opponentDivision, careerYear, appearance.gender, continentalTitleYears)
    return bestLineupStrength(squad, FORMATIONS['4-3-3'])
  }, [opponent, opponentDivision, careerYear, appearance.gender, continentalTitleYears])
  const teamRating = teamLineupStrength.overall
  const opponentRating = opponentLineupStrength.overall

  /* setores do SEU time e do rival: é o confronto entre eles que decide o jogo */
  const mySectors = teamLineupStrength.sectors
  const theirSectors = opponentLineupStrength.sectors

  const config = useMemo(() => {
    const byRatings = matchConfigForSectors(DEFAULT_MATCH_CONFIG, mySectors, theirSectors)
    // moral entra em campo: nota inicial desloca até ±0.8
    return { ...byRatings, baseRating: byRatings.baseRating + moraleRatingBonus(morale) }
  }, [mySectors, theirSectors, morale])
  const [match, setMatch] = useState<MatchState>(() => startMatch(seed, config))

  const edges = useMemo(() => matchupEdges(mySectors, theirSectors), [mySectors, theirSectors])
  const travamento = useMemo(() => tightness(mySectors, theirSectors), [mySectors, theirSectors])

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
  const teamPlayerIds = useMemo(
    () => effectiveLineup.map((squadIndex) => teamPlayers[squadIndex]?.id ?? `team-${squadIndex}`),
    [effectiveLineup, teamPlayers],
  )
  const userIndex = Math.max(0, effectiveLineup.indexOf(USER_SQUAD_INDEX))

  /**
   * Os homens de frente do SEU time, para dar nome ao gol do companheiro.
   *
   * Ordena pelo x do desenho tático, então quem está mais adiantado vem
   * primeiro. Descarta o slot 0 (goleiro) e o seu próprio: sem isso a
   * assistência creditava o gol ao goleiro, que é o primeiro do vetor.
   */
  const finishers = useMemo(() => {
    const layout = FORMATIONS[formation].layout
    const candidatos = teamSquad
      .map((nome, slot) => ({ nome, slot, x: layout[slot]?.x ?? 0 }))
      .filter(({ slot }) => slot !== 0 && slot !== userIndex)
      .sort((a, b) => b.x - a.x)
      .slice(0, 3)
      .map(({ nome }) => nome)
    return candidatos.length > 0 ? candidatos : ['o companheiro']
  }, [teamSquad, formation, userIndex])
  const opponentPitchPlayers = useMemo(() => {
    // os nomes em campo são os da MELHOR escalação do rival, não os 11 primeiros
    const squad = rivalSquadFor(opponent, opponentDivision, careerYear, appearance.gender, continentalTitleYears)
    return bestLineup(squad, FORMATIONS['4-3-3']).map((index) => squad[index])
  }, [opponent, opponentDivision, careerYear, appearance.gender, continentalTitleYears])
  const opponentSquad = useMemo(
    () => opponentPitchPlayers.map((player) => player.name),
    [opponentPitchPlayers],
  )
  const opponentPlayerIds = useMemo(
    () => opponentPitchPlayers.map((player) => player.id),
    [opponentPitchPlayers],
  )

  /**
   * Os atacantes DELES, para o contra-ataque ter autor.
   *
   * `opponentSquad` sai na ordem dos slots do 4-3-3, então os três últimos são
   * a linha de frente. "Eles marcaram" é legenda; "Emerson apareceu sozinho na
   * área" é narração.
   */
  const rivalStrikers = useMemo(
    () => (opponentSquad.length >= 3 ? opponentSquad.slice(-3) : ['o camisa 9 deles']),
    [opponentSquad],
  )

  const { castFor, narrateMoment, simLineFor } = useMemo(
    () => createMatchNarrator({ playerName, finishers, rivalStrikers }),
    [playerName, finishers, rivalStrikers],
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
        playerRating: finalRating,
        playerName,
        teamSquad,
        opponentSquad,
      }),
    [seed, match.score.team, match.score.opponent, match.rating, playerName, teamSquad, opponentSquad],
  )

  const decisionRngRef = useRef<RngState>(createRng((seed ^ 0x5bd1e995) >>> 0))
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
    /*
     * O gol da mesa tática entrava MUDO. `playStageEvent` só era disparado de
     * dentro do ShotStage e do DiceDuelStage, então gol de plano, de lance
     * corrido e agora de decisão apareciam no placar sem torcida nem jingle,
     * enquanto o gol de chute tinha os dois. A infra de áudio já está de pé —
     * faltava o disparo.
     */
    playStageEvent('goal')
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
    pushLine({ minute: moment.minute, text: narrateMoment(moment), tone: 'you' })
    if (moment.kind === 'playerDecision') setMode('decision')
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
    const failSafe = setTimeout(() => applyReveal(revealAll(reveal)), GOAL_REVEAL_FAILSAFE_MS / speed)
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
      // agregado empatado num mata-mata: o dado decide antes de fechar a partida
      setMode(needsDecider(match, decisive, aggregateGoalDifference) ? 'dice' : 'summary')
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
            text: narrateMoment(moment),
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
      pushLine({ minute: moment.minute, text: narrateMoment(moment), tone: 'normal' })
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
          text: withCast(
            side === 'team' ? TACTIC_LINES.extraTeamGoal : TACTIC_LINES.extraOpponentGoal,
            castFor(Math.floor(clock)),
          ),
          tone: side === 'team' ? 'good' : 'bad',
        })
        setMatch(applyExtraGoal(match, side))
      }
    }
  }, [clock, mode, match, tactic, decisive, aggregateGoalDifference])

  const changeTactic = (next: Tactic): void => {
    if (next === tactic) return
    setTactic(next)
    pushLine({ minute: Math.floor(clock), text: TACTIC_LINES.changed[next], tone: 'normal' })
  }

  /** Simula o resto da partida: lances do jogador viram rolagens pelos atributos. */
  const simulateRest = (): void => {
    setSimConfirmOpen(false)
    if (mode !== 'live') return
    // a força dos elencos pesa: simular contra time melhor tem que ser difícil
    const probs = autoProbsForSectors(autoProbsFor(attributes), mySectors, theirSectors)
    // o técnico assume as decisões — mesma distribuição, escolha por perfil
    const result = simulateToEnd(
      match,
      config,
      probs,
      { contexto: contextoDaDecisao, perfil: 'equilibrado' },
      tacticRngRef.current,
    )
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

  /** Contexto que a decisão lê: atributos, perks, postura, embalo e confronto. */
  const contextoDaDecisao: ContextoDaJogada = {
    attributes,
    perks,
    tatica: tactic,
    momentum: captainMomentum(momentumFor(displayRating(match.rating)), perks),
    edges,
    travamento,
  }

  /**
   * Fecha a decisão. Diferente do passe que existia aqui, o desfecho pode MEXER
   * NO PLACAR — e quando mexe, o gol passa pela coreografia do campo em vez de
   * o número pular na hora, igual a qualquer outro gol da partida.
   */
  const onDecisionResolved = (outcome: DecisionOutcome, next: RngState): void => {
    decisionRngRef.current = next
    const moment = currentMoment(match)
    const { desfecho, notaDelta } = outcome.resolucao
    const marcouPraMim = desfecho === 'gol'
    const marcouPeloTime = desfecho === 'chance' && outcome.assistConvertida
    const sofreu = desfecho === 'contra'
    const cast = castFor(next.seed)
    const action: LogLine = {
      minute: moment.minute,
      text: withCast(acaoDaJogada(outcome.jogada.id, desfecho), cast),
      tone:
        desfecho === 'gol' || desfecho === 'chance'
          ? 'good'
          : desfecho === 'nada'
            ? 'normal'
            : 'bad',
    }
    const closingTemplate = fechoDaDecisao(
      desfecho,
      outcome.assistConvertida,
      next.seed,
    )
    const closing = closingTemplate ? withCast(closingTemplate, cast) : null

    // Primeira batida: explica imediatamente o que o jogador acabou de fazer.
    pushLine(action)

    if (marcouPraMim || marcouPeloTime || sofreu) {
      choreographGoal(sofreu ? 'opponent' : 'team', {
        minute: moment.minute,
        text: closing ?? action.text,
        tone: sofreu ? 'bad' : 'good',
      })
    } else if (closing) {
      // Chance criada e desperdiçada: não há gol para coreografar, então o
      // segundo grito entra já na sequência da ação.
      pushLine({
        minute: moment.minute,
        text: closing,
        tone: 'normal',
      })
      liveStatsRef.current.teamShots += 1
    }

    setMatch(
      applyDecisionResult(match, desfecho, notaDelta, outcome.assistConvertida, config),
    )
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

  /*
   * No lance o placar acompanha o palco dentro da mesma cena centralizada —
   * posicionar os dois separadamente exigia adivinhar a altura de um para
   * deslocar o outro, e a conta quebrava quando o lance era o dado.
   */
  const scoreboard = (
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
  )

  return (
    <div className={`match match-live-layout${isLance ? ' match-in-lance' : ''}`}>
      {!isLance && scoreboard}

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
        <div className="lance-scene">
          {scoreboard}
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
        </div>
      ) : isLance ? (
        <div className="lance-scene">
        {scoreboard}
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
        </div>
      ) : (
        <>
          <div className={`live-pitch-stage${mode === 'decision' ? ' live-pitch-stage-decision' : ''}`}>
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
              teamPlayerIds={teamPlayerIds}
              opponentPlayerIds={opponentPlayerIds}
              gender={appearance.gender}
              userName={playerName}
              userFaceUrl={userPortrait}
              directive={directive}
              frozen={mode === 'decision'}
              onDirectiveComplete={onDirectiveComplete}
            />
            {mode === 'decision' && (
              <DecisionChallenge
                intro={narrateMoment(currentMoment(match))}
                rng={decisionRngRef.current}
                contexto={contextoDaDecisao}
                onResolved={onDecisionResolved}
              />
            )}
          </div>

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

      <div className="match-log match-log-live" role="log" aria-live="polite" aria-relevant="additions text">
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

      {mode === 'summary' && (
        <MatchSummary
          club={club}
          opponent={opponent}
          crestUrls={crestUrls}
          match={match}
          finalRating={finalRating}
          outcome={outcome}
          bestPlayer={bestPlayer}
          possessionPct={possessionPct}
          liveStats={liveStatsRef.current}
          onContinue={finishMatch}
        />
      )}
    </div>
  )
}
