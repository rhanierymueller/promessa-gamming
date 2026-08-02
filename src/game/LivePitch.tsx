import { useEffect, useRef } from 'react'
import gramadoUrl from '../assets/backgrounds/gramado.jpg'
import ballUrl from '../assets/sprites/ball.png'
import userPortraitFUrl from '../assets/sprites/f_portrait.png'
import userPortraitUrl from '../assets/sprites/s_portrait.png'
import type { Tactic } from '../engine/match/tactics'
import { canDribble, canReceivePass, isKeeperIndex } from '../engine/match/pitchRoles'
import { facePresentationFor } from './faces'
import type { PlayerGender } from '../state/save'
import {
  ballPointAt,
  flightDurationFor,
  motionForPass,
  travelProgressFor,
  type BallMotion,
} from './liveBallPhysics'
import { createPitchPainter } from './livePitchPainter'
import {
  FORMATION,
  H,
  PITCH_BOTTOM,
  PITCH_TOP,
  USER_COLOR,
  USER_FORMATION_INDEX,
  W,
  dist,
  toPitch,
  type SimPlayer,
  type SimState,
  type Vec,
} from './livePitchScene'

/* Reexportado porque o MatchScreen sempre pediu o índice por aqui. */
export { USER_FORMATION_INDEX }

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
  /** IDs reais mantêm o mesmo rosto usado nas cartas e na escalação. */
  readonly teamPlayerIds?: readonly string[]
  readonly opponentPlayerIds?: readonly string[]
  readonly gender?: PlayerGender
  /** Nome do SEU craque — destacado em amarelo no ataque. */
  readonly userName: string
  /** Retrato configurado no Perfil para o protagonista. */
  readonly userFaceUrl?: string | null
  readonly directive: PitchDirective | null
  /** Instrução tática atual — muda o comportamento do bloco em tempo real. */
  readonly tactic: Tactic
  /** Contadores vivos (mutável de propósito: a mesa ACUMULA eventos reais). */
  readonly stats: LivePitchStats
  /** Desenho tático do SEU time (11 pontos normalizados); rival usa o padrão. */
  readonly teamLayout?: readonly { readonly x: number; readonly y: number }[]
  /** Índice do seu craque no desenho (slot da formação escolhida). */
  readonly userIndex?: number
  /**
   * Congela a mesa: o desenho continua, o jogo para.
   *
   * O lance de decisão não tem cronômetro, e o overlay dele NÃO desmonta o
   * campo (diferente de chute, defesa e dado). Sem congelar, o jogo seguiria
   * rodando por baixo enquanto o jogador pensa: a posse e as finalizações
   * inflariam junto com o tempo de reflexão, o `holdTimer` expiraria e o seu
   * jogador entregaria a bola sozinho — o adversário podia até finalizar com o
   * menu ainda aberto.
   */
  readonly frozen?: boolean
  readonly onDirectiveComplete?: (id: number) => void
}

/**
 * Segundos que a mesa segura a bola no pé do protagonista depois de entregá-la,
 * esperando o mini-game assumir. Alto de propósito: quem manda descongelar é a
 * tela, não o relógio.
 *
 * Só sai deste valor quando uma ordem nova chega — e ela SEMPRE corta a espera
 * (ver a captura de diretiva em `update`). Se algum caminho deixar esta espera
 * de pé, a coreografia do gol perde para o failsafe de reveal do MatchScreen e
 * o placar sobe antes de a bola entrar.
 */
const HOLD_UNTIL_MINIGAME = 9
/** Tempo até a mesa reagir a uma ordem nova: quase imediato. */
const DIRECTIVE_PICKUP_SECONDS = 0.08


export const LivePitch = ({
  speed,
  teamColor,
  opponentColor,
  teamSquad,
  opponentSquad,
  teamPlayerIds = [],
  opponentPlayerIds = [],
  gender = 'masculino',
  userName,
  userFaceUrl,
  directive,
  tactic,
  stats,
  teamLayout = FORMATION,
  userIndex = USER_FORMATION_INDEX,
  frozen = false,
  onDirectiveComplete,
}: LivePitchProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const userFaceImageRef = useRef<HTMLImageElement | null>(null)
  const speedRef = useRef(speed)
  speedRef.current = speed
  const frozenRef = useRef(frozen)
  const wasFrozenRef = useRef(frozen)
  frozenRef.current = frozen
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
    const source = userFaceUrl ?? (gender === 'feminino' ? userPortraitFUrl : userPortraitUrl)
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (!cancelled) userFaceImageRef.current = image
    }
    // Se a versão personalizada falhar, o retrato-base já carregado continua
    // visível no ref em vez de voltar para a bolinha.
    image.src = source
    return () => {
      cancelled = true
    }
  }, [gender, userFaceUrl])

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
          face: i === userIndex
            ? null
            : facePresentationFor(teamPlayerIds[i] ?? teamSquad[i] ?? `team-${i}`, gender),
          base: { ...base },
          pos: { ...base },
        })
      })
      FORMATION.forEach((base, i) => {
        players.push({
          name: opponentSquad[i] ?? `#${i}`,
          side: 'opponent',
          isUser: false,
          face: facePresentationFor(opponentPlayerIds[i] ?? opponentSquad[i] ?? `opponent-${i}`, gender),
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
      ballMotion: 'ground-pass',
      ballDistance: 0,
      ballCurve: 0,
      ballRotation: 0,
      ballSpinDirection: 1,
      phase: 'holding',
      holdTimer: 0.4,
      flashTimer: 0,
      pendingOutcome: 'none',
      directiveQueue: null,
      lastDirectiveId: 0,
      completedDirectiveId: 0,
      goalShotDirectiveId: 0,
      lastGoalSide: 'opponent',
    }
    simRef.current = sim

    const faceImages = new Map<string, HTMLImageElement>()
    for (const player of sim.players) {
      if (!player.face || faceImages.has(player.face.url)) continue
      const image = new Image()
      image.src = player.face.url
      faceImages.set(player.face.url, image)
    }

    const teammatesOf = (side: 'team' | 'opponent'): number[] =>
      sim.players.map((p, i) => (p.side === side ? i : -1)).filter((i) => i >= 0 && canReceivePass(i))

    const attackX = (side: 'team' | 'opponent'): number => (side === 'team' ? 1 : 0)

    /** Bola ao lado do marcador, como se estivesse no pé de apoio. */
    const ballAtFeet = (player: SimPlayer): Vec => ({
      x: Math.max(0.01, Math.min(0.99, player.pos.x + (player.side === 'team' ? 0.014 : -0.014))),
      y: Math.max(0.02, Math.min(0.98, player.pos.y + 0.024)),
    })

    const startBallFlight = (to: Vec, motion: BallMotion, urgent = false): void => {
      sim.ballFrom = { ...sim.ball }
      sim.ballTo = to
      sim.ballProgress = 0
      sim.ballDistance = dist(sim.ballFrom, sim.ballTo)
      sim.ballMotion = motion
      sim.ballFlightTime = flightDurationFor(sim.ballDistance, motion, urgent)
      const curveScale = motion === 'shot' ? 0.022 : motion === 'lofted-pass' ? 0.012 : 0.004
      sim.ballCurve = (Math.random() - 0.5) * curveScale * 2
      sim.ballSpinDirection = sim.ballTo.y >= sim.ballFrom.y ? 1 : -1
      sim.phase = 'ballMoving'
    }

    const passTo = (targetIndex: number, urgent = false): void => {
      sim.holder = targetIndex
      const target = ballAtFeet(sim.players[targetIndex])
      const distance = dist(sim.ball, target)
      startBallFlight(target, motionForPass(distance, urgent), urgent)
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
        startBallFlight(goalMouth, 'shot', true)
        return
      }
      const outcome = Math.random() < 0.55 ? 'saved' : 'wide'
      sim.pendingOutcome = outcome
      countShot(side, outcome === 'saved')
      const target: Vec =
        outcome === 'wide'
          ? { x: attackX(side), y: Math.random() < 0.5 ? 0.16 : 0.84 }
          : goalMouth
      startBallFlight(target, 'shot', true)
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
          sim.holdTimer = HOLD_UNTIL_MINIGAME
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
        const queue = sim.directiveQueue
        const attackers = teammatesOf(side).filter((i) => {
          const p = sim.players[i].pos
          return side === 'team' ? p.x > 0.55 : p.x < 0.45
        })
        const inFinalThird = side === 'team' ? holder.pos.x > 0.62 : holder.pos.x < 0.38
        if (inFinalThird || attackers.length === 0) {
          sim.directiveQueue = null
          // a ordem não terminou aqui: só quando a bola cruzar a linha
          sim.goalShotDirectiveId = queue.id
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
      if (roll < 0.28 && canDribble(sim.holder)) {
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
        // a bola entrou: só AGORA o placar lá fora pode subir
        const goalId = sim.goalShotDirectiveId
        sim.goalShotDirectiveId = 0
        if (goalId !== 0 && sim.completedDirectiveId !== goalId) {
          sim.completedDirectiveId = goalId
          onCompleteRef.current?.(goalId)
        }
        return
      }
      // defesa: goleiro rival fica com a bola; fora: tiro de meta
      const rivalKeeper = side === 'team' ? 11 : 0
      sim.holder = rivalKeeper
      sim.ball = ballAtFeet(sim.players[rivalKeeper])
      sim.phase = 'holding'
      sim.holdTimer = 0.6
    }

    const restartAfterGoal = (): void => {
      // quem sofreu o gol recomeça com a bola no seu volante
      const kicker = sim.lastGoalSide === 'team' ? 17 : 6
      sim.holder = kicker
      sim.ball = ballAtFeet(sim.players[kicker])
      sim.phase = 'holding'
      sim.holdTimer = 0.7
    }

    const update = (dt: number): void => {
      /*
       * O campo acabou de descongelar. Ao entregar a bola para o mini-game o
       * `holdTimer` foi gravado em HOLD_UNTIL_MINIGAME (9s) — e ele não corre
       * enquanto o campo está parado. Sem cortar aqui, uma decisão que NÃO
       * termina em gol devolvia a bola com nove segundos de espera no relógio:
       * o jogador escolhia e via o time paralisado, como se estivesse pensando.
       *
       * A correção antiga só pegava o caso do GOL, porque ali chega uma ordem
       * nova. Sem ordem nenhuma, o tempo morto continuava de pé.
       */
      if (wasFrozenRef.current && !frozenRef.current) {
        wasFrozenRef.current = false
        if (sim.phase === 'holding') {
          sim.holdTimer = Math.min(sim.holdTimer, DIRECTIVE_PICKUP_SECONDS)
        }
      }
      if (frozenRef.current) wasFrozenRef.current = true

      // nova diretiva de gol?
      const directive = directiveRef.current
      if (directive && directive.id !== sim.lastDirectiveId) {
        sim.lastDirectiveId = directive.id
        sim.directiveQueue = directive
        /*
         * QUALQUER ordem nova corta o "pensamento" em andamento — não só a
         * entrega. Enquanto isto checava `kind === 'deliver'`, a ordem de GOL
         * chegava com o holdTimer ainda em HOLD_UNTIL_MINIGAME (9s, gravado ao
         * entregar a bola e congelado junto com o campo durante a decisão).
         * A coreografia só começava 9s depois e sempre perdia para o failsafe
         * de 9000 ms: o placar e a narração subiam com a bola parada no pé.
         */
        if (sim.phase === 'holding') {
          sim.holdTimer = Math.min(sim.holdTimer, DIRECTIVE_PICKUP_SECONDS)
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
        const isKeeper = isKeeperIndex(i)
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
        const previousBall = sim.ball
        sim.ballProgress = Math.min(1, sim.ballProgress + dt / sim.ballFlightTime)
        if (sim.pendingOutcome === 'none') {
          // o alvo continua se movimentando: o passe acompanha o pé dele
          sim.ballTo = ballAtFeet(sim.players[sim.holder])
        }
        const travelProgress = travelProgressFor(sim.ballProgress, sim.ballMotion)
        sim.ball = ballPointAt(sim.ballFrom, sim.ballTo, travelProgress, sim.ballCurve)
        const previousPixel = toPitch(previousBall)
        const currentPixel = toPitch(sim.ball)
        const travelledPixels = dist(previousPixel, currentPixel)
        const spinMultiplier = sim.ballMotion === 'shot' ? 1.35 : sim.ballMotion === 'lofted-pass' ? 0.75 : 1
        sim.ballRotation += (travelledPixels / 2.7) * spinMultiplier * sim.ballSpinDirection
        if (sim.ballProgress >= 1) {
          if (sim.pendingOutcome !== 'none') {
            sim.lastGoalSide = sim.players[sim.holder].side
            resolveShotOutcome()
          } else {
            sim.ball = ballAtFeet(sim.players[sim.holder])
            sim.phase = 'holding'
            // entrega em andamento: decisões instantâneas até a bola chegar em você
            sim.holdTimer = sim.directiveQueue?.kind === 'deliver'
              ? 0.08
              : 0.35 + Math.random() * 0.4
          }
        }
      } else if (sim.phase === 'holding') {
        sim.ball = ballAtFeet(sim.players[sim.holder])
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
    const ballTexture = new Image()
    ballTexture.src = ballUrl

    const { drawPitch, drawPlayer, drawLabels, drawBall } = createPitchPainter({
      ctx,
      sim,
      teamColor,
      opponentColor,
      faceImages,
      userFaceImageRef,
      pitchCanvas: () => pitchCanvas,
      ballTexture,
    })

    let rafId = 0
    let lastTs = 0
    const loop = (ts: number): void => {
      // dt zero congela a física, os timers e os contadores; o desenho segue.
      // lastTs continua avançando para descongelar não entregar um salto de dt.
      const dt = frozenRef.current
        ? 0
        : Math.min(0.05, (ts - lastTs) / 1000 || 0.016) * speedRef.current
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
