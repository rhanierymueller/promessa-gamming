import type { PlayerGender } from '../state/save'
import ballUrl from '../assets/sprites/ball.png'
import kCrouchUrl from '../assets/sprites/k_crouch.png'
import kDiveLUrl from '../assets/sprites/k_divel.png'
import kDiveRUrl from '../assets/sprites/k_diver.png'
import kIdleUrl from '../assets/sprites/k_idle.png'
import kJumpUrl from '../assets/sprites/k_jump.png'
import kSadUrl from '../assets/sprites/k_sad.png'
import kStepUrl from '../assets/sprites/k_step.png'
import kTakeoffUrl from '../assets/sprites/k_takeoff.png'
import kSavedUrl from '../assets/sprites/k_saved.png'
import kGetupUrl from '../assets/sprites/k_getup.png'
import kFlyUrl from '../assets/sprites/k_fly.png'
import kTipUrl from '../assets/sprites/k_tip.png'
import kPunchUrl from '../assets/sprites/k_punch.png'
import sBackUrl from '../assets/sprites/s_back.png'
import sCelebrateUrl from '../assets/sprites/s_celebrate.png'
import sKickUrl from '../assets/sprites/s_kick.png'
import sKick2Url from '../assets/sprites/s_kick2.png'
import sLamentUrl from '../assets/sprites/s_lament.png'
import sRunUrl from '../assets/sprites/s_run.png'
import sRun2Url from '../assets/sprites/s_run2.png'
import sRun3Url from '../assets/sprites/s_run3.png'
import sRun4Url from '../assets/sprites/s_run4.png'
import celeb0Url from '../assets/sprites/celeb_0.png'
import celeb1Url from '../assets/sprites/celeb_1.png'
import celeb2Url from '../assets/sprites/celeb_2.png'
import celeb3Url from '../assets/sprites/celeb_3.png'
import fBackUrl from '../assets/sprites/f_back.png'
import fRunUrl from '../assets/sprites/f_run.png'
import fRun2Url from '../assets/sprites/f_run2.png'
import fRun3Url from '../assets/sprites/f_run3.png'
import fRun4Url from '../assets/sprites/f_run4.png'
import fKickUrl from '../assets/sprites/f_kick.png'
import fKick2Url from '../assets/sprites/f_kick2.png'
import fCelebrateUrl from '../assets/sprites/f_celebrate.png'
import fLamentUrl from '../assets/sprites/f_lament.png'
import fceleb0Url from '../assets/sprites/fceleb_0.png'
import fceleb1Url from '../assets/sprites/fceleb_1.png'
import fceleb2Url from '../assets/sprites/fceleb_2.png'
import fceleb3Url from '../assets/sprites/fceleb_3.png'
import wallJumpUrl from '../assets/sprites/wall_jump.png'
import wallStandUrl from '../assets/sprites/wall_stand.png'
import estadioGrandeUrl from '../assets/backgrounds/estadio-grande.jpg'
import estadioMedioUrl from '../assets/backgrounds/estadio-medio.jpg'
import varzeaUrl from '../assets/backgrounds/varzea.jpg'

export type KeeperPose =
  | 'idle'
  | 'crouch'
  | 'diveL'
  | 'diveR'
  | 'jump'
  | 'sad'
  | 'step'
  | 'takeoff'
  | 'saved'
  | 'getup'
  | 'fly'
  | 'tip'
  | 'punch'
export type StrikerPose = 'back' | 'run' | 'run2' | 'run3' | 'run4' | 'kick' | 'kick2' | 'celebrate' | 'lament'

export const CELEBRATION_URLS = [celeb0Url, celeb1Url, celeb2Url, celeb3Url] as const
export const CELEBRATION_URLS_F = [fceleb0Url, fceleb1Url, fceleb2Url, fceleb3Url] as const
export const CELEBRATION_NAMES = ['Avião', 'De joelhos', 'Soco no ar', 'Silêncio'] as const

export const celebrationUrlsFor = (
  gender: 'masculino' | 'feminino',
): readonly string[] => (gender === 'feminino' ? CELEBRATION_URLS_F : CELEBRATION_URLS)

export interface SpriteHolder {
  img: HTMLImageElement | HTMLCanvasElement | null
  w: number
  h: number
}

export interface GameSprites {
  readonly keeper: Record<KeeperPose, SpriteHolder>
  readonly striker: Record<StrikerPose, SpriteHolder>
  readonly celebrations: readonly SpriteHolder[]
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

/** Conjunto do atacante por gênero (sets completos). */
const strikerSetFor = (gender: 'masculino' | 'feminino'): Record<StrikerPose, SpriteHolder> => {
  if (gender === 'feminino') {
    return {
      back: loadSprite(fBackUrl),
      run: loadSprite(fRunUrl),
      run2: loadSprite(fRun2Url),
      run3: loadSprite(fRun3Url),
      run4: loadSprite(fRun4Url),
      kick: loadSprite(fKickUrl),
      kick2: loadSprite(fKick2Url),
      celebrate: loadSprite(fCelebrateUrl),
      lament: loadSprite(fLamentUrl),
    }
  }
  return {
    back: loadSprite(sBackUrl),
    run: loadSprite(sRunUrl),
    run2: loadSprite(sRun2Url),
    run3: loadSprite(sRun3Url),
    run4: loadSprite(sRun4Url),
    kick: loadSprite(sKickUrl),
    kick2: loadSprite(sKick2Url),
    celebrate: loadSprite(sCelebrateUrl),
    lament: loadSprite(sLamentUrl),
  }
}

/**
 * Arte da goleira, descoberta sozinha em assets/sprites/kf_*.png. Enquanto uma
 * pose não existir, a masculina cobre a vaga — assim a arte pode chegar em
 * partes sem deixar buraco em campo.
 */
const femaleKeeperModules = import.meta.glob('../assets/sprites/kf_*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

/**
 * Barreira feminina, descoberta sozinha em assets/sprites/wall_*_f.png —
 * mesma ideia da goleira: pose que ainda não existir cai na masculina.
 */
const femaleWallModules = import.meta.glob('../assets/sprites/wall_*_f.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const wallUrl = (pose: string, fallback: string, gender: PlayerGender): string => {
  if (gender !== 'feminino') return fallback
  const match = Object.keys(femaleWallModules).find((path) => path.endsWith(`/wall_${pose}_f.png`))
  return match ? femaleWallModules[match] : fallback
}

const keeperUrl = (pose: string, fallback: string, gender: PlayerGender): string => {
  if (gender !== 'feminino') return fallback
  const match = Object.keys(femaleKeeperModules).find((path) => path.endsWith(`/kf_${pose}.png`))
  return match ? femaleKeeperModules[match] : fallback
}

export const loadGameSprites = (gender: PlayerGender = 'masculino'): GameSprites => ({
  keeper: {
    idle: loadSprite(keeperUrl('idle', kIdleUrl, gender)),
    crouch: loadSprite(keeperUrl('crouch', kCrouchUrl, gender)),
    diveL: loadSprite(keeperUrl('divel', kDiveLUrl, gender)),
    diveR: loadSprite(keeperUrl('diver', kDiveRUrl, gender)),
    jump: loadSprite(keeperUrl('jump', kJumpUrl, gender)),
    sad: loadSprite(keeperUrl('sad', kSadUrl, gender)),
    step: loadSprite(keeperUrl('step', kStepUrl, gender)),
    takeoff: loadSprite(keeperUrl('takeoff', kTakeoffUrl, gender)),
    saved: loadSprite(keeperUrl('saved', kSavedUrl, gender)),
    getup: loadSprite(keeperUrl('getup', kGetupUrl, gender)),
    fly: loadSprite(keeperUrl('fly', kFlyUrl, gender)),
    tip: loadSprite(keeperUrl('tip', kTipUrl, gender)),
    punch: loadSprite(keeperUrl('punch', kPunchUrl, gender)),
  },
  striker: strikerSetFor(gender),
  celebrations: celebrationUrlsFor(gender).map(loadSprite),
  ball: loadSprite(ballUrl),
  wallStand: loadSprite(wallUrl('stand', wallStandUrl, gender)),
  wallJump: loadSprite(wallUrl('jump', wallJumpUrl, gender)),
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

/**
 * Cenário do palco por nível de estádio. O PEQUENO ainda usa a várzea como
 * fallback (prompt 1e pronto em Prompts de Imagem no vault).
 */
export const stadiumBackgroundUrl = (tier: 'varzea' | 'pequeno' | 'medio' | 'grande'): string => {
  switch (tier) {
    case 'grande':
      return estadioGrandeUrl
    case 'medio':
      return estadioMedioUrl
    case 'pequeno':
    default:
      return varzeaUrl
  }
}
