import { describe, expect, test } from 'vitest'
import { createRng, nextFloat, nextInt, type RngState } from './rng'

const takeFloats = (state: RngState, count: number): number[] => {
  const values: number[] = []
  let current = state
  for (let i = 0; i < count; i++) {
    const { value, next } = nextFloat(current)
    values.push(value)
    current = next
  }
  return values
}

describe('createRng', () => {
  test('mesma seed produz a mesma sequência', () => {
    // Arrange
    const rngA = createRng(42)
    const rngB = createRng(42)

    // Act
    const sequenceA = takeFloats(rngA, 20)
    const sequenceB = takeFloats(rngB, 20)

    // Assert
    expect(sequenceA).toEqual(sequenceB)
  })

  test('seeds diferentes produzem sequências diferentes', () => {
    // Arrange
    const rngA = createRng(1)
    const rngB = createRng(2)

    // Act
    const sequenceA = takeFloats(rngA, 10)
    const sequenceB = takeFloats(rngB, 10)

    // Assert
    expect(sequenceA).not.toEqual(sequenceB)
  })
})

describe('nextFloat', () => {
  test('retorna valores no intervalo [0, 1)', () => {
    // Arrange
    const rng = createRng(123)

    // Act
    const values = takeFloats(rng, 1000)

    // Assert
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  test('é pura: não muta o estado recebido', () => {
    // Arrange
    const rng = createRng(7)

    // Act
    const first = nextFloat(rng)
    const second = nextFloat(rng)

    // Assert
    expect(first.value).toBe(second.value)
    expect(first.next).toEqual(second.next)
    expect(rng).toEqual(createRng(7))
  })
})

describe('nextInt', () => {
  test('respeita o intervalo [min, max] inclusivo', () => {
    // Arrange
    let state = createRng(99)

    // Act & Assert
    for (let i = 0; i < 500; i++) {
      const { value, next } = nextInt(state, 2, 5)
      expect(value).toBeGreaterThanOrEqual(2)
      expect(value).toBeLessThanOrEqual(5)
      expect(Number.isInteger(value)).toBe(true)
      state = next
    }
  })

  test('cobre todos os valores do intervalo ao longo de muitas amostras', () => {
    // Arrange
    let state = createRng(2024)
    const seen = new Set<number>()

    // Act
    for (let i = 0; i < 200; i++) {
      const { value, next } = nextInt(state, 0, 3)
      seen.add(value)
      state = next
    }

    // Assert
    expect([...seen].sort()).toEqual([0, 1, 2, 3])
  })

  test('lança erro quando min é maior que max', () => {
    // Arrange
    const rng = createRng(1)

    // Act & Assert
    expect(() => nextInt(rng, 5, 2)).toThrow('min (5) não pode ser maior que max (2)')
  })
})
