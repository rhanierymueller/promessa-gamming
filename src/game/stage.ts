import {
  DEFAULT_ATTRIBUTES,
  defenseTuning,
  shotTuning,
  wallTuning,
  type PlayerAttributes,
} from '../engine/career/attributes'
import {
  DEFAULT_DEFENSE_CONFIG,
  generateOpponentShot,
  resolveDive,
} from '../engine/defense/defense'
import { createRng, nextFloat, type RngState } from '../engine/rng'
import { DEFAULT_SHOT_CONFIG, goalCenter } from '../engine/shot/config'
import { flightGroundY, flightHeight, flightX } from '../engine/shot/flight'
import { simulateShot, type ShotSimulation } from '../engine/shot/shot'
import type { ShotOutcomeKind, Vec2 } from '../engine/shot/types'
import { resolveWall, wallForShot, type WallConfig } from '../engine/shot/wall'

export const CFG = DEFAULT_SHOT_CONFIG
export const TOTAL_SHOTS = 10
const START_OFFSETS = [0, -18, 20, -30, 32, -8, 26, -38, 40, 12]
const RUNUP_DURATION = 0.45
const RESULT_DURATION = 1.2
/** Trave: mais tempo p/ ver a bola quicar e sair rolando. */
const POST_RESULT_DURATION = 2.0
const KEEPER_DIVE_SPEED = 4.2 // mais frames no ar: mergulho legível, não teleporte
const CONFETTI_LIFE = 1.4

export type Phase = 'intro' | 'ready' | 'runup' | 'flying' | 'result' | 'end'
export type StageEvent = 'kick' | ShotOutcomeKind | 'blocked' | 'defenseSave' | 'defenseConcede'
export type StageMode = 'shoot' | 'defend'

const WALL_JUMP_CHANCE = 0.75
const DEFENSE_READY_DELAY = 0.9
/** Falta é cobrada de mais longe que o pênalti/finalização. */
const FREE_KICK_BALL_Y = 284
const MAX_DIVE_REACH = 44
const DIVE_DRAG_SCALE = 1.6


export interface Confetto {
  readonly x: number
  readonly y: number
  readonly vy: number
  readonly color: string
  readonly t: number
}

export interface BallPost {
  readonly kind: ShotOutcomeKind
  readonly x: number
  readonly y: number
  readonly vx: number
  readonly vy: number
  readonly t: number
}

export interface StageMessage {
  readonly text: string
  readonly color: string
  readonly t: number
}

export interface StageState {
  readonly phase: Phase
  readonly mode: StageMode
  readonly totalShots: number
  /** Falta: barreira entre a bola e o gol. */
  readonly hasWall: boolean
  readonly wall: WallConfig | null
  readonly wallJumped: boolean
  readonly blockedByWall: boolean
  /** Defesa: habilidade do cobrador rival e o mergulho do jogador. */
  readonly defenseSkill: number
  readonly diveX: number | null
  /** Plano do mergulho: arrasto para cima = voa alto (bola no ângulo). */
  readonly diveHigh: boolean
  readonly diveStartT: number
  readonly readyTimer: number
  /** De onde a bola é cobrada (falta = mais longe do gol). */
  readonly ballStartY: number
  /** Atributos do craque — afinam chute, cobrança e defesa. */
  readonly attrs: PlayerAttributes
  /** Meio ciclo da régua deste palco (depende da habilidade). */
  readonly barSweep: number
  /** Qualidade do goleiro rival (treino < liga < copa). */
  readonly keeperQuality: number
  readonly time: number
  readonly shotIndex: number
  readonly goals: number
  readonly results: readonly ShotOutcomeKind[]
  readonly ballX: number
  readonly rng: RngState
  readonly sim: ShotSimulation | null
  readonly runP: number
  readonly flightT: number
  readonly keeperDiveP: number
  readonly resultTimer: number
  readonly msg: StageMessage | null
  readonly shake: number
  readonly netBulge: { readonly x: number; readonly y: number; readonly t: number } | null
  readonly missMark: { readonly x: number; readonly y: number } | null
  readonly post: BallPost | null
  readonly confetti: readonly Confetto[] | null
}

const ballXForShot = (shotIndex: number): number =>
  goalCenter(CFG) + START_OFFSETS[shotIndex % START_OFFSETS.length]

/** Goleiro do treino: bom, mas abaixo dos jogos oficiais. */
export const TRAINING_KEEPER_QUALITY = 0.4

export const createStage = (
  seed: number,
  totalShots: number = TOTAL_SHOTS,
  hasWall = false,
  attrs: PlayerAttributes = DEFAULT_ATTRIBUTES,
  keeperQuality: number = TRAINING_KEEPER_QUALITY,
): StageState => ({
  attrs,
  barSweep: barSweepFor(hasWall ? attrs.cobranca : attrs.finalizacao),
  keeperQuality,
  phase: 'intro',
  mode: 'shoot',
  defenseSkill: 0,
  diveX: null,
  diveHigh: false,
  diveStartT: 0,
  readyTimer: 0,
  ballStartY: hasWall ? FREE_KICK_BALL_Y : CFG.ballStartY,
  totalShots,
  hasWall,
  wall: hasWall ? wallForShot(ballXForShot(0), goalCenter(CFG)) : null,
  wallJumped: false,
  blockedByWall: false,
  time: 0,
  shotIndex: 0,
  goals: 0,
  results: [],
  ballX: ballXForShot(0),
  rng: createRng(seed),
  sim: null,
  runP: 0,
  flightT: 0,
  keeperDiveP: 0,
  resultTimer: 0,
  msg: null,
  shake: 0,
  netBulge: null,
  missMark: null,
  post: null,
  confetti: null,
})

/** Defesa: o chute do rival é gerado no armar do lance — o jogador só reage. */
const DEFENSE_FLIGHT_SLOWDOWN = 2.2 // voo mais longo: janela humana de reação

const armDefense = (state: StageState): StageState => {
  // treino: o cobrador endurece a cada chute da rodada
  const skill = Math.min(1, state.defenseSkill + state.shotIndex * 0.06)
  const generated = generateOpponentShot(state.rng, skill, state.ballX, CFG)
  const flight = { ...generated.value, duration: generated.value.duration * DEFENSE_FLIGHT_SLOWDOWN }
  const sim: ShotSimulation = {
    command: {
      power: flight.power,
      targetX: flight.targetX,
      targetHeight: flight.targetHeight,
      curve: flight.curve,
    },
    flight,
    keeper: { reactT: 2, diveX: goalCenter(CFG) },
    outcome: { kind: 'miss', finalX: flightX(flight, 1), isGolaco: false },
  }
  return { ...state, sim, rng: generated.next }
}

const freshShot = (state: StageState, shotIndex: number): StageState => {
  const base: StageState = {
    ...state,
    phase: 'ready',
    shotIndex,
    ballX: ballXForShot(shotIndex),
    wall: state.hasWall ? wallForShot(ballXForShot(shotIndex), goalCenter(CFG)) : null,
    wallJumped: false,
    blockedByWall: false,
    diveX: null,
    diveHigh: false,
    diveStartT: 0,
    readyTimer: 0,
    sim: null,
    runP: 0,
    flightT: 0,
    keeperDiveP: 0,
    resultTimer: 0,
    netBulge: null,
    missMark: null,
    post: null,
    confetti: null,
  }
  return state.mode === 'defend' ? armDefense(base) : base
}

export const createDefenseStage = (
  seed: number,
  skill: number,
  attrs: PlayerAttributes = DEFAULT_ATTRIBUTES,
  totalShots = 1,
): StageState => ({
  ...createStage(seed, totalShots, false, attrs),
  mode: 'defend',
  defenseSkill: skill,
})

export const beginRound = (state: StageState): StageState =>
  freshShot({ ...state, goals: 0, results: [], msg: null }, 0)

/** Arrasto para cima além deste tanto = mergulho alto (bola no ângulo). */
const DIVE_HIGH_DRAG = 16

/**
 * Defesa: o arrasto define o mergulho — lateral escolhe o canto, para CIMA
 * voa alto. Só vale durante o voo, uma vez.
 */
export const tryDive = (state: StageState, dragDx: number, dragDy = 0): StageState => {
  if (state.mode !== 'defend' || state.phase !== 'flying' || state.diveX !== null || !state.sim) {
    return state
  }
  const center = goalCenter(CFG)
  const diveX = Math.min(
    center + MAX_DIVE_REACH,
    Math.max(center - MAX_DIVE_REACH, center + dragDx * DIVE_DRAG_SCALE),
  )
  return {
    ...state,
    diveX,
    diveHigh: dragDy < -DIVE_HIGH_DRAG,
    diveStartT: state.flightT,
    sim: { ...state.sim, keeper: { ...state.sim.keeper, diveX } },
  }
}

export const tryStartShot = (state: StageState, points: readonly Vec2[]): StageState => {
  if (state.phase !== 'ready' || state.mode === 'defend') return state
  return armPlayerShot(state, points)
}

/** Meio ciclo da régua de chute (topo→base) em segundos. */
const BAR_SWEEP_SECONDS = 0.65

/** Régua por habilidade: pé nervoso varre rápido, pé educado dá controle. */
const BAR_SWEEP_MIN = 0.42
const BAR_SWEEP_PER_LEVEL = 0.04

export const barSweepFor = (level: number): number =>
  BAR_SWEEP_MIN + (Math.min(10, Math.max(1, level)) - 1) * BAR_SWEEP_PER_LEVEL

/** Posição da régua no tempo: onda triangular 1 (topo) ⇄ 0 (base). */
export const barTAt = (time: number, sweepSeconds: number = BAR_SWEEP_SECONDS): number => {
  const cycle = (time / sweepSeconds) % 2
  return cycle < 1 ? 1 - cycle : cycle - 1
}

const armPlayerShot = (state: StageState, points: readonly Vec2[]): StageState => {
  const shotConfig = shotTuning({ ...CFG, ballStartY: state.ballStartY }, state.attrs.finalizacao)
  const { value, next } = simulateShot(
    points,
    state.ballX,
    state.shotIndex,
    state.rng,
    shotConfig,
    state.keeperQuality,
    barTAt(state.time, state.barSweep),
  )
  if (!value) return state

  if (state.wall) {
    const jumpRoll = nextFloat(next)
    const jumped = jumpRoll.value < WALL_JUMP_CHANCE
    const blocked = resolveWall(value.flight, wallTuning(state.wall, state.attrs.cobranca), jumped) === 'blocked'
    const sim: ShotSimulation = blocked
      ? {
          ...value,
          outcome: { kind: 'miss', finalX: flightX(value.flight, state.wall.flightT), isGolaco: false },
        }
      : value
    return {
      ...state,
      phase: 'runup',
      sim,
      rng: jumpRoll.next,
      runP: 0,
      keeperDiveP: 0,
      wallJumped: jumped,
      blockedByWall: blocked,
    }
  }

  return { ...state, phase: 'runup', sim: value, rng: next, runP: 0, keeperDiveP: 0 }
}

const CONFETTI_COLORS = ['#FFD23F', '#E85D75', '#F5F0E6', '#FF8C42']

const spawnConfetti = (): Confetto[] =>
  Array.from({ length: 26 }, () => ({
    x: 20 + Math.random() * 140,
    y: 118 + Math.random() * 14,
    vy: -(14 + Math.random() * 22),
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    t: -Math.random() * 0.25,
  }))

const MESSAGES: Record<ShotOutcomeKind, StageMessage> = {
  goal: { text: 'GOOOL!', color: '#FFD23F', t: 0 },
  save: { text: 'DEFENDEU!', color: '#E85D75', t: 0 },
  post: { text: 'NA TRAVE!', color: '#FF8C42', t: 0 },
  miss: { text: 'PRA FORA!', color: '#9AA3B5', t: 0 },
}

/** Defesa: no fim do voo, direção e timing do mergulho decidem tudo. */
const resolveDefense = (state: StageState): [StageState, StageEvent[]] => {
  const sim = state.sim!
  const center = goalCenter(CFG)
  const saved =
    resolveDive(
      sim.flight,
      state.diveX,
      state.diveStartT,
      center,
      defenseTuning(DEFAULT_DEFENSE_CONFIG, state.attrs.defesa),
      state.diveHigh,
    ) === 'saved'
  const finalX = flightX(sim.flight, 1)
  const finalY = CFG.goal.floorY - sim.flight.targetHeight
  // na ponta da luva = espalmada: a bola rebate em jogo
  const deflected = saved && state.diveX !== null && Math.abs(state.diveX - finalX) > 8

  const next: StageState = {
    ...state,
    phase: 'result',
    resultTimer: 0,
    results: [...state.results, saved ? 'save' : 'goal'],
    sim: { ...sim, outcome: { kind: saved ? 'save' : 'goal', finalX, isGolaco: false, deflected } },
    msg: saved
      ? deflected
        ? { text: 'ESPALMOU!', color: '#FF8C42', t: 0 }
        : { text: 'DEFESAÇA!', color: '#FFD23F', t: 0 }
      : { text: 'GOL DELES…', color: '#E85D75', t: 0 },
    netBulge: saved ? null : { x: finalX, y: finalY, t: 0 },
    shake: saved ? 0 : 2,
    post: {
      kind: 'save',
      x: finalX,
      y: finalY,
      vx: saved ? (finalX < center ? -1 : 1) * (deflected ? 40 : 24) : 0,
      vy: saved ? (deflected ? 18 : 26) : 12,
      t: 0,
    },
  }
  return [next, [saved ? 'defenseSave' : 'defenseConcede']]
}

/** Bola parada na barreira: rebote curto e mensagem própria. */
const resolveWallBlock = (state: StageState): [StageState, StageEvent[]] => {
  const sim = state.sim!
  const wall = state.wall!
  const x = flightX(sim.flight, wall.flightT)
  const groundY = flightGroundY(sim.flight, wall.flightT, CFG)
  const height = flightHeight(sim.flight, wall.flightT)
  const next: StageState = {
    ...state,
    phase: 'result',
    resultTimer: 0,
    results: [...state.results, 'miss'],
    msg: { text: 'NA BARREIRA!', color: '#FF8C42', t: 0 },
    shake: 1,
    post: { kind: 'save', x, y: groundY - height, vx: -6, vy: -30, t: 0 },
  }
  return [next, ['blocked']]
}

const resolveFlight = (state: StageState): [StageState, StageEvent[]] => {
  const sim = state.sim!
  const { kind, finalX, isGolaco } = sim.outcome
  const finalY = CFG.goal.floorY - sim.flight.targetHeight
  const isGoal = kind === 'goal'

  const post: BallPost = {
    kind,
    x: finalX,
    y: finalY,
    vx: kind === 'save'
      ? (finalX < goalCenter(CFG) ? -1 : 1) * (sim.outcome.deflected ? 34 + sim.flight.power * 28 : 26)
      : kind === 'post' ? (goalCenter(CFG) - finalX) * 1.5 + 8 : kind === 'miss' ? (sim.flight.targetX - sim.flight.startX) * 0.06 : 0,
    vy: kind === 'goal' ? 14 : kind === 'miss' ? -8 : kind === 'post' ? 55 : 30,
    t: 0,
  }

  const next: StageState = {
    ...state,
    phase: 'result',
    resultTimer: 0,
    goals: state.goals + (isGoal ? 1 : 0),
    results: [...state.results, kind],
    msg: isGoal && sim.outcome.offPost
      ? { text: 'DE TRAVE... GOL!', color: '#FFD23F', t: 0 }
      : isGoal && isGolaco
        ? { text: 'GOLAÇO!!', color: '#FFD23F', t: 0 }
        : kind === 'save' && sim.outcome.deflected
          ? { text: 'ESPALMOU!', color: '#FF8C42', t: 0 }
          : MESSAGES[kind],
    shake: isGoal ? 3 : kind === 'post' ? 2 : 0,
    netBulge: isGoal ? { x: finalX, y: finalY, t: 0 } : null,
    missMark: kind === 'miss' ? { x: finalX, y: finalY } : null,
    confetti: isGoal ? spawnConfetti() : null,
    post,
  }
  return [next, [kind]]
}

const tickResult = (state: StageState, dt: number): StageState => {
  const resultTimer = state.resultTimer + dt
  const isDeflectedSave =
    state.results[state.results.length - 1] === 'save' && state.sim?.outcome.deflected === true
  const duration =
    state.post?.kind === 'post' || isDeflectedSave ? POST_RESULT_DURATION : RESULT_DURATION
  if (resultTimer > duration) {
    const nextShot = state.shotIndex + 1
    return nextShot >= state.totalShots
      ? { ...state, phase: 'end', resultTimer }
      : freshShot(state, nextShot)
  }
  return {
    ...state,
    resultTimer,
    msg: state.msg ? { ...state.msg, t: state.msg.t + dt } : null,
    netBulge: state.netBulge ? { ...state.netBulge, t: state.netBulge.t + dt } : null,
    confetti: state.confetti
      ? state.confetti.map((c) => ({
          ...c,
          t: c.t + dt,
          y: c.t > 0 ? c.y + c.vy * dt : c.y,
          vy: c.t > 0 ? c.vy + 50 * dt : c.vy,
        }))
      : null,
    post: state.post ? tickPost(state.post, dt) : null,
  }
}

const tickPost = (post: BallPost, dt: number): BallPost => {
  const y = post.y + post.vy * dt
  const floor = CFG.goal.floorY + 4
  const grounded = post.kind !== 'goal' && y >= floor
  const bouncing = grounded && post.vy > 30
  // no chão sem quicar: a bola ROLA desacelerando (atrito)
  const rolling = grounded && !bouncing
  return {
    ...post,
    t: post.t + dt,
    x: post.x + post.vx * dt,
    y: grounded ? floor : y,
    vx: rolling ? post.vx * Math.max(0, 1 - 1.6 * dt) : post.vx,
    vy: bouncing
      ? post.vy * -0.45
      : rolling
        ? 0
        : post.kind !== 'miss'
          ? post.vy + 120 * dt
          : post.vy,
  }
}

export const tick = (state: StageState, dt: number): [StageState, StageEvent[]] => {
  const base: StageState = {
    ...state,
    time: state.time + dt,
    shake: Math.max(0, state.shake - dt * 10),
  }

  if (base.phase === 'ready' && base.mode === 'defend') {
    const readyTimer = base.readyTimer + dt
    return readyTimer >= DEFENSE_READY_DELAY
      ? [{ ...base, readyTimer, phase: 'runup', runP: 0 }, []]
      : [{ ...base, readyTimer }, []]
  }

  if (base.phase === 'runup') {
    const runP = base.runP + dt / RUNUP_DURATION
    return runP >= 1
      ? [{ ...base, runP: 1, phase: 'flying', flightT: 0 }, ['kick']]
      : [{ ...base, runP }, []]
  }

  if (base.phase === 'flying' && base.sim) {
    const flightT = Math.min(1, base.flightT + dt / base.sim.flight.duration)
    const diving =
      base.mode === 'defend' ? base.diveX !== null : flightT >= base.sim.keeper.reactT
    const keeperDiveP = diving ? Math.min(1, base.keeperDiveP + dt * KEEPER_DIVE_SPEED) : base.keeperDiveP
    const advanced = { ...base, flightT, keeperDiveP }
    if (base.blockedByWall && base.wall && flightT >= base.wall.flightT) {
      return resolveWallBlock({ ...advanced, flightT: base.wall.flightT })
    }
    if (flightT >= 1) {
      return base.mode === 'defend' ? resolveDefense(advanced) : resolveFlight(advanced)
    }
    return [advanced, []]
  }

  if (base.phase === 'result') {
    return [tickResult(base, dt), []]
  }

  return [base, []]
}

/** Posição da bola durante o voo, no espaço lógico 180×320. */
export const ballFlightPosition = (state: StageState): { x: number; y: number; groundY: number; r: number } | null => {
  if (!state.sim || state.phase !== 'flying') return null
  const { flight } = state.sim
  const groundY = flightGroundY(flight, state.flightT, CFG)
  return {
    x: flightX(flight, state.flightT),
    y: groundY - flightHeight(flight, state.flightT),
    groundY,
    r: 4 - 2 * state.flightT,
  }
}

export const isConfettoVisible = (c: Confetto): boolean => c.t > 0 && c.t <= CONFETTI_LIFE

export const confettoAlpha = (c: Confetto): number => Math.max(0, 1 - c.t / CONFETTI_LIFE)
