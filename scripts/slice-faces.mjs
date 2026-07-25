#!/usr/bin/env node
/**
 * Fatia uma folha de contato de rostos (grade N×M) em retratos 256×256
 * dentro de src/assets/faces/, que é de onde a carta de jogador sorteia.
 *
 *   node scripts/slice-faces.mjs folha.png 3 3
 *   node scripts/slice-faces.mjs folha.png 3 3 --chroma
 *   node scripts/slice-faces.mjs folha.png 3 3 --prefix lote2 --margin 6
 *
 * --chroma recorta o fundo (magenta/verde de chroma key) e grava PNG com
 * transparência, deixando a moldura da carta aparecer atrás do rosto. A cor
 * é detectada pelos cantos; dá para forçar com --chroma "#EC0CF0".
 * --margin apara N% de cada célula (tira bordas que o gerador deixa entre os
 * quadros). --dry mostra o plano sem gravar nada.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'

/** sharp não é dependência do jogo — só desta ferramenta, instalada sob demanda. */
const loadSharp = async () => {
  try {
    return (await import('sharp')).default
  } catch {
    console.error('Este script precisa do sharp (só para cortar imagens):\n\n  npm i -D sharp\n')
    process.exit(1)
  }
}

const OUT_DIR = 'src/assets/faces'
const SIZE = 256

const parseArgs = (argv) => {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }
    const key = arg.slice(2)
    if (key === 'dry') {
      flags.dry = true
      continue
    }
    // --chroma vale sozinho (detecta a cor) ou com um hex logo depois
    if (key === 'chroma' && !(argv[i + 1] ?? '').startsWith('#')) {
      flags.chroma = 'auto'
      continue
    }
    flags[key] = argv[++i]
  }
  return { positional, flags }
}

const { positional, flags } = parseArgs(process.argv.slice(2))
const [sheet, rowsRaw, colsRaw] = positional
const rows = Number(rowsRaw)
const cols = Number(colsRaw)

if (!sheet || !Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
  console.error('uso: node scripts/slice-faces.mjs <imagem> <linhas> <colunas> [--prefix nome] [--margin 5] [--dry]')
  process.exit(1)
}

if (!existsSync(sheet)) {
  console.error(`imagem não encontrada: ${sheet}`)
  process.exit(1)
}

const marginPct = Number(flags.margin ?? 0)
if (!Number.isFinite(marginPct) || marginPct < 0 || marginPct >= 40) {
  console.error('--margin precisa ser um número entre 0 e 40 (porcentagem de cada célula)')
  process.exit(1)
}

const prefix = flags.prefix ?? basename(sheet).replace(/\.[^.]+$/, '')

const CHROMA_TOLERANCE = Number(flags.tolerance ?? 90)

const parseHex = (hex) => {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

/** Distância no cubo RGB — simples e suficiente para um fundo chapado. */
const colorDistance = (r, g, b, target) =>
  Math.sqrt((r - target[0]) ** 2 + (g - target[1]) ** 2 + (b - target[2]) ** 2)

/**
 * Tira o fundo chapado e a franja que ele deixa nas bordas.
 * O pixel vira transparente quando está perto da cor-chave; quando está
 * "meio perto" (borda), continua visível mas com a dominante do fundo
 * puxada para baixo — senão o rosto fica contornado de magenta.
 */
const applyChroma = (data, width, height, target) => {
  const isMagentaKey = target[0] > 150 && target[2] > 150 && target[1] < 100
  for (let i = 0; i < width * height; i++) {
    const p = i * 4
    const r = data[p]
    const g = data[p + 1]
    const b = data[p + 2]
    const distance = colorDistance(r, g, b, target)

    if (distance < CHROMA_TOLERANCE) {
      data[p + 3] = 0
      continue
    }
    if (distance > CHROMA_TOLERANCE * 2) continue

    // Borda contaminada: no magenta o vermelho E o azul sobem juntos, bem
    // acima do verde. Pele quente tem vermelho alto mas AZUL baixo, então
    // exigir os dois canais altos evita estragar o rosto.
    if (isMagentaKey && r > g + 25 && b > g + 25) {
      data[p] = Math.max(g, r - (r - g) * 0.6)
      data[p + 2] = Math.max(g, b - (b - g) * 0.6)
    }
  }
}

const run = async () => {
  const sharp = await loadSharp()
  const { width, height } = await sharp(sheet).metadata()
  if (!width || !height) {
    console.error('não deu para ler as dimensões da imagem')
    process.exit(1)
  }

  const cellW = Math.floor(width / cols)
  const cellH = Math.floor(height / rows)
  const insetX = Math.round((cellW * marginPct) / 100)
  const insetY = Math.round((cellH * marginPct) / 100)
  const cropW = cellW - insetX * 2
  const cropH = cellH - insetY * 2

  if (cropW < 32 || cropH < 32) {
    console.error('células pequenas demais depois da margem — reduza --margin')
    process.exit(1)
  }

  console.log(`${width}×${height} → ${rows}×${cols} células de ${cellW}×${cellH} (recorte ${cropW}×${cropH})`)

  // cor-chave: a informada, ou a do canto superior esquerdo da folha
  let chromaTarget = null
  if (flags.chroma) {
    if (flags.chroma === 'auto') {
      const corner = await sharp(sheet)
        .extract({ left: 0, top: 0, width: 1, height: 1 })
        .raw()
        .toBuffer()
      chromaTarget = [corner[0], corner[1], corner[2]]
    } else {
      chromaTarget = parseHex(flags.chroma)
    }
    console.log(`chroma key: rgb(${chromaTarget.join(', ')}) · tolerância ${CHROMA_TOLERANCE} · saída PNG`)
  }

  const extension = chromaTarget ? 'png' : 'jpg'

  mkdirSync(OUT_DIR, { recursive: true })
  const existing = existsSync(OUT_DIR)
    ? readdirSync(OUT_DIR).filter((name) => /\.(jpe?g|png|webp)$/i.test(name)).length
    : 0

  let written = 0
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const name = `${prefix}-${String(row * cols + col + 1).padStart(2, '0')}.${extension}`
      const target = join(OUT_DIR, name)
      if (flags.dry) {
        console.log(`  [dry] ${name}`)
        continue
      }
      if (existsSync(target)) {
        console.log(`  pulado (já existe): ${name}`)
        continue
      }

      const cell = sharp(sheet).extract({
        left: col * cellW + insetX,
        top: row * cellH + insetY,
        width: cropW,
        height: cropH,
      })

      if (!chromaTarget) {
        await cell
          .resize(SIZE, SIZE, { fit: 'cover' })
          .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
          .toFile(target)
        console.log(`  ✓ ${name}`)
        written++
        continue
      }

      // recorta o fundo ANTES de redimensionar: assim o filtro de escala já
      // trabalha com o alfa e não espalha a cor-chave pelas bordas
      const { data, info } = await cell
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      applyChroma(data, info.width, info.height, chromaTarget)
      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .resize(SIZE, SIZE, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(target)
      console.log(`  ✓ ${name}`)
      written++
    }
  }

  if (!flags.dry) {
    console.log(`\n${written} retratos novos · ${existing + written} no total em ${OUT_DIR}/`)
    console.log('Eles já entram no sorteio das cartas — nenhum código precisa mudar.')
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
