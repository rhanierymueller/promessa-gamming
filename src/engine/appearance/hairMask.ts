/**
 * Onde está o CABELO num sprite de personagem.
 *
 * Não dá para achar por cor: na arte o cabelo é preto e o contorno do desenho
 * é preto igual. A separação é por FORMA — cabelo é uma massa larga e o traço
 * é uma linha fina. Então:
 *
 *   1. marca todo pixel escuro;
 *   2. erode: só sobra quem está cercado de escuro (o traço fino cai fora);
 *   3. agrupa o que sobrou em regiões conexas e mantém as grandes, no alto do
 *      sprite — assim pupila, sobrancelha e sombra do torso ficam de fora.
 *
 * Antes a regra era de cor ("marrom escuro"), e cabelo preto simplesmente não
 * era encontrado: escolher loiro não mudava nada na tela.
 */

/** Acima disso o pixel já não é escuro o bastante para ser cabelo. */
const DARK_MAX_LUM = 64
/** Abaixo disso o pixel é transparente demais para contar. */
const MIN_ALPHA = 40
/** Fração da vizinhança 3×3 que precisa ser escura para o pixel sobreviver. */
const SOLID_SHARE = 0.8
/** Regiões menores que esta fatia dos pixels visíveis não são cabelo. */
const MIN_BLOB_SHARE = 0.01
/** Piso absoluto, para sprites pequenos onde a fatia daria quase nada. */
const MIN_BLOB_PIXELS = 24
/** Cabelo fica na cabeça: o centro da região tem que estar na metade de cima. */
const TOP_HALF = 0.5

const NEIGHBORS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const isDark = (data: Uint8ClampedArray, p: number): boolean =>
  data[p + 3] >= MIN_ALPHA && (data[p] + data[p + 1] + data[p + 2]) / 3 < DARK_MAX_LUM

/** 1 onde há cabelo, 0 no resto. Um byte por pixel. */
export const hairMaskOf = (data: Uint8ClampedArray, w: number, h: number): Uint8Array => {
  const dark = new Uint8Array(w * h)
  let visible = 0
  for (let i = 0; i < w * h; i++) {
    const p = i * 4
    if (data[p + 3] >= MIN_ALPHA) visible++
    if (isDark(data, p)) dark[i] = 1
  }

  // erosão: o traço do desenho tem vizinhança clara e não sobrevive
  const solid = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const index = y * w + x
      if (!dark[index]) continue
      let darkCount = 0
      let total = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          total++
          if (dark[ny * w + nx]) darkCount++
        }
      }
      if (darkCount / total >= SOLID_SHARE) solid[index] = 1
    }
  }

  const minBlob = Math.max(MIN_BLOB_PIXELS, visible * MIN_BLOB_SHARE)
  const mask = new Uint8Array(w * h)
  const seen = new Uint8Array(w * h)

  for (let start = 0; start < w * h; start++) {
    if (!solid[start] || seen[start]) continue
    // varre a região conexa inteira antes de decidir se ela é cabelo
    const region: number[] = []
    const stack = [start]
    seen[start] = 1
    let sumY = 0
    while (stack.length > 0) {
      const current = stack.pop()!
      region.push(current)
      const x = current % w
      const y = (current - x) / w
      sumY += y
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const next = ny * w + nx
        if (!solid[next] || seen[next]) continue
        seen[next] = 1
        stack.push(next)
      }
    }
    if (region.length < minBlob) continue
    if (sumY / region.length > h * TOP_HALF) continue
    for (const index of region) mask[index] = 1
  }

  return mask
}
