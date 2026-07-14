import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { DEFAULT_SHOT_CONFIG as CFG, goalCenter, keeperSkillForShot } from './config'
import { createFlight, flightX } from './flight'
import { keeperGuess, planKeeper } from './keeper'
import type { ShotCommand } from './types'

const makeFlight = (overrides: Partial<ShotCommand> = {}) =>
  createFlight(
    { power: 0.7, targetX: 60, targetHeight: 20, curve: 0, ...overrides },
    90,
    CFG,
  )

describe('keeperGuess', () => {
  test('lê chute reto com precisão (extrapolação linear acerta trajetória linear)', () => {
    // Arrange
    const flight = makeFlight({ curve: 0 })

    // Act
    const guess = keeperGuess(flight, 0.25, CFG)

    // Assert
    expect(guess).toBeCloseTo(flightX(flight, 1), 5)
  })

  test('é enganado pela curva — a estimativa erra o destino real', () => {
    // Arrange
    const flight = makeFlight({ curve: 18 })

    // Act
    const guess = keeperGuess(flight, 0.25, CFG)
    const actual = flightX(flight, 1)

    // Assert
    expect(Math.abs(guess - actual)).toBeGreaterThan(5)
  })
})

describe('planKeeper', () => {
  test('não mergulha além do alcance físico', () => {
    // Arrange: chute no canto extremo contra goleiro fraco
    const flight = makeFlight({ targetX: 10 })
    const weakSkill = 0

    // Act
    const { value } = planKeeper(flight, weakSkill, createRng(5), CFG)

    // Assert
    expect(value.diveX).toBeGreaterThanOrEqual(goalCenter(CFG) - CFG.maxDiveBase)
  })

  test('nunca reage antes do tempo mínimo humano', () => {
    // Arrange
    const flight = makeFlight()
    const superhumanSkill = 2

    // Act
    const { value } = planKeeper(flight, superhumanSkill, createRng(9), CFG)

    // Assert
    expect(value.reactT).toBeGreaterThanOrEqual(CFG.reactTMin)
  })

  test('goleiro mais habilidoso reage mais cedo', () => {
    // Arrange
    const flight = makeFlight()
    const seed = 11

    // Act
    const rookie = planKeeper(flight, 0.2, createRng(seed), CFG)
    const veteran = planKeeper(flight, 0.8, createRng(seed), CFG)

    // Assert
    expect(veteran.value.reactT).toBeLessThan(rookie.value.reactT)
  })

  test('é determinístico para a mesma seed', () => {
    // Arrange
    const flight = makeFlight({ curve: 12 })

    // Act
    const first = planKeeper(flight, 0.5, createRng(77), CFG)
    const second = planKeeper(flight, 0.5, createRng(77), CFG)

    // Assert
    expect(first).toEqual(second)
  })

  test('goleiro habilidoso LÊ a curva — cai mais perto do destino real', () => {
    // Arrange: chute com muita curva engana a extrapolação linear
    const flight = makeFlight({ targetX: 55, curve: 16 })
    const actual = flightX(flight, 1)
    const trials = 200

    // Act: erro médio do mergulho para novato × veterano
    const meanError = (skill: number): number => {
      let rng = createRng(31)
      let total = 0
      for (let i = 0; i < trials; i++) {
        const planned = planKeeper(flight, skill, rng, CFG)
        rng = planned.next
        total += Math.abs(planned.value.diveX - actual)
      }
      return total / trials
    }

    // Assert
    expect(meanError(0.85)).toBeLessThan(meanError(0.2) * 0.7)
  })

  test('às vezes crava o canto ERRADO — como um goleiro de verdade', () => {
    // Arrange: chute claro no canto esquerdo; sem o palpite errado ele iria sempre à esquerda
    const flight = makeFlight({ targetX: 50, curve: 0 })
    const center = goalCenter(CFG)
    const trials = 400

    // Act
    let wrongSide = 0
    let rng = createRng(123)
    for (let i = 0; i < trials; i++) {
      const planned = planKeeper(flight, 0.6, rng, CFG)
      rng = planned.next
      if (planned.value.diveX > center) wrongSide++
    }

    // Assert: minoria relevante (nem sempre acerta, nem vira loteria)
    expect(wrongSide / trials).toBeGreaterThan(0.05)
    expect(wrongSide / trials).toBeLessThan(0.3)
  })
})

describe('keeperSkillForShot com qualidade por contexto', () => {
  test('qualidade do contexto substitui a base e escala por chute, com teto', () => {
    // Act & Assert
    expect(keeperSkillForShot(CFG, 0)).toBeCloseTo(CFG.keeperBaseSkill)
    expect(keeperSkillForShot(CFG, 0, 0.65)).toBeCloseTo(0.65)
    expect(keeperSkillForShot(CFG, 2, 0.65)).toBeCloseTo(0.65 + 2 * CFG.keeperSkillPerShot)
    expect(keeperSkillForShot(CFG, 20, 0.65)).toBeLessThanOrEqual(0.95)
  })
})
