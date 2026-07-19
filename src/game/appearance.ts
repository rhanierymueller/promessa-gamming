import type { PlayerAppearance } from '../state/save'
import type { SpriteHolder } from './assets'

/**
 * Personalização do craque: tom de pele e cor de cabelo por recoloração em
 * runtime (mesma ideia do tint de uniforme) — preserva o sombreamento da
 * arte. Gênero troca o CONJUNTO de sprites (arte própria, quando gerada).
 */

/** Base RGB de cada tom (0 = manter a arte original). */
export const SKIN_TONES: readonly { name: string; rgb: [number, number, number] | null }[] = [
  { name: 'Original', rgb: null },
  { name: 'Claro', rgb: [236, 198, 165] },
  { name: 'Médio', rgb: [199, 147, 106] },
  { name: 'Escuro', rgb: [141, 94, 62] },
  { name: 'Retinto', rgb: [92, 62, 44] },
]

export const HAIR_COLORS: readonly { name: string; rgb: [number, number, number] | null }[] = [
  { name: 'Original', rgb: null },
  { name: 'Castanho', rgb: [122, 82, 52] },
  { name: 'Loiro', rgb: [198, 164, 92] },
  { name: 'Ruivo', rgb: [164, 74, 38] },
]

export const KIT_COLORS: readonly { name: string; rgb: [number, number, number] | null }[] = [
  { name: 'Amarelo', rgb: [232, 202, 60] },
  { name: 'Vermelho', rgb: [204, 46, 52] },
  { name: 'Azul', rgb: [52, 92, 200] },
  { name: 'Verde', rgb: [36, 142, 74] },
  { name: 'Branco', rgb: [228, 226, 218] },
  { name: 'Grená', rgb: [128, 32, 64] },
]

/** Luminâncias de referência da arte (calibradas pixel a pixel na arte real). */
const SKIN_REFERENCE_LUM = 96
const HAIR_REFERENCE_LUM = 34
const KIT_REFERENCE_LUM = 170

/**
 * Na arte, pele e uniforme são tons quentes SEM azul — a separação confiável
 * é a razão verde/vermelho: kit amarelo g/r ≈ 0.8, pele g/r ≈ 0.5.
 */
const isSkinPixel = (r: number, g: number, b: number): boolean => {
  const lum = (r + g + b) / 3
  return (
    lum >= 48 &&
    lum < 205 &&
    r >= 80 &&
    g > r * 0.33 &&
    g < r * 0.65 &&
    b < g * 0.6
  )
}

const isHairPixel = (r: number, g: number, b: number): boolean => {
  const lum = (r + g + b) / 3
  // cabelo: marrom bem escuro — contorno neutro (r≈g≈b) e sombras do kit
  // (r fraco) ficam de fora
  return lum >= 16 && lum < 48 && r >= 40 && r >= g && g >= b && r - b >= 10
}

/**
 * Uniforme: toda a arte de personagens usa camisa CINZA NEUTRA — recolore
 * perfeito para qualquer cor, como o tint da barreira/rivais.
 */
const isKitPixel = (r: number, g: number, b: number): boolean => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max === 0 ? 0 : (max - min) / max
  const lum = (r + g + b) / 3
  return saturation < 0.18 && lum > 95 && lum < 228
}

/**
 * Amarelo-oliva ambíguo: pode ser sombra da camisa OU brilho dourado do
 * cabelo — decide-se pela vizinhança (região dominante ao redor).
 */
const isAmbiguousYellow = (r: number, g: number, b: number): boolean => {
  const lum = (r + g + b) / 3
  return lum >= 30 && lum < 235 && r >= 55 && g > r * 0.55 && g < r * 1.1 && b < g * 0.6
}

type PixelLabel = 0 | 1 | 2 | 3 // none | kit | skin | hair

const labelOf = (r: number, g: number, b: number): PixelLabel => {
  if (isKitPixel(r, g, b)) return 1
  if (isSkinPixel(r, g, b)) return 2
  if (isHairPixel(r, g, b)) return 3
  return 0
}

/** Rotula o amarelo ambíguo pela maioria dos rótulos fortes num raio de 3px. */
const resolveAmbiguous = (
  labels: Uint8Array,
  data: Uint8ClampedArray,
  w: number,
  h: number,
): void => {
  const RADIUS = 3
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (labels[idx] !== 0) continue
      const p = idx * 4
      if (data[p + 3] < 40 || !isAmbiguousYellow(data[p], data[p + 1], data[p + 2])) continue
      const votes = [0, 0, 0, 0]
      for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        for (let dx = -RADIUS; dx <= RADIUS; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          votes[labels[ny * w + nx]]++
        }
      }
      if (votes[1] >= votes[3] && votes[1] > 2) labels[idx] = 1
      else if (votes[3] > 2) labels[idx] = 3
    }
  }
}

/**
 * Recolore pele e cabelo de um sprite preservando o sombreamento.
 * Retorna null se o sprite ainda não carregou ou nada muda (índices 0).
 */
export const applyAppearance = (
  holder: SpriteHolder,
  appearance: PlayerAppearance,
): SpriteHolder | null => {
  const skinTone = SKIN_TONES[appearance.skin]?.rgb ?? null
  const hairColor = HAIR_COLORS[appearance.hair]?.rgb ?? null
  const kitColor = KIT_COLORS[appearance.kit]?.rgb ?? null
  if (!holder.img || (!skinTone && !hairColor && !kitColor)) return null

  const canvas = document.createElement('canvas')
  canvas.width = holder.w
  canvas.height = holder.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(holder.img, 0, 0)
  const image = ctx.getImageData(0, 0, holder.w, holder.h)
  const data = image.data

  // 1º passe: rótulos fortes; 2º: amarelo ambíguo herda a região vizinha
  const labels = new Uint8Array(holder.w * holder.h)
  for (let i = 0; i < labels.length; i++) {
    const p = i * 4
    if (data[p + 3] >= 40) labels[i] = labelOf(data[p], data[p + 1], data[p + 2])
  }
  resolveAmbiguous(labels, data, holder.w, holder.h)

  const paint = (
    p: number,
    tone: readonly [number, number, number],
    refLum: number,
    minShade: number,
    maxShade: number,
  ): void => {
    const lum = (data[p] + data[p + 1] + data[p + 2]) / 3
    const shade = Math.max(minShade, Math.min(maxShade, lum / refLum))
    data[p] = Math.min(255, tone[0] * shade)
    data[p + 1] = Math.min(255, tone[1] * shade)
    data[p + 2] = Math.min(255, tone[2] * shade)
  }

  for (let i = 0; i < labels.length; i++) {
    const p = i * 4
    if (labels[i] === 1 && kitColor) paint(p, kitColor, KIT_REFERENCE_LUM, 0.2, 1.4)
    else if (labels[i] === 2 && skinTone) paint(p, skinTone, SKIN_REFERENCE_LUM, 0.3, 1.6)
    else if (labels[i] === 3 && hairColor) paint(p, hairColor, HAIR_REFERENCE_LUM, 0.5, 1.6)
  }
  ctx.putImageData(image, 0, 0)
  return { img: canvas, w: holder.w, h: holder.h }
}
