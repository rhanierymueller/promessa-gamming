import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { DEFAULT_SHOT_CONFIG as CFG, goalCenter } from './config'
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
})
