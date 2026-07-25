import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import {
  createDuel,
  DIE_SIDES,
  rollDie,
  rollsLeft,
  rollTurn,
  ROLLS_PER_SIDE,
  totalOf,
  type DiceDuel,
} from './duel'

/** Joga o duelo até o fim, do jeito que a tela joga. */
const playOut = (seed: number): DiceDuel => {
  let duel = createDuel(createRng(seed))
  for (let i = 0; i < 40 && duel.turn !== 'done'; i++) {
    duel = rollTurn(duel).duel
  }
  return duel
}

describe('o dado é honesto', () => {
  test('só sai de 1 a 6', () => {
    let rng = createRng(99)
    for (let i = 0; i < 3000; i++) {
      const { value, next } = rollDie(rng)
      rng = next
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(DIE_SIDES)
      expect(Number.isInteger(value)).toBe(true)
    }
  })

  test('as seis faces saem com frequência parecida', () => {
    // Arrange
    const contagem = new Map<number, number>()
    let rng = createRng(7)
    const N = 60_000

    // Act
    for (let i = 0; i < N; i++) {
      const { value, next } = rollDie(rng)
      rng = next
      contagem.set(value, (contagem.get(value) ?? 0) + 1)
    }

    // Assert: nenhuma face foge mais de 10% do esperado (1/6)
    const esperado = N / DIE_SIDES
    for (let face = 1; face <= DIE_SIDES; face++) {
      const saiu = contagem.get(face) ?? 0
      expect(Math.abs(saiu - esperado) / esperado).toBeLessThan(0.1)
    }
  })
})

describe('duelo de dados', () => {
  test('cada lado joga os TRÊS dados seguidos, sem alternar', () => {
    // Arrange
    let duel = createDuel(createRng(1))
    const ordem: string[] = []

    // Act
    for (let i = 0; i < ROLLS_PER_SIDE * 2; i++) {
      ordem.push(duel.turn as string)
      duel = rollTurn(duel).duel
    }

    // Assert: três de um, três do outro
    const primeiro = ordem[0]
    expect(ordem.slice(0, ROLLS_PER_SIDE).every((lado) => lado === primeiro)).toBe(true)
    expect(ordem.slice(ROLLS_PER_SIDE).every((lado) => lado !== primeiro)).toBe(true)
  })

  test('quem começa é sorteado — às vezes você, às vezes o rival', () => {
    // Arrange
    const aberturas = new Set(
      Array.from({ length: 40 }, (_, seed) => createDuel(createRng(seed)).starter),
    )

    // Assert
    expect(aberturas).toContain('player')
    expect(aberturas).toContain('ai')
  })

  test('o duelo sempre abre com quem foi sorteado', () => {
    for (let seed = 0; seed < 50; seed++) {
      const duel = createDuel(createRng(seed))
      expect(duel.turn).toBe(duel.starter)
    }
  })

  test('cada lado rola três vezes', () => {
    const duel = playOut(4242)
    expect(duel.playerRolls.length).toBeGreaterThanOrEqual(ROLLS_PER_SIDE)
    expect(duel.aiRolls.length).toBe(duel.playerRolls.length)
  })

  test('ganha quem soma mais', () => {
    for (const seed of [1, 2, 3, 7, 11, 42, 99, 1234]) {
      const duel = playOut(seed)
      const mine = totalOf(duel.playerRolls)
      const theirs = totalOf(duel.aiRolls)
      expect(duel.winner).toBe(mine > theirs ? 'player' : 'ai')
    }
  })

  test('o duelo SEMPRE termina com um vencedor — nunca empata', () => {
    for (let seed = 0; seed < 300; seed++) {
      const duel = playOut(seed)
      expect(duel.turn).toBe('done')
      expect(duel.winner).not.toBeNull()
    }
  })

  test('empate nos três primeiros vai para a morte súbita', () => {
    // Arrange: procura uma semente que empata em 3×3
    let encontrou = false
    for (let seed = 0; seed < 400 && !encontrou; seed++) {
      let duel = createDuel(createRng(seed))
      for (let i = 0; i < ROLLS_PER_SIDE * 2; i++) duel = rollTurn(duel).duel
      if (totalOf(duel.playerRolls) !== totalOf(duel.aiRolls)) continue

      // Assert: empatado, o duelo continua em vez de acabar
      encontrou = true
      expect(duel.winner).toBeNull()
      expect(duel.turn).not.toBe('done')
      const final = playOut(seed)
      expect(final.playerRolls.length).toBeGreaterThan(ROLLS_PER_SIDE)
      expect(final.winner).not.toBeNull()
    }
    expect(encontrou).toBe(true)
  })

  test('a morte súbita mantém os dois com o mesmo número de dados', () => {
    for (let seed = 0; seed < 200; seed++) {
      const duel = playOut(seed)
      expect(duel.playerRolls.length).toBe(duel.aiRolls.length)
    }
  })

  test('rolar depois de decidido não muda mais nada', () => {
    // Arrange
    const duel = playOut(77)

    // Act
    const depois = rollTurn(duel).duel

    // Assert
    expect(depois).toEqual(duel)
  })

  test('é determinístico: a mesma semente dá o mesmo duelo', () => {
    expect(playOut(555)).toEqual(playOut(555))
  })

  test('o placar de quantas faltam bate com o andamento', () => {
    let duel = createDuel(createRng(3))
    expect(rollsLeft(duel)).toBe(ROLLS_PER_SIDE * 2)
    duel = rollTurn(duel).duel
    expect(rollsLeft(duel)).toBe(ROLLS_PER_SIDE * 2 - 1)
  })

  test('nenhum lado leva vantagem no longo prazo', () => {
    // Arrange: 2000 duelos completos
    let vitorias = 0
    for (let seed = 0; seed < 2000; seed++) {
      if (playOut(seed).winner === 'player') vitorias++
    }

    // Assert: perto de 50% — o dado não pode favorecer ninguém
    expect(vitorias / 2000).toBeGreaterThan(0.45)
    expect(vitorias / 2000).toBeLessThan(0.55)
  })
})
