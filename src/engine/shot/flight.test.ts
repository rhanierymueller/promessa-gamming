import { describe, expect, test } from 'vitest'
import { DEFAULT_SHOT_CONFIG as CFG } from './config'
import { createFlight, flightGroundY, flightHeight, flightX } from './flight'

const makeFlight = (overrides: Partial<Parameters<typeof createFlight>[0]> = {}) =>
  createFlight(
    { power: 0.7, targetX: 60, targetHeight: 30, curve: 0, ...overrides },
    90,
    CFG,
  )

describe('createFlight', () => {
  test('chute mais forte voa por menos tempo e com mais arco', () => {
    // Arrange
    const soft = makeFlight({ power: 0.3 })
    const strong = makeFlight({ power: 1 })

    // Assert
    expect(strong.duration).toBeLessThan(soft.duration)
    expect(strong.arc).toBeGreaterThan(soft.arc)
  })
})

describe('flightX', () => {
  test('começa na bola e termina exatamente no alvo, mesmo com curva', () => {
    // Arrange
    const flight = makeFlight({ curve: 15 })

    // Assert
    expect(flightX(flight, 0)).toBeCloseTo(90)
    expect(flightX(flight, 1)).toBeCloseTo(60)
  })

  test('a curva desloca a bola lateralmente no meio do voo', () => {
    // Arrange
    const straight = makeFlight({ curve: 0 })
    const banana = makeFlight({ curve: 15 })

    // Act
    const deviation = flightX(banana, 0.5) - flightX(straight, 0.5)

    // Assert
    expect(deviation).toBeCloseTo(15)
  })
})

describe('flightHeight e flightGroundY', () => {
  test('a bola sai do chão e chega na altura mirada', () => {
    // Arrange
    const flight = makeFlight({ targetHeight: 30 })

    // Assert
    expect(flightHeight(flight, 0)).toBeCloseTo(0)
    expect(flightHeight(flight, 1)).toBeCloseTo(30)
  })

  test('a projeção no chão vai da marca até a linha do gol', () => {
    // Arrange
    const flight = makeFlight()

    // Assert
    expect(flightGroundY(flight, 0, CFG)).toBe(CFG.ballStartY)
    expect(flightGroundY(flight, 1, CFG)).toBe(CFG.goal.floorY)
  })
})
