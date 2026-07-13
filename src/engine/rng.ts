/**
 * RNG determinístico (mulberry32) em estilo imutável: cada chamada retorna o
 * valor sorteado e o PRÓXIMO estado, sem mutar o anterior. Todo aleatório da
 * engine passa por aqui para que partidas sejam reproduzíveis por seed.
 */

export interface RngState {
  readonly seed: number
}

export interface RngResult<T> {
  readonly value: T
  readonly next: RngState
}

const UINT32_RANGE = 4294967296

export const createRng = (seed: number): RngState => ({ seed: seed >>> 0 })

export const nextFloat = (state: RngState): RngResult<number> => {
  const advanced = (state.seed + 0x6d2b79f5) | 0
  let t = Math.imul(advanced ^ (advanced >>> 15), 1 | advanced)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  const value = ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE
  return { value, next: { seed: advanced >>> 0 } }
}

export const nextInt = (state: RngState, min: number, max: number): RngResult<number> => {
  if (min > max) {
    throw new Error(`min (${min}) não pode ser maior que max (${max})`)
  }
  const { value, next } = nextFloat(state)
  return { value: min + Math.floor(value * (max - min + 1)), next }
}
