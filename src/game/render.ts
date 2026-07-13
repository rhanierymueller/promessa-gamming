import { goalCenter } from '../engine/shot/config'
import type { Vec2 } from '../engine/shot/types'
import type { GameSprites, KeeperPose, SpriteHolder, StrikerPose } from './assets'
import { flightX } from '../engine/shot/flight'
import {
  ballFlightPosition,
  CFG,
  confettoAlpha,
  isConfettoVisible,
  type StageState,
} from './stage'

export const LOGICAL_WIDTH = 180
export const LOGICAL_HEIGHT = 320

const KEEPER_HEIGHT = 34
const STRIKER_HEIGHT = 54

const px = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void => {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

const drawScene = (ctx: CanvasRenderingContext2D, state: StageState): void => {
  // marca de cal sob a bola (o cenário vem da imagem por baixo do canvas)
  const markX = state.sim ? state.sim.flight.startX : state.ballX
  ctx.fillStyle = 'rgba(240,235,220,0.55)'
  ctx.beginPath()
  ctx.ellipse(markX, state.ballStartY + 2, 7, 2.2, 0, 0, 7)
  ctx.fill()

  const { goal } = CFG
  const top = goal.floorY - goal.barHeight
  ctx.strokeStyle = 'rgba(240,240,255,0.28)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = goal.left + 3; x < goal.right; x += 6) {
    ctx.moveTo(x, top + 3)
    ctx.lineTo(x, goal.floorY)
  }
  for (let y = top + 5; y < goal.floorY; y += 6) {
    ctx.moveTo(goal.left + 2, y)
    ctx.lineTo(goal.right - 2, y)
  }
  ctx.stroke()

  if (state.netBulge && state.netBulge.t < 0.5) {
    ctx.strokeStyle = `rgba(255,255,255,${0.6 - state.netBulge.t})`
    ctx.beginPath()
    ctx.arc(state.netBulge.x, state.netBulge.y, 5 + state.netBulge.t * 6, 0, 7)
    ctx.stroke()
  }

  px(ctx, goal.left - 1, top - 1, 3, goal.barHeight + 1, '#F8F6EE')
  px(ctx, goal.right - 2, top - 1, 3, goal.barHeight + 1, '#F8F6EE')
  px(ctx, goal.left - 1, top - 3, goal.right - goal.left + 3, 3, '#F8F6EE')
}

const smoothstep = (t: number): number => t * t * (3 - 2 * t)

const keeperPoseFor = (
  state: StageState,
  drag: readonly Vec2[] | null,
): { pose: KeeperPose; x: number; lift: number } => {
  const center = goalCenter(CFG)
  const lastResult = state.results[state.results.length - 1]

  if (state.keeperDiveP > 0 && state.sim) {
    const d = smoothstep(state.keeperDiveP)
    const dist = state.sim.keeper.diveX - center
    const pose: KeeperPose =
      state.phase === 'result' && lastResult === 'goal'
        ? 'sad'
        : Math.abs(dist) > 14
          ? dist < 0 ? 'diveL' : 'diveR'
          : 'jump'
    const lift =
      pose === 'diveL' || pose === 'diveR'
        ? Math.sin(state.keeperDiveP * Math.PI) * 9
        : pose === 'jump'
          ? Math.sin(state.keeperDiveP * Math.PI) * 11
          : 0
    return { pose, x: center + dist * d, lift }
  }

  // defesa: o goleiro acompanha o dedo durante o arrasto (feedback imediato)
  if (state.mode === 'defend' && state.phase === 'flying' && drag && drag.length > 1) {
    const dragDx = drag[drag.length - 1].x - drag[0].x
    const preview = Math.max(-16, Math.min(16, dragDx * 0.5))
    return { pose: 'crouch', x: center + preview, lift: 0 }
  }

  // ataque: o goleiro IA "lê" a bola em voo, deslocando-se sutilmente
  if (state.mode === 'shoot' && state.phase === 'flying' && state.sim) {
    const ballX = flightX(state.sim.flight, state.flightT)
    const track = Math.max(-10, Math.min(10, (ballX - center) * 0.3))
    return { pose: 'crouch', x: center + track, lift: 0 }
  }

  const alive = Math.sin(state.time * 1.6) * 4
  const bob = Math.abs(Math.sin(state.time * 3.2)) * 1.2
  const pose: KeeperPose =
    state.phase === 'result' && lastResult === 'goal'
      ? 'sad'
      : state.phase === 'flying' || state.phase === 'runup'
        ? 'crouch'
        : 'idle'
  return { pose, x: center + alive, lift: bob }
}

const drawKeeper = (
  ctx: CanvasRenderingContext2D,
  state: StageState,
  sprites: GameSprites,
  drag: readonly Vec2[] | null,
): void => {
  const { pose, x, lift } = keeperPoseFor(state, drag)
  const kd = sprites.keeper
  if (!kd.idle.img) return
  const sp = kd[pose].img ? kd[pose] : kd.idle
  const scale = KEEPER_HEIGHT / kd.idle.h
  const w = sp.w * scale
  const h = sp.h * scale
  ctx.drawImage(sp.img!, Math.round(x - w / 2), Math.round(CFG.goal.floorY - h - lift), Math.round(w), Math.round(h))
}

const strikerPoseFor = (state: StageState): { pose: StrikerPose; footX: number; footY: number } | null => {
  const startX = state.sim ? state.sim.flight.startX : state.ballX
  const startY = state.ballStartY
  switch (state.phase) {
    case 'ready':
      return { pose: 'back', footX: startX - 30, footY: startY + 20 }
    case 'runup': {
      const p = state.runP
      return {
        pose: 'run',
        footX: startX - 30 + 23 * p,
        footY: startY + 20 - 17 * p - Math.abs(Math.sin(p * Math.PI * 3)) * 1.5,
      }
    }
    case 'flying':
      return state.flightT < 0.3
        ? { pose: 'kick', footX: startX - 7, footY: startY + 3 }
        : { pose: 'back', footX: startX - 14, footY: startY + 3 }
    case 'result': {
      const lastResult = state.results[state.results.length - 1]
      return {
        pose: lastResult === 'goal' ? 'celebrate' : 'lament',
        footX: startX - 18,
        footY: startY + 3,
      }
    }
    default:
      return null
  }
}

const WALL_HEIGHT = 42

export interface WallSprites {
  readonly stand: SpriteHolder
  readonly jump: SpriteHolder
}

const drawWall = (ctx: CanvasRenderingContext2D, state: StageState, wallSprites: WallSprites): void => {
  const wall = state.wall
  if (!wall) return
  const groundY = CFG.ballStartY + (CFG.goal.floorY - CFG.ballStartY) * wall.flightT

  const jumpWindow =
    state.wallJumped &&
    state.phase === 'flying' &&
    state.flightT > wall.flightT - 0.15
  const progress = jumpWindow ? Math.min(1, (state.flightT - (wall.flightT - 0.15)) / 0.3) : 0
  const sprite = jumpWindow ? wallSprites.jump : wallSprites.stand
  if (!sprite.img) return

  const lift = Math.sin(progress * Math.PI) * 6
  const scale = WALL_HEIGHT / wallSprites.stand.h
  const w = sprite.w * scale
  const h = sprite.h * scale
  ctx.drawImage(
    sprite.img,
    Math.round(wall.centerX - w / 2),
    Math.round(groundY - h - lift),
    Math.round(w),
    Math.round(h),
  )
}

const drawStriker = (ctx: CanvasRenderingContext2D, state: StageState, sprites: GameSprites): void => {
  const placement = strikerPoseFor(state)
  const sd = sprites.striker
  if (!placement || !sd.back.img) return
  const sp = sd[placement.pose].img ? sd[placement.pose] : sd.back
  const scale = STRIKER_HEIGHT / sd.back.h
  const w = sp.w * scale
  const h = sp.h * scale
  ctx.drawImage(sp.img!, Math.round(placement.footX - w / 2), Math.round(placement.footY - h), Math.round(w), Math.round(h))
}

const drawBall = (
  ctx: CanvasRenderingContext2D,
  ball: SpriteHolder,
  x: number,
  y: number,
  r: number,
  groundY: number,
  spin: number,
): void => {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(x, groundY + 1, r * 1.3, r * 0.45, 0, 0, 7)
  ctx.fill()

  if (ball.img) {
    const scale = (r * 2) / Math.max(ball.w, ball.h)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(spin)
    ctx.drawImage(ball.img, (-ball.w * scale) / 2, (-ball.h * scale) / 2, ball.w * scale, ball.h * scale)
    ctx.restore()
    return
  }
  ctx.fillStyle = '#F5F0E6'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 7)
  ctx.fill()
}

const drawAim = (ctx: CanvasRenderingContext2D, drag: readonly Vec2[] | null): void => {
  if (!drag || drag.length < 2) return
  ctx.strokeStyle = 'rgba(255,210,63,0.85)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(drag[0].x, drag[0].y)
  for (const p of drag) ctx.lineTo(p.x, p.y)
  ctx.stroke()

  const start = drag[0]
  const end = drag[drag.length - 1]
  const power = Math.min(1, Math.hypot(end.x - start.x, end.y - start.y) / CFG.powerDragLength)
  px(ctx, 6, 210, 4, 70, 'rgba(0,0,0,0.4)')
  const height = 70 * power
  px(ctx, 6, 280 - height, 4, height, power > CFG.dispersionThreshold ? '#E85D75' : '#FFD23F')
}

const drawHud = (ctx: CanvasRenderingContext2D, state: StageState, totalShots: number): void => {
  const isDefense = state.mode === 'defend'
  ctx.font = 'bold 8px monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#F5F0E6'
  ctx.fillText(`${isDefense ? 'DEFESA' : 'CHUTE'} ${Math.min(state.shotIndex + 1, totalShots)}/${totalShots}`, 6, 12)
  const successKind = isDefense ? 'save' : 'goal'
  for (let i = 0; i < totalShots; i++) {
    const result = state.results[i]
    const color = result === successKind ? '#7ACC6E' : result ? '#E85D75' : 'rgba(245,240,230,0.3)'
    px(ctx, 102 + i * 7, 7, 5, 5, color)
  }

  if (isDefense && state.diveX === null && state.phase !== 'result' && state.phase !== 'end') {
    ctx.font = 'bold 8px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#1A1428'
    ctx.fillText('ARRASTE PRO LADO PRA DEFENDER!', 91, 301)
    ctx.fillStyle = '#FFD23F'
    ctx.fillText('ARRASTE PRO LADO PRA DEFENDER!', 90, 300)

    // setas pulsando nas laterais do gol enquanto a bola voa
    if (state.phase === 'flying') {
      const pulse = 0.5 + 0.5 * Math.sin(state.time * 7)
      ctx.globalAlpha = 0.35 + pulse * 0.55
      ctx.font = 'bold 18px monospace'
      ctx.fillStyle = '#FFD23F'
      ctx.fillText('←', 20, CFG.goal.floorY - 14)
      ctx.fillText('→', 160, CFG.goal.floorY - 14)
      ctx.globalAlpha = 1
    }
    ctx.textAlign = 'left'
  }

  if (state.msg && state.msg.t < 1.1) {
    const pop = Math.min(1, state.msg.t * 6)
    const alpha = state.msg.t > 0.8 ? Math.max(0, 1 - (state.msg.t - 0.8) / 0.3) : 1
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(90, 60)
    ctx.scale(pop, pop)
    ctx.font = 'bold 17px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#1A1428'
    ctx.fillText(state.msg.text, 1, 1)
    ctx.fillStyle = state.msg.color
    ctx.fillText(state.msg.text, 0, 0)
    ctx.restore()
  }
}

export const drawStage = (
  ctx: CanvasRenderingContext2D,
  state: StageState,
  sprites: GameSprites,
  drag: readonly Vec2[] | null,
  totalShots: number,
  wallSprites?: WallSprites | null,
): void => {
  ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  ctx.save()
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake * 2, (Math.random() - 0.5) * state.shake * 2)
  }

  drawScene(ctx, state)

  if (state.confetti) {
    for (const c of state.confetti) {
      if (!isConfettoVisible(c)) continue
      ctx.globalAlpha = confettoAlpha(c)
      px(ctx, c.x, c.y, 1.5, 3, c.color)
    }
    ctx.globalAlpha = 1
  }

  drawKeeper(ctx, state, sprites, drag)
  if (state.wall && wallSprites) drawWall(ctx, state, wallSprites)
  drawStriker(ctx, state, sprites)

  if (state.phase === 'ready' || state.phase === 'runup') {
    drawBall(ctx, sprites.ball, state.ballX, state.ballStartY, 4, state.ballStartY, 0)
    drawAim(ctx, drag)
  } else if (state.phase === 'flying') {
    const ball = ballFlightPosition(state)
    if (ball) drawBall(ctx, sprites.ball, ball.x, ball.y, ball.r, ball.groundY, state.flightT * 14)
  } else if (state.phase === 'result' && state.post) {
    const alpha = state.post.t > 0.7 ? Math.max(0, 1 - (state.post.t - 0.7) / 0.4) : 1
    ctx.globalAlpha = alpha
    drawBall(ctx, sprites.ball, state.post.x, state.post.y, 2.2, Math.max(state.post.y, CFG.goal.floorY + 4), state.post.t * 8)
    ctx.globalAlpha = 1
    if (state.missMark) {
      ctx.strokeStyle = 'rgba(245,240,230,0.85)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(state.missMark.x - 3, state.missMark.y - 3)
      ctx.lineTo(state.missMark.x + 3, state.missMark.y + 3)
      ctx.moveTo(state.missMark.x + 3, state.missMark.y - 3)
      ctx.lineTo(state.missMark.x - 3, state.missMark.y + 3)
      ctx.stroke()
    }
  }

  if (state.phase !== 'intro') drawHud(ctx, state, totalShots)
  ctx.restore()
}
