import { Hand } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ShotOutcomeKind, Vec2 } from '../engine/shot/types'
import { BACKGROUND_URL, loadGameSprites, tintSprite, type GameSprites } from './assets'
import { initAudio, playStageEvent } from './audio'
import { drawStage, type WallSprites, LOGICAL_HEIGHT, LOGICAL_WIDTH } from './render'
import {
  beginRound,
  createDefenseStage,
  createStage,
  tick,
  TOTAL_SHOTS,
  tryDive,
  tryStartShot,
  type Phase,
  type StageState,
} from './stage'

const RENDER_SCALE = 3

export interface RoundSummary {
  readonly goals: number
  readonly lastOutcome: ShotOutcomeKind
  readonly lastGolaco: boolean
  readonly lastBlocked: boolean
}

interface ShotStageProps {
  /** Quantos chutes na rodada (treino: 10; lance de partida: 1). */
  readonly shots?: number
  /** Pula a tela de introdução e já começa pronto para chutar. */
  readonly autoStart?: boolean
  /** Esconde o overlay de fim (a partida cuida do que vem depois). */
  readonly hideEndOverlay?: boolean
  /** Cobrança de falta: barreira entre a bola e o gol. */
  readonly freeKick?: boolean
  /** Cor primária do clube adversário — recolore o uniforme da barreira. */
  readonly wallColor?: string
  /** Modo defesa: o RIVAL cobra e você mergulha arrastando para o lado. */
  readonly defense?: { readonly skill: number; readonly kitColor: string }
  readonly onRoundEnd?: (summary: RoundSummary) => void
}

const MANCHETES: readonly [number, string][] = [
  [9, 'FENÔMENO! O olheiro já ligou pro seu empresário.'],
  [7, 'CRAQUE! A promessa é real, diz a mesa-redonda.'],
  [5, 'Promete, mas oscila. O debate segue quente.'],
  [3, 'A torcida pede paciência… muita paciência.'],
  [0, 'Volta pra várzea, menino.'],
]

const mancheteFor = (goals: number): string =>
  MANCHETES.find(([min]) => goals >= min)![1]

export const ShotStage = ({
  shots = TOTAL_SHOTS,
  autoStart = false,
  hideEndOverlay = false,
  freeKick = false,
  wallColor,
  defense,
  onRoundEnd,
}: ShotStageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<StageState>(
    defense
      ? createDefenseStage(Date.now() & 0xffffffff, defense.skill)
      : createStage(Date.now() & 0xffffffff, shots, freeKick),
  )
  const dragRef = useRef<Vec2[] | null>(null)
  const spritesRef = useRef(loadGameSprites())
  const wallSpritesRef = useRef<WallSprites | null>(null)
  const tintedStrikerRef = useRef<GameSprites['striker'] | null>(null)
  const onRoundEndRef = useRef(onRoundEnd)
  onRoundEndRef.current = onRoundEnd
  const [uiPhase, setUiPhase] = useState<Phase>(autoStart && !defense ? 'ready' : 'intro')
  const [finalGoals, setFinalGoals] = useState(0)

  useEffect(() => {
    // defesa sempre abre com o briefing (o papel inverte — o jogador precisa saber)
    if (autoStart && !defense) {
      initAudio()
      stateRef.current = beginRound(stateRef.current)
    }
    // roda só na montagem: cada instância representa uma rodada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = LOGICAL_WIDTH * RENDER_SCALE
    canvas.height = LOGICAL_HEIGHT * RENDER_SCALE
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(RENDER_SCALE, RENDER_SCALE)

    let rafId = 0
    let lastTs = 0
    const loop = (ts: number): void => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016)
      lastTs = ts
      const [next, events] = tick(stateRef.current, dt)
      const phaseChanged = next.phase !== stateRef.current.phase
      stateRef.current = next
      for (const event of events) playStageEvent(event)
      if (phaseChanged) {
        setUiPhase(next.phase)
        if (next.phase === 'end') {
          setFinalGoals(next.goals)
          const sim = next.sim
          if (sim) {
            onRoundEndRef.current?.({
              goals: next.goals,
              lastOutcome: sim.outcome.kind,
              lastGolaco: sim.outcome.isGolaco,
              lastBlocked: next.blockedByWall,
            })
          }
        }
      }
      // barreira na cor do adversário: tinge uma vez, assim que o sprite carrega
      const sprites = spritesRef.current
      if (freeKick && !wallSpritesRef.current && sprites.wallStand.img && sprites.wallJump.img) {
        const color = wallColor ?? '#8A8F98'
        const stand = tintSprite(sprites.wallStand, color)
        const jump = tintSprite(sprites.wallJump, color)
        wallSpritesRef.current = stand && jump ? { stand, jump } : { stand: sprites.wallStand, jump: sprites.wallJump }
      }
      // defesa: o cobrador é o RIVAL — uniforme na cor do clube dele
      if (defense && !tintedStrikerRef.current && sprites.striker.back.img) {
        const tinted = Object.fromEntries(
          Object.entries(sprites.striker).map(([pose, holder]) => [
            pose,
            tintSprite(holder, defense.kitColor) ?? holder,
          ]),
        ) as GameSprites['striker']
        tintedStrikerRef.current = tinted
      }
      const drawSprites = tintedStrikerRef.current
        ? { ...sprites, striker: tintedStrikerRef.current }
        : sprites
      drawStage(ctx, next, drawSprites, dragRef.current, next.totalShots, wallSpritesRef.current)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const toCanvas = (event: React.PointerEvent<HTMLCanvasElement>): Vec2 => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (LOGICAL_WIDTH / rect.width),
      y: (event.clientY - rect.top) * (LOGICAL_HEIGHT / rect.height),
    }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const phase = stateRef.current.phase
    const acceptsInput = defense ? phase === 'flying' || phase === 'runup' : phase === 'ready'
    if (!acceptsInput) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = [toCanvas(event)]
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const drag = dragRef.current
    if (!drag) return
    const point = toCanvas(event)
    const last = drag[drag.length - 1]
    if (Math.hypot(point.x - last.x, point.y - last.y) > 1.5) drag.push(point)
    if (drag.length > 40) drag.shift()
  }

  const onPointerUp = (): void => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || drag.length < 2) return
    if (defense) {
      const dx = drag[drag.length - 1].x - drag[0].x
      stateRef.current = tryDive(stateRef.current, dx)
    } else if (drag.length >= 3) {
      stateRef.current = tryStartShot(stateRef.current, drag)
    }
  }

  const startRound = (): void => {
    initAudio()
    stateRef.current = beginRound(stateRef.current)
    setUiPhase('ready')
  }

  return (
    <div className="stage">
      <img className="stage-bg" src={BACKGROUND_URL} alt="" />
      <canvas
        ref={canvasRef}
        aria-label="Mini-game de chute ao gol"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { dragRef.current = null }}
      />
      {uiPhase === 'intro' && !autoStart && !defense && (
        <div className="stage-overlay">
          <h2>Treino de finalização</h2>
          <p>Arraste da bola em direção ao gol e solte. Traço longo = chute forte e alto. Traço curvado = efeito.</p>
          <button className="btn" onClick={startRound}>Começar ▸</button>
        </div>
      )}
      {uiPhase === 'intro' && defense && (
        <div className="stage-overlay">
          <Hand size={34} className="defense-icon" aria-hidden="true" />
          <h2>Agora você defende!</h2>
          <div className="defense-steps">
            <p><strong>1.</strong> O rival vai correr e cobrar a falta sozinho.</p>
            <p><strong>2.</strong> Quando a bola sair, <strong>ARRASTE PRO LADO</strong> — o goleiro mergulha na direção do seu arrasto.</p>
            <p><strong>3.</strong> Direção e timing decidem: espere demais e a luva não chega.</p>
          </div>
          <button className="btn" onClick={startRound}>Defender ▸</button>
        </div>
      )}
      {uiPhase === 'end' && !hideEndOverlay && (
        <div className="stage-overlay">
          <h2>Fim do treino</h2>
          <div className="stage-score">{finalGoals}/{shots}</div>
          <p className="stage-headline">“{mancheteFor(finalGoals)}”</p>
          <button className="btn" onClick={startRound}>Jogar de novo</button>
        </div>
      )}
    </div>
  )
}
