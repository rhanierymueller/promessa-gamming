import sharp from 'sharp'

/**
 * Prepara a arte de um troféu para a Sala de Troféus: derruba o fundo de
 * chroma-key, apara as bordas vazias e reduz para a altura de exibição.
 *
 * A arte-fonte vem em alta resolução e com fundo chapado, do jeito que o
 * ilustrador entrega. A estante precisa do oposto: silhueta recortada, para o
 * drop-shadow funcionar, e alguns quilobytes em vez de um megabyte.
 */

const [, , input, output] = process.argv
if (!input || !output) {
  console.error('uso: node scripts/trophy-from-art.mjs <arte.png> <destino.png>')
  process.exit(1)
}

/** Altura dos troféus já existentes na estante. */
const TARGET_HEIGHT = 160
/** Distância máxima até a cor de fundo para o pixel virar transparente. */
const CHROMA_TOLERANCE = 90

const source = sharp(input)
const { width, height } = await source.metadata()
const pixels = await source.ensureAlpha().raw().toBuffer()

// a cor do canto superior esquerdo é o fundo — é assim que a arte é entregue
const [keyRed, keyGreen, keyBlue] = pixels

for (let i = 0; i < pixels.length; i += 4) {
  const distance = Math.hypot(
    pixels[i] - keyRed,
    pixels[i + 1] - keyGreen,
    pixels[i + 2] - keyBlue,
  )
  if (distance <= CHROMA_TOLERANCE) pixels[i + 3] = 0
}

await sharp(pixels, { raw: { width, height, channels: 4 } })
  .trim()
  .resize({ height: TARGET_HEIGHT })
  .png({ compressionLevel: 9 })
  .toFile(output)

console.log(`gravado ${output}`)
