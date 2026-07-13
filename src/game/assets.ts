import ballUrl from '../assets/sprites/ball.png'
import kCrouchUrl from '../assets/sprites/k_crouch.png'
import kDiveLUrl from '../assets/sprites/k_divel.png'
import kDiveRUrl from '../assets/sprites/k_diver.png'
import kIdleUrl from '../assets/sprites/k_idle.png'
import kJumpUrl from '../assets/sprites/k_jump.png'
import kSadUrl from '../assets/sprites/k_sad.png'
import sBackUrl from '../assets/sprites/s_back.png'
import sCelebrateUrl from '../assets/sprites/s_celebrate.png'
import sKickUrl from '../assets/sprites/s_kick.png'
import sLamentUrl from '../assets/sprites/s_lament.png'
import sRunUrl from '../assets/sprites/s_run.png'
import wallJumpUrl from '../assets/sprites/wall_jump.png'
import wallStandUrl from '../assets/sprites/wall_stand.png'
import varzeaUrl from '../assets/backgrounds/varzea.jpg'

export type KeeperPose = 'idle' | 'crouch' | 'diveL' | 'diveR' | 'jump' | 'sad'
export type StrikerPose = 'back' | 'run' | 'kick' | 'celebrate' | 'lament'

export interface SpriteHolder {
  img: HTMLImageElement | HTMLCanvasElement | null
  w: number
  h: number
}

export interface GameSprites {
  readonly keeper: Record<KeeperPose, SpriteHolder>
  readonly striker: Record<StrikerPose, SpriteHolder>
  readonly ball: SpriteHolder
  readonly wallStand: SpriteHolder
  readonly wallJump: SpriteHolder
}

const loadSprite = (src: string): SpriteHolder => {
  const holder: SpriteHolder = { img: null, w: 1, h: 1 }
  const img = new Image()
  img.onload = () => {
    holder.w = img.naturalWidth
    holder.h = img.naturalHeight
    holder.img = img
  }
  img.src = src
  return holder
}

export const loadGameSprites = (): GameSprites => ({
  keeper: {
    idle: loadSprite(kIdleUrl),
    crouch: loadSprite(kCrouchUrl),
    diveL: loadSprite(kDiveLUrl),
    diveR: loadSprite(kDiveRUrl),
    jump: loadSprite(kJumpUrl),
    sad: loadSprite(kSadUrl),
  },
  striker: {
    back: loadSprite(sBackUrl),
    run: loadSprite(sRunUrl),
    kick: loadSprite(sKickUrl),
    celebrate: loadSprite(sCelebrateUrl),
    lament: loadSprite(sLamentUrl),
  },
  ball: loadSprite(ballUrl),
  wallStand: loadSprite(wallStandUrl),
  wallJump: loadSprite(wallJumpUrl),
})

const isNeutralKitPixel = (r: number, g: number, b: number): boolean => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max === 0 ? 0 : (max - min) / max
  const luminance = (r + g + b) / 3
  return saturation < 0.18 && luminance > 95 && luminance < 225
}

/**
 * Recolore o uniforme neutro (cinza claro) com a cor do clube adversário,
 * preservando o sombreamento — pele, cabelo e contornos ficam intactos.
 */
export const tintSprite = (holder: SpriteHolder, color: string): SpriteHolder | null => {
  if (!holder.img) return null
  const canvas = document.createElement('canvas')
  canvas.width = holder.w
  canvas.height = holder.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(holder.img, 0, 0)
  const image = ctx.getImageData(0, 0, holder.w, holder.h)
  const data = image.data
  const tintR = parseInt(color.slice(1, 3), 16)
  const tintG = parseInt(color.slice(3, 5), 16)
  const tintB = parseInt(color.slice(5, 7), 16)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 40) continue
    if (!isNeutralKitPixel(data[i], data[i + 1], data[i + 2])) continue
    const shade = (data[i] + data[i + 1] + data[i + 2]) / 3 / 225
    data[i] = Math.min(255, tintR * shade)
    data[i + 1] = Math.min(255, tintG * shade)
    data[i + 2] = Math.min(255, tintB * shade)
  }
  ctx.putImageData(image, 0, 0)
  return { img: canvas, w: holder.w, h: holder.h }
}

export const BACKGROUND_URL = varzeaUrl
