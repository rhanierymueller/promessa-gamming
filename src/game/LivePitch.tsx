import { useEffect, useRef } from 'react'

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
  onDirectiveComplete,
}: LivePitchProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const speedRef = useRef(speed)
  speedRef.current = speed
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
      FORMATION.forEach((base, i) => {
        players.push({
          name: i === USER_FORMATION_INDEX ? userName : teamSquad[i] ?? `#${i}`,
          side: 'team',
          isUser: i === USER_FORMATION_INDEX,
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

    const passTo = (targetIndex: number): void => {
      sim.holder = targetIndex
      startBallFlight({ ...sim.players[targetIndex].pos }, 0.4 + Math.random() * 0.25)
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

    const shoot = (side: 'team' | 'opponent', forcedGoal: boolean): void => {
      const goalMouth: Vec = { x: attackX(side), y: 0.42 + Math.random() * 0.16 }
      if (forcedGoal) {
        sim.pendingOutcome = 'goal'
        startBallFlight(goalMouth, 0.4)
        return
      }
      const outcome = Math.random() < 0.55 ? 'saved' : 'wide'
      sim.pendingOutcome = outcome
      const target: Vec =
        outcome === 'wide'
          ? { x: attackX(side), y: Math.random() < 0.5 ? 0.16 : 0.84 }
          : goalMouth
      startBallFlight(target, 0.38)
    }

    /** Índice do protagonista da entrega: você, ou o atacante central deles. */
    const deliveryTarget = (side: 'team' | 'opponent'): number =>
      side === 'team' ? USER_FORMATION_INDEX : 11 + USER_FORMATION_INDEX

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
          if (dist(holderPos, targetPos) < 0.45) {
            passTo(target)
          } else {
            // aproxima: companheiro mais perto do protagonista
            const closer = teammatesOf(side)
              .filter((i) => i !== sim.holder)
              .sort((a, b) => dist(sim.players[a].pos, targetPos) - dist(sim.players[b].pos, targetPos))[0]
            passTo(closer ?? target)
          }
        } else {
          // a bola está com o outro time: perde para o lado do lance
          passTo(nearestOpponent(side, holder.pos))
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
      const roll = Math.random()
      if (inFinalThird && roll < 0.4) {
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
      }

      // movimento coletivo: o bloco com a posse AVANÇA, o outro recua e pressiona
      const clamp01 = (v: number, min: number, max: number): number =>
        Math.min(max, Math.max(min, v))
      const possessSide = sim.players[sim.holder].side
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
          const push = (0.08 + ballDepth * 0.32) * (0.4 + aggressiveness * 1.8)
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

        // pressão: o marcador mais próximo persegue a bola (em ritmo humano)
        if (i === closestChaser) {
          p.pos.x += (sim.ball.x - p.pos.x) * 0.6 * dt
          p.pos.y += (sim.ball.y - p.pos.y) * 0.6 * dt
        } else {
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
            sim.holdTimer = 0.35 + Math.random() * 0.4
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

    const drawPitch = (): void => {
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#2f6132')
      grad.addColorStop(1, '#27522b')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(255,255,255,0.035)'
      for (let i = 0; i < 8; i++) if (i % 2 === 0) ctx.fillRect((W / 8) * i, 0, W / 8, H)

      ctx.strokeStyle = 'rgba(245,240,230,0.6)'
      ctx.lineWidth = 1.2
      ctx.strokeRect(12, PITCH_TOP, W - 24, PITCH_BOTTOM - PITCH_TOP)
      ctx.beginPath()
      ctx.moveTo(W / 2, PITCH_TOP)
      ctx.lineTo(W / 2, PITCH_BOTTOM)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(W / 2, (PITCH_TOP + PITCH_BOTTOM) / 2, 26, 0, Math.PI * 2)
      ctx.stroke()
      const midY = (PITCH_TOP + PITCH_BOTTOM) / 2
      ctx.strokeRect(12, midY - 48, 42, 96)
      ctx.strokeRect(W - 12 - 42, midY - 48, 42, 96)
      ctx.strokeRect(12, midY - 24, 16, 48)
      ctx.strokeRect(W - 12 - 16, midY - 24, 16, 48)
      // gols
      ctx.fillStyle = '#F5F0E6'
      ctx.fillRect(8, midY - 16, 4, 32)
      ctx.fillRect(W - 12, midY - 16, 4, 32)
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
      ctx.beginPath()
      ctx.arc(pos.x, pos.y + wobble, 5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 1
      ctx.stroke()
      // nome
      ctx.font = p.isUser ? 'bold 7.5px monospace' : '7px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(10,14,10,0.85)'
      ctx.fillText(p.name, pos.x + 0.7, pos.y + 14.7)
      ctx.fillStyle = p.isUser ? USER_COLOR : 'rgba(245,240,230,0.92)'
      ctx.fillText(p.name, pos.x, pos.y + 14)
    }

    const drawBall = (): void => {
      const pos = toPitch(sim.ball)
      if (sim.phase === 'ballMoving') {
        const from = toPitch(sim.ballFrom)
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.strokeStyle = 'rgba(255,210,63,0.4)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(pos.x, pos.y - 2, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#FFFFFF'
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
