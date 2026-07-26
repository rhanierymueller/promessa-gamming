import { describe, expect, test } from 'vitest'
import { spinFor } from './dieSpin'
import type { DiceSide } from '../engine/dice/duel'

const SIDES: readonly DiceSide[] = [1, 2, 3, 4, 5, 6]
/** Cobre os ciclos de throwId que a fórmula usa (%2 e %3 → ciclo de 6). */
const THROW_IDS = Array.from({ length: 12 }, (_, i) => i + 1)
const ENERGIES = [0, 0.25, 0.5, 0.75, 1]

/** Duas rotações mostram a mesma face quando diferem por voltas inteiras. */
const sameFace = (a: number, b: number): boolean => (a - b) % 360 === 0

describe('spinFor', () => {
  test('a face ao assentar é a MESMA que a do fim da rolagem', () => {
    // o dado não pode trocar de número ao sair de 'rolling' para 'still'
    for (const value of SIDES) {
      for (const throwId of THROW_IDS) {
        for (const energy of ENERGIES) {
          const rolling = spinFor(value, 'rolling', energy, throwId)
          const still = spinFor(value, 'still', energy, throwId)
          expect(
            sameFace(rolling.x, still.x) && sameFace(rolling.y, still.y),
            `valor ${value}, throwId ${throwId}, energia ${energy}: ` +
              `rolagem termina em (${rolling.x}, ${rolling.y}) mas assenta em (${still.x}, ${still.y})`,
          ).toBe(true)
        }
      }
    }
  })

  test('parado, a rotação é exatamente a da face sorteada', () => {
    expect(spinFor(1, 'still', 0.5, 3)).toEqual({ x: 0, y: 0 })
    expect(spinFor(3, 'still', 0.5, 3)).toEqual({ x: 0, y: 180 })
    expect(spinFor(5, 'still', 0.5, 3)).toEqual({ x: -90, y: 0 })
  })

  test('rolando, o dado dá pelo menos duas voltas completas', () => {
    for (const throwId of THROW_IDS) {
      const { x, y } = spinFor(1, 'rolling', 0, throwId)
      expect(Math.max(Math.abs(x), Math.abs(y))).toBeGreaterThanOrEqual(720)
    }
  })

  test('mais energia joga o dado mais longe', () => {
    const fraco = spinFor(1, 'rolling', 0, 1)
    const forte = spinFor(1, 'rolling', 1, 1)
    expect(Math.abs(forte.y)).toBeGreaterThan(Math.abs(fraco.y))
  })

  test('lançamentos seguidos não giram todos igual', () => {
    const giros = THROW_IDS.map((throwId) => JSON.stringify(spinFor(1, 'rolling', 0.5, throwId)))
    expect(new Set(giros).size).toBeGreaterThan(1)
  })

  test('chacoalhando o dado não gira', () => {
    expect(spinFor(4, 'shaking', 1, 7)).toEqual({ x: 0, y: 90 })
  })
})
