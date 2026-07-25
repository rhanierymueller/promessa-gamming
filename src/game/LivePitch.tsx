import { useEffect, useRef } from 'react'
import gramadoUrl from '../assets/backgrounds/gramado.jpg'
import { fieldName } from '../data/squadNames'
import type { Tactic } from '../engine/match/tactics'

/** Estatísticas VIVAS da mesa — contadas dos eventos reais da simulação. */
export interface LivePitchStats {
  teamShots: number
  teamOnTarget: number
  oppShots: number
  oppOnTarget: number
  /** Segundos de posse acumulados por lado. */
  possessionTeam: number
  possessionOpp: number
}

export const createLiveStats = (): LivePitchStats => ({
  teamShots: 0,
  teamOnTarget: 0,
  oppShots: 0,
  oppOnTarget: 0,
  possessionTeam: 1,
  possessionOpp: 1,
})

/**
 * Mesa tática ao vivo v2: simulação de posse pé em pé — passes entre
 * jogadores nomeados, condução, perda de bola e finalizações com desfecho
 * visual (defesa, pra fora). Gols de verdade chegam como diretiva da engine
 * e são coreografados até a rede. Puramente visual: o placar mora na engine.
 */
export interface PitchDirective {
  readonly id: number
  /** 'goal': coreografa até a rede; 'deliver': leva a bola até o protagonista do lance. */
  readonly kind: 'goal' | 'deliver'
  readonly side: 'team' | 'opponent'
}

interface LivePitchProps {
  readonly speed: number
  readonly teamColor: string
  readonly opponentColor: string
  readonly teamSquad: readonly string[]
  readonly opponentSquad: readonly string[]
  /** Nome do SEU craque — destacado em amarelo no ataque. */
  readonly userName: string
  readonly directive: PitchDirective | null
  /** Instrução tática atual — muda o comportamento do bloco em tempo real. */
  readonly tactic: Tactic
  /** Contadores vivos (mutável de propósito: a mesa ACUMULA eventos reais). */
  readonly stats: LivePitchStats
  /** Desenho tático do SEU time (11 pontos normalizados); rival usa o padrão. */
  readonly teamLayout?: readonly { readonly x: number; readonly y: number }[]
  /** Índice do seu craque no desenho (slot da formação escolhida). */
  readonly userIndex?: number
  readonly onDirectiveComplete?: (id: number) => void
}

const W = 360
const H = 232
const PITCH_TOP = 8
const PITCH_BOTTOM = 216
const USER_COLOR = '#FFD23F'

interface Vec {
  x: number
  y: number
}

/** 1-4-3-3 normalizado, atacando para a direita. Índice 9 = centroavante (o usuário). */
const FORMATION: readonly Vec[] = [
  { x: 0.05, y: 0.5 },
  { x: 0.17, y: 0.16 }, { x: 0.15, y: 0.39 }, { x: 0.15, y: 0.61 }, { x: 0.17, y: 0.84 },
  { x: 0.3, y: 0.28 }, { x: 0.28, y: 0.5 }, { x: 0.3, y: 0.72 },
  { x: 0.43, y: 0.18 }, { x: 0.45, y: 0.5 }, { x: 0.43, y: 0.82 },
]

export const USER_FORMATION_INDEX = 9

interface SimPlayer {
  name: string
  side: 'team' | 'opponent'
  isUser: boolean
  base: Vec
  pos: Vec
}

type SimPhase = 'idle' | 'ballMoving' | 'holding' | 'goalFlash'

interface SimState {
  players: SimPlayer[]
  holder: number
  ball: Vec
  ballFrom: Vec
  ballTo: Vec
  ballProgress: number
  ballFlightTime: number
  phase: SimPhase
  holdTimer: number
  flashTimer: number
  pendingOutcome: 'none' | 'saved' | 'wide' | 'goal'
  directiveQueue: PitchDirective | null
  lastDirectiveId: number
  completedDirectiveId: number
  lastGoalSide: 'team' | 'opponent'
}

const toPitch = (v: Vec): Vec => ({
  x: 12 + v.x * (W - 24),
  y: PITCH_TOP + v.y * (PITCH_BOTTOM - PITCH_TOP),
})

const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y)

export const LivePitch = ({
  speed,
  teamColor,
  opponentColor,
  teamSquad,
  opponentSquad,
  userName,
  directive,
  tactic,
  stats,
  teamLayout = FORMATION,
  userIndex = USER_FORMATION_INDEX,
  onDirectiveComplete,
}: LivePitchProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const speedRef = useRef(speed)
  speedRef.current = speed
  const tacticRef = useRef(tactic)
  tacticRef.current = tactic
  const statsRef = useRef(stats)
  statsRef.current = stats
  const simRef = useRef<SimState | null>(null)
  const directiveRef = useRef<PitchDirective | null>(directive)
  directiveRef.current = directive
  const onCompleteRef = useRef(onDirectiveComplete)
  onCompleteRef.current = onDirectiveComplete

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const scale = 2
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(scale, scale)

    const makePlayers = (): SimPlayer[] => {
      const players: SimPlayer[] = []
      teamLayout.forEach((base, i) => {
        players.push({
          name: i === userIndex ? userName : teamSquad[i] ?? `#${i}`,
          side: 'team',
          isUser: i === userIndex,
          base: { ...base },
          pos: { ...base },
        })
      })
      FORMATION.forEach((base, i) => {
        players.push({
          name: opponentSquad[i] ?? `#${i}`,
          side: 'opponent',
          isUser: false,
          base: { x: 1 - base.x, y: 1 - base.y },
          pos: { x: 1 - base.x, y: 1 - base.y },
        })
      })
      return players
    }

    const sim: SimState = {
      players: makePlayers(),
      holder: 6, // volante inicia com a bola
      ball: { ...FORMATION[6] },
      ballFrom: { ...FORMATION[6] },
      ballTo: { ...FORMATION[6] },
      ballProgress: 1,
      ballFlightTime: 0.5,
      phase: 'holding',
      holdTimer: 0.4,
      flashTimer: 0,
      pendingOutcome: 'none',
      directiveQueue: null,
      lastDirectiveId: 0,
      completedDirectiveId: 0,
      lastGoalSide: 'opponent',
    }
    simRef.current = sim

    const teammatesOf = (side: 'team' | 'opponent'): number[] =>
      sim.players.map((p, i) => (p.side === side ? i : -1)).filter((i) => i > 0) // exclui goleiros de receber (índices 0 e 11)

    const attackX = (side: 'team' | 'opponent'): number => (side === 'team' ? 1 : 0)

    const startBallFlight = (to: Vec, flightTime: number): void => {
      sim.ballFrom = { ...sim.ball }
      sim.ballTo = to
      sim.ballProgress = 0
      sim.ballFlightTime = flightTime
      sim.phase = 'ballMoving'
    }

    const passTo = (targetIndex: number, urgent = false): void => {
      sim.holder = targetIndex
      const flightTime = urgent ? 0.2 + Math.random() * 0.1 : 0.4 + Math.random() * 0.25
      startBallFlight({ ...sim.players[targetIndex].pos }, flightTime)
    }

    /** Escolhe um companheiro: prefere quem está à frente, a distância sã. */
    const pickPassTarget = (side: 'team' | 'opponent'): number => {
      const holderPos = sim.players[sim.holder].pos
      const goalX = attackX(side)
      const candidates = teammatesOf(side)
        .filter((i) => i !== sim.holder)
        .map((i) => {
          const p = sim.players[i].pos
          const d = dist(holderPos, p)
          const forward = side === 'team' ? p.x - holderPos.x : holderPos.x - p.x
          const score = (0.5 + forward) / (0.25 + Math.abs(d - 0.22)) + Math.random() * 0.8
          return { i, score, d }
        })
        .filter((c) => c.d > 0.06 && c.d < 0.5)
        .sort((a, b) => b.score - a.score)
      void goalX
      return candidates[0]?.i ?? sim.holder
    }

    const nearestOpponent = (side: 'team' | 'opponent', near: Vec): number => {
      const rivals = sim.players
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.side !== side)
        .sort((a, b) => dist(a.p.pos, near) - dist(b.p.pos, near))
      return rivals[0].i
    }

    const countShot = (side: 'team' | 'opponent', onTarget: boolean): void => {
      const s = statsRef.current
      if (side === 'team') {
        s.teamShots++
        if (onTarget) s.teamOnTarget++
      } else {
        s.oppShots++
        if (onTarget) s.oppOnTarget++
      }
    }

    const shoot = (side: 'team' | 'opponent', forcedGoal: boolean): void => {
      const goalMouth: Vec = { x: attackX(side), y: 0.42 + Math.random() * 0.16 }
      if (forcedGoal) {
        sim.pendingOutcome = 'goal'
        countShot(side, true)
        startBallFlight(goalMouth, 0.4)
        return
      }
      const outcome = Math.random() < 0.55 ? 'saved' : 'wide'
      sim.pendingOutcome = outcome
      countShot(side, outcome === 'saved')
      const target: Vec =
        outcome === 'wide'
          ? { x: attackX(side), y: Math.random() < 0.5 ? 0.16 : 0.84 }
          : goalMouth
      startBallFlight(target, 0.38)
    }

    /** Índice do protagonista da entrega: você, ou o atacante central deles. */
    const deliveryTarget = (side: 'team' | 'opponent'): number =>
      side === 'team' ? userIndex : 11 + USER_FORMATION_INDEX

    /** Decide a próxima ação do portador. */
    const decide = (): void => {
      const holder = sim.players[sim.holder]
      const side = holder.side

      // diretiva de ENTREGA: levar a bola até o protagonista do próximo lance
      if (sim.directiveQueue?.kind === 'deliver') {
        const queue = sim.directiveQueue
        const target = deliveryTarget(queue.side)
        if (sim.holder === target) {
          sim.directiveQueue = null
          if (sim.completedDirectiveId !== queue.id) {
            sim.completedDirectiveId = queue.id
            onCompleteRef.current?.(queue.id)
          }
          sim.holdTimer = 9 // congela com a bola no pé até o mini-game assumir
          return
        }
        if (side === queue.side) {
          const holderPos = holder.pos
          const targetPos = sim.players[target].pos
          // urgência: lançamento longo direto se der; senão UMA escala rápida
          if (dist(holderPos, targetPos) < 0.75) {
            passTo(target, true)
          } else {
            const closer = teammatesOf(side)
              .filter((i) => i !== sim.holder)
              .sort((a, b) => dist(sim.players[a].pos, targetPos) - dist(sim.players[b].pos, targetPos))[0]
            passTo(closer ?? target, true)
          }
        } else {
          // a bola está com o outro time: perde para o lado do lance
          passTo(nearestOpponent(side, holder.pos), true)
        }
        return
      }

      // diretiva de gol da engine: coreografa até a rede
      if (sim.directiveQueue && sim.directiveQueue.side === side) {
        const attackers = teammatesOf(side).filter((i) => {
          const p = sim.players[i].pos
          return side === 'team' ? p.x > 0.55 : p.x < 0.45
        })
        const inFinalThird = side === 'team' ? holder.pos.x > 0.62 : holder.pos.x < 0.38
        if (inFinalThird || attackers.length === 0) {
          sim.directiveQueue = null
          shoot(side, true)
        } else {
          passTo(attackers[Math.floor(Math.random() * attackers.length)])
        }
        return
      }
      if (sim.directiveQueue && sim.directiveQueue.side !== side) {
        // a bola precisa trocar de lado para o gol acontecer
        passTo(nearestOpponent(side, holder.pos))
        return
      }

      const inFinalThird = side === 'team' ? holder.pos.x > 0.7 : holder.pos.x < 0.3
      const shootChance = side === 'team'
        ? tacticRef.current === 'contra-ataque' ? 0.5 : tacticRef.current === 'recuar' ? 0.28 : 0.4
        : 0.4
      const roll = Math.random()
      if (inFinalThird && roll < shootChance) {
        shoot(side, false)
        return
      }
      if (roll < 0.12) {
        // perdeu a bola: interceptação
        passTo(nearestOpponent(side, holder.pos))
        return
      }
      if (roll < 0.28) {
        // condução: avança com a bola
        const dir = side === 'team' ? 1 : -1
        holder.base = {
          x: Math.max(0.08, Math.min(0.92, holder.base.x + 0.09 * dir)),
          y: Math.max(0.12, Math.min(0.88, holder.base.y + (Math.random() - 0.5) * 0.12)),
        }
        sim.holdTimer = 0.5
        sim.phase = 'holding'
        return
      }
      passTo(pickPassTarget(side))
    }

    const resolveShotOutcome = (): void => {
      const side = sim.players[sim.holder].side
      const outcome = sim.pendingOutcome
      sim.pendingOutcome = 'none'
      if (outcome === 'goal') {
        sim.phase = 'goalFlash'
        sim.flashTimer = 0.9
        return
      }
      // defesa: goleiro rival fica com a bola; fora: tiro de meta
      const rivalKeeper = side === 'team' ? 11 : 0
      sim.holder = rivalKeeper
      sim.ball = { ...sim.players[rivalKeeper].pos }
      sim.phase = 'holding'
      sim.holdTimer = 0.6
    }

    const restartAfterGoal = (): void => {
      // quem sofreu o gol recomeça com a bola no seu volante
      const kicker = sim.lastGoalSide === 'team' ? 17 : 6
      sim.holder = kicker
      sim.ball = { ...sim.players[kicker].pos }
      sim.phase = 'holding'
      sim.holdTimer = 0.7
    }

    const update = (dt: number): void => {
      // nova diretiva de gol?
      const directive = directiveRef.current
      if (directive && directive.id !== sim.lastDirectiveId) {
        sim.lastDirectiveId = directive.id
        sim.directiveQueue = directive
        // entrega: corta qualquer "pensamento" em andamento — o lance é agora
        if (directive.kind === 'deliver' && sim.phase === 'holding') {
          sim.holdTimer = Math.min(sim.holdTimer, 0.08)
        }
      }

      // movimento coletivo: o bloco com a posse AVANÇA, o outro recua e pressiona
      const clamp01 = (v: number, min: number, max: number): number =>
        Math.min(max, Math.max(min, v))
      const possessSide = sim.players[sim.holder].side
      // posse REAL: cada segundo com a bola conta
      if (possessSide === 'team') statsRef.current.possessionTeam += dt
      else statsRef.current.possessionOpp += dt
      // tática do SEU time: recuar tranca o bloco; contra-ataque arma o bote
      const tacticNow = tacticRef.current
      const teamShift = tacticNow === 'recuar' ? -0.08 : tacticNow === 'contra-ataque' ? -0.04 : 0
      const teamPushMult = tacticNow === 'contra-ataque' ? 1.6 : tacticNow === 'recuar' ? 0.55 : 1
      let closestChaser = -1
      let closestChaserDist = Infinity
      sim.players.forEach((p, i) => {
        if (p.side !== possessSide && i !== 0 && i !== 11) {
          const d = dist(p.pos, sim.ball)
          if (d < closestChaserDist) {
            closestChaserDist = d
            closestChaser = i
          }
        }
      })

      sim.players.forEach((p, i) => {
        const isKeeper = i === 0 || i === 11
        const dir = p.side === 'team' ? 1 : -1
        const hasBall = p.side === possessSide
        // profundidade da bola no campo de ataque deste time (0-1)
        const ballDepth = p.side === 'team' ? sim.ball.x : 1 - sim.ball.x
        // agressividade posicional: zagueiro avança pouco, atacante muito
        const aggressiveness = p.side === 'team' ? p.base.x : 1 - p.base.x

        let targetX = p.base.x
        let targetY = p.base.y
        if (hasBall) {
          const pushMult = p.side === 'team' ? teamPushMult : 1
          const push = (0.08 + ballDepth * 0.32) * (0.4 + aggressiveness * 1.8) * pushMult
          targetX = p.base.x + push * dir
          // bola no terço final: atacantes invadem a área
          if (ballDepth > 0.62 && aggressiveness > 0.32) {
            targetX = p.side === 'team' ? 0.78 + aggressiveness * 0.25 : 0.22 - aggressiveness * 0.25
            targetY = 0.5 + (p.base.y - 0.5) * 0.55
          }
        } else {
          // sem a bola: bloco recua e se compacta conforme a bola se aproxima
          const threat = 1 - ballDepth // bola avançando no NOSSO campo
          targetX = p.base.x - (0.04 + Math.max(0, 0.5 - threat) * 0.18) * dir
          targetY = 0.5 + (p.base.y - 0.5) * 0.85
        }
        if (p.side === 'team' && !isKeeper) targetX += teamShift
        if (isKeeper) {
          targetX = p.base.x + (hasBall ? 0.03 : 0) * dir
          targetY = p.base.y
        }

        targetX = clamp01(targetX, 0.03, 0.97)
        targetY = clamp01(targetY, 0.08, 0.92)

        // inércia: jogador leva alguns segundos para transitar entre posturas
        const rate = 0.5 * dt
        p.pos.x += (targetX - p.pos.x) * rate
        p.pos.y += (targetY - p.pos.y) * rate

        // pressão: o marcador mais próximo persegue a bola (em ritmo humano);
        // goleiros NUNCA são puxados pela bola — ficam na meta
        if (i === closestChaser) {
          p.pos.x += (sim.ball.x - p.pos.x) * 0.6 * dt
          p.pos.y += (sim.ball.y - p.pos.y) * 0.6 * dt
        } else if (!isKeeper) {
          p.pos.x += (sim.ball.x - p.pos.x) * 0.06 * dt
          p.pos.y += (sim.ball.y - p.pos.y) * 0.06 * dt
        }
      })

      if (sim.phase === 'ballMoving') {
        sim.ballProgress = Math.min(1, sim.ballProgress + dt / sim.ballFlightTime)
        sim.ball = {
          x: sim.ballFrom.x + (sim.ballTo.x - sim.ballFrom.x) * sim.ballProgress,
          y: sim.ballFrom.y + (sim.ballTo.y - sim.ballFrom.y) * sim.ballProgress,
        }
        if (sim.ballProgress >= 1) {
          if (sim.pendingOutcome !== 'none') {
            sim.lastGoalSide = sim.players[sim.holder].side
            resolveShotOutcome()
          } else {
            sim.ball = { ...sim.players[sim.holder].pos }
            sim.phase = 'holding'
            // entrega em andamento: decisões instantâneas até a bola chegar em você
            sim.holdTimer = sim.directiveQueue?.kind === 'deliver'
              ? 0.08
              : 0.35 + Math.random() * 0.4
          }
        }
      } else if (sim.phase === 'holding') {
        sim.ball = { ...sim.players[sim.holder].pos }
        sim.holdTimer -= dt
        if (sim.holdTimer <= 0) decide()
      } else if (sim.phase === 'goalFlash') {
        sim.flashTimer -= dt
        if (sim.flashTimer <= 0) restartAfterGoal()
      }
    }

    /** Campo completo pré-renderizado (gramado, linhas, gols com rede). */
    const buildPitchCanvas = (texture: HTMLImageElement | null): HTMLCanvasElement => {
      const off = document.createElement('canvas')
      off.width = W * scale
      off.height = H * scale
      const c = off.getContext('2d')!
      c.scale(scale, scale)

      const midY = (PITCH_TOP + PITCH_BOTTOM) / 2
      if (texture) {
        // gramado desenhado pelo Rhaniery — linhas do jogo por cima
        c.drawImage(texture, 0, 0, W, H)
      } else {
        const grad = c.createLinearGradient(0, 0, 0, H)
        grad.addColorStop(0, '#31663a')
        grad.addColorStop(1, '#26512e')
        c.fillStyle = grad
        c.fillRect(0, 0, W, H)
        c.fillStyle = 'rgba(255,255,255,0.05)'
        const stripes = 12
        for (let i = 0; i < stripes; i++) {
          if (i % 2 === 0) c.fillRect((W / stripes) * i, 0, W / stripes, H)
        }
      }
      // vinheta suave (profundidade)
      const vig = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(0,0,0,0.22)')
      c.fillStyle = vig
      c.fillRect(0, 0, W, H)

      c.strokeStyle = 'rgba(245,240,230,0.75)'
      c.lineWidth = 1.2
      c.strokeRect(12, PITCH_TOP, W - 24, PITCH_BOTTOM - PITCH_TOP)
      // linha do meio + círculo central + ponto
      c.beginPath()
      c.moveTo(W / 2, PITCH_TOP)
      c.lineTo(W / 2, PITCH_BOTTOM)
      c.stroke()
      c.beginPath()
      c.arc(W / 2, midY, 26, 0, Math.PI * 2)
      c.stroke()
      c.beginPath()
      c.arc(W / 2, midY, 1.6, 0, Math.PI * 2)
      c.fillStyle = 'rgba(245,240,230,0.75)'
      c.fill()

      // áreas, marca do pênalti e meia-lua (dos dois lados)
      for (const side of [0, 1]) {
        const flip = side === 1
        const x0 = flip ? W - 12 : 12
        const dir = flip ? -1 : 1
        c.strokeRect(Math.min(x0, x0 + 42 * dir), midY - 48, 42, 96)
        c.strokeRect(Math.min(x0, x0 + 16 * dir), midY - 24, 16, 48)
        const penX = x0 + 30 * dir
        c.beginPath()
        c.arc(penX, midY, 1.4, 0, Math.PI * 2)
        c.fill()
        c.beginPath()
        c.arc(penX, midY, 16, flip ? Math.PI * 0.62 : -Math.PI * 0.38, flip ? Math.PI * 1.38 : Math.PI * 0.38)
        c.stroke()
        // arco de escanteio
        c.beginPath()
        c.arc(flip ? W - 12 : 12, PITCH_TOP, 4, flip ? Math.PI * 0.5 : 0, flip ? Math.PI : Math.PI * 0.5)
        c.stroke()
        c.beginPath()
        c.arc(flip ? W - 12 : 12, PITCH_BOTTOM, 4, flip ? Math.PI : Math.PI * 1.5, flip ? Math.PI * 1.5 : Math.PI * 2)
        c.stroke()
      }

      // gols com rede (atrás da linha de fundo)
      for (const side of [0, 1]) {
        const flip = side === 1
        const gx = flip ? W - 12 : 12 - 6
        c.fillStyle = 'rgba(20,30,22,0.55)'
        c.fillRect(gx, midY - 16, 6, 32)
        c.strokeStyle = 'rgba(245,240,230,0.4)'
        c.lineWidth = 0.6
        for (let i = 1; i < 3; i++) {
          c.beginPath()
          c.moveTo(gx + i * 2, midY - 16)
          c.lineTo(gx + i * 2, midY + 16)
          c.stroke()
        }
        for (let j = 1; j < 8; j++) {
          c.beginPath()
          c.moveTo(gx, midY - 16 + j * 4)
          c.lineTo(gx + 6, midY - 16 + j * 4)
          c.stroke()
        }
        // traves
        c.fillStyle = '#F5F0E6'
        c.fillRect(flip ? W - 13 : 11, midY - 17, 2, 34)
      }
      return off
    }

    let pitchCanvas = buildPitchCanvas(null)
    const grassTexture = new Image()
    grassTexture.onload = () => {
      pitchCanvas = buildPitchCanvas(grassTexture)
    }
    grassTexture.src = gramadoUrl

    const drawPitch = (): void => {
      ctx.drawImage(pitchCanvas, 0, 0, W, H)
    }

    const drawPlayer = (p: SimPlayer, t: number): void => {
      const pos = toPitch(p.pos)
      const wobble = Math.sin(t * 2 + pos.x) * 0.6
      const color = p.isUser ? USER_COLOR : p.side === 'team' ? teamColor : opponentColor
      // sombra
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 5, 4.5, 1.6, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fill()
      // anel do usuário
      if (p.isUser) {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y + wobble, 8 + Math.sin(t * 4) * 1.2, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,210,63,0.6)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      // corpo com volume: gradiente radial (luz vinda de cima-esquerda)
      const body = ctx.createRadialGradient(pos.x - 1.6, pos.y + wobble - 1.8, 0.8, pos.x, pos.y + wobble, 5.4)
      body.addColorStop(0, 'rgba(255,255,255,0.85)')
      body.addColorStop(0.25, color)
      body.addColorStop(1, color)
      ctx.beginPath()
      ctx.arc(pos.x, pos.y + wobble, 5, 0, Math.PI * 2)
      ctx.fillStyle = body
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 1.1
      ctx.stroke()
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'
      ctx.lineWidth = 0.6
      ctx.stroke()
    }

    const LABEL_MIN_DX = 26
    const LABEL_MIN_DY = 8

    /** Nomes desenhados por último, empurrando pra baixo quem colidiria. */
    const drawLabels = (): void => {
      const placed: { x: number; y: number }[] = []
      const entries = sim.players
        .map((p) => ({ ...toPitch(p.pos), isUser: p.isUser, label: fieldName(p.name) }))
        .sort((a, b) => a.y - b.y)
      for (const entry of entries) {
        let y = entry.y + 14
        while (placed.some((q) => Math.abs(q.x - entry.x) < LABEL_MIN_DX && Math.abs(q.y - y) < LABEL_MIN_DY)) {
          y += LABEL_MIN_DY
        }
        placed.push({ x: entry.x, y })
        ctx.font = entry.isUser ? 'bold 7.5px monospace' : '7px monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(10,14,10,0.85)'
        ctx.fillText(entry.label, entry.x + 0.7, y + 0.7)
        ctx.fillStyle = entry.isUser ? USER_COLOR : 'rgba(245,240,230,0.92)'
        ctx.fillText(entry.label, entry.x, y)
      }
    }

    const drawBall = (): void => {
      const pos = toPitch(sim.ball)
      // voo em arco: a bola sobe no meio do passe (comprimento dita a altura)
      let lift = 0
      if (sim.phase === 'ballMoving') {
        const from = toPitch(sim.ballFrom)
        const to = toPitch(sim.ballTo)
        const span = Math.min(1, dist(sim.ballFrom, sim.ballTo) / 0.5)
        lift = Math.sin(sim.ballProgress * Math.PI) * (2 + span * 7)
        // rastro esmaecendo
        const trail = ctx.createLinearGradient(from.x, from.y, to.x, to.y)
        trail.addColorStop(0, 'rgba(255,210,63,0)')
        trail.addColorStop(1, 'rgba(255,210,63,0.5)')
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.strokeStyle = trail
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      // sombra no chão (separa a bola do gramado durante o voo)
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 1.5, 2.6, 1.1, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0,0,0,${0.35 - lift * 0.02})`
      ctx.fill()
      const ballY = pos.y - 2 - lift
      const shine = ctx.createRadialGradient(pos.x - 1, ballY - 1, 0.4, pos.x, ballY, 3.4)
      shine.addColorStop(0, '#FFFFFF')
      shine.addColorStop(1, '#D8D4C8')
      ctx.beginPath()
      ctx.arc(pos.x, ballY, 3, 0, Math.PI * 2)
      ctx.fillStyle = shine
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    let rafId = 0
    let lastTs = 0
    const loop = (ts: number): void => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016) * speedRef.current
      lastTs = ts
      update(dt)
      drawPitch()
      const t = ts / 1000
      for (const p of sim.players) drawPlayer(p, t)
      drawLabels()
      drawBall()
      if (sim.phase === 'goalFlash') {
        ctx.fillStyle = `rgba(255,210,63,${0.12 + Math.sin(t * 20) * 0.08})`
        ctx.fillRect(0, 0, W, H)
        ctx.font = 'bold 18px monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = USER_COLOR
        ctx.fillText('GOL!', W / 2, 40)
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
    // elencos e cores são fixos por partida
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamColor, opponentColor, userName])

  return <canvas ref={canvasRef} className="live-pitch" aria-label="Mesa tática ao vivo" />
}
