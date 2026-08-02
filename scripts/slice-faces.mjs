/**
 * Recorta uma folha 3×3 de rostos em PNGs individuais com fundo transparente.
 *
 * O fundo das folhas geradas é magenta puro (#FF00FF): a cor é removida por
 * chroma key e o "despill" tira o halo roxo que sobra nas bordas do cabelo —
 * sem ele, cada rosto fica com um contorno arroxeado sobre o card.
 *
 * Uso: node scripts/slice-faces.mjs <folha.png> <prefixo> [pasta-destino]
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const GRID = 3
const OUT_SIZE = 256
/** Distância máxima do magenta para o pixel ser considerado fundo. */
const KEY_TOLERANCE = 90
/** Acima disso o pixel é meio-fundo: fica translúcido em vez de sumir. */
const EDGE_TOLERANCE = 150

const distanceToMagenta = (r, g, b) => Math.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2)

const chromaKey = (data, count) => {
  for (let i = 0; i < count; i++) {
    const p = i * 4
    const [r, g, b] = [data[p], data[p + 1], data[p + 2]]
    const distance = distanceToMagenta(r, g, b)
    if (distance < KEY_TOLERANCE) {
      data[p] = 0
      data[p + 1] = 0
      data[p + 2] = 0
      data[p + 3] = 0
      continue
    }
    if (distance < EDGE_TOLERANCE) {
      // borda: suaviza a opacidade e puxa o roxo excedente para fora
      data[p + 3] = Math.round(((distance - KEY_TOLERANCE) / (EDGE_TOLERANCE - KEY_TOLERANCE)) * 255)
    }
    // despill: magenta é R e B altos com G baixo — limita R e B ao verde
    const ceiling = g + 60
    if (r > ceiling && b > ceiling) {
      data[p] = Math.min(r, ceiling)
      data[p + 2] = Math.min(b, ceiling)
    }
  }
}

/**
 * Algumas folhas deixam os últimos pixels da camisa da linha anterior dentro
 * da célula seguinte. É uma faixa quase contínua no topo; cabelo nunca ocupa
 * mais de 75% da largura inteira, então dá para removê-la sem apagar o rosto.
 */
const clearTopRowBleed = (data, width, height) => {
  const maxRows = Math.min(12, height)
  for (let y = 0; y < maxRows; y++) {
    let visible = 0
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 20) visible++
    }
    if (visible < width * 0.75) continue
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4
      data[p] = 0
      data[p + 1] = 0
      data[p + 2] = 0
      data[p + 3] = 0
    }
  }
}

const run = async () => {
  const [sheet, prefix, outDir = 'src/assets/faces'] = process.argv.slice(2)
  if (!sheet || !prefix) {
    console.error('uso: node scripts/slice-faces.mjs <folha.png> <prefixo> [pasta]')
    process.exit(1)
  }
  await mkdir(outDir, { recursive: true })

  const meta = await sharp(sheet).metadata()
  const cellW = Math.floor(meta.width / GRID)
  const cellH = Math.floor(meta.height / GRID)

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const index = row * GRID + col + 1
      const { data, info } = await sharp(sheet)
        .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
        .resize(OUT_SIZE, OUT_SIZE, { fit: 'cover', kernel: 'nearest' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })

      chromaKey(data, info.width * info.height)
      clearTopRowBleed(data, info.width, info.height)

      const file = path.join(outDir, `${prefix}-${String(index).padStart(2, '0')}.png`)
      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toFile(file)
      console.log('gerado', file)
    }
  }
}

run()
