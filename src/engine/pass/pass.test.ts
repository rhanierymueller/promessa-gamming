import { describe, expect, test } from 'vitest'
import { createRng, type RngState } from '../rng'
import {
  decisionSecondsFor,
  generatePassOptions,
  PASS_TEMPLATE_COUNT,
  resolvePass,
  timeoutPass,
  type PassOption,
} from './pass'

const optionOfRisk = (options: readonly PassOption[], risk: PassOption['risk']): PassOption =>
  options.find((o) => o.risk === risk)!

describe('generatePassOptions', () => {
  test('sempre oferece as três faixas de risco', () => {
    // Act
    const { value } = generatePassOptions(createRng(1))

    // Assert
    expect(value.map((o) => o.risk)).toEqual(['safe', 'bold', 'audacious'])
  })

  test('recompensa cresce com o risco, chance de sucesso cai', () => {
    // Act
    const { value } = generatePassOptions(createRng(1))
    const safe = optionOfRisk(value, 'safe')
    const audacious = optionOfRisk(value, 'audacious')

    // Assert
    expect(audacious.ratingOnSuccess).toBeGreaterThan(safe.ratingOnSuccess)
    expect(audacious.successChance).toBeLessThan(safe.successChance)
  })

  test('templates ficam dentro do catálogo de narração', () => {
    // Act
    const { value } = generatePassOptions(createRng(9))

    // Assert
    for (const option of value) {
      expect(option.templateId).toBeGreaterThanOrEqual(0)
      expect(option.templateId).toBeLessThan(PASS_TEMPLATE_COUNT)
    }
  })

  test('é determinística para a mesma seed', () => {
    // Act & Assert
    expect(generatePassOptions(createRng(5))).toEqual(generatePassOptions(createRng(5)))
  })
})

describe('resolvePass', () => {
  const countSuccesses = (option: PassOption, trials: number): number => {
    let rng: RngState = createRng(2024)
    let successes = 0
    for (let i = 0; i < trials; i++) {
      const { value, next } = resolvePass(option, rng)
      if (value.completed) successes++
      rng = next
    }
    return successes
  }

  test('passe seguro completa muito mais que o audacioso', () => {
    // Arrange
    const { value: options } = generatePassOptions(createRng(1))
    const trials = 300

    // Act
    const safeRate = countSuccesses(optionOfRisk(options, 'safe'), trials) / trials
    const audaciousRate = countSuccesses(optionOfRisk(options, 'audacious'), trials) / trials

    // Assert
    expect(safeRate).toBeGreaterThan(0.8)
    expect(audaciousRate).toBeLessThan(0.5)
    expect(safeRate).toBeGreaterThan(audaciousRate)
  })

  test('sucesso paga o bônus da opção; erro cobra o preço', () => {
    // Arrange
    const option: PassOption = {
      risk: 'bold',
      templateId: 0,
      successChance: 1,
      ratingOnSuccess: 0.5,
      ratingOnFailure: -0.5,
    }
    const guaranteed = { ...option, successChance: 1 }
    const impossible = { ...option, successChance: 0 }

    // Act
    const success = resolvePass(guaranteed, createRng(3)).value
    const failure = resolvePass(impossible, createRng(3)).value

    // Assert
    expect(success).toEqual({ completed: true, ratingDelta: 0.5 })
    expect(failure).toEqual({ completed: false, ratingDelta: -0.5 })
  })
})

describe('timeoutPass', () => {
  test('estourar o tempo é sempre bola entregue', () => {
    // Act
    const result = timeoutPass()

    // Assert
    expect(result.completed).toBe(false)
    expect(result.ratingDelta).toBeLessThan(0)
  })
})

describe('decisionSecondsFor', () => {
  test('camisa 10 tem mais tempo para decidir o passe', () => {
    // Act & Assert
    expect(decisionSecondsFor(1)).toBeLessThan(decisionSecondsFor(6))
    expect(decisionSecondsFor(6)).toBeLessThan(decisionSecondsFor(10))
    expect(decisionSecondsFor(1)).toBeGreaterThanOrEqual(3)
    expect(decisionSecondsFor(10)).toBeLessThanOrEqual(8)
  })
})
