import { describe, expect, test } from 'vitest'
import { DEFAULT_SHOT_CONFIG as CFG } from './config'
import { createFlight } from './flight'
import { DEFAULT_WALL, resolveWall, wallForShot } from './wall'
import type { ShotCommand } from './types'

const makeFlight = (overrides: Partial<ShotCommand> = {}) =>
  createFlight(
    { power: 0.7, targetX: 90, targetHeight: 30, curve: 0, ...overrides },
    90,
    CFG,
  )

describe('resolveWall', () => {
  test('chute alto encobre a barreira', () => {
    // Arrange: arco alto no meio do caminho
    const flight = makeFlight({ targetHeight: 40, power: 0.8 })

    // Act & Assert
    expect(resolveWall(flight, DEFAULT_WALL, false)).toBe('over')
  })

  test('chute rasteiro no meio bate na barreira', () => {
    // Arrange
    const flight = makeFlight({ targetHeight: 2, power: 0.3 })

    // Act & Assert
    expect(resolveWall(flight, DEFAULT_WALL, false)).toBe('blocked')
  })

  test('curva acentuada contorna a barreira', () => {
    // Arrange: banana que sai do vão na posição da barreira
    const flight = makeFlight({ targetHeight: 2, curve: 20, power: 0.3 })

    // Act & Assert
    expect(resolveWall(flight, DEFAULT_WALL, false)).toBe('around')
  })

  test('o pulo da barreira transforma um "over" apertado em bloqueio', () => {
    // Arrange: altura que passa raspando a barreira parada (~16 na linha dela)
    const flight = makeFlight({ targetHeight: 20, power: 0.5 })
    const standing = resolveWall(flight, DEFAULT_WALL, false)

    // Act
    const jumping = resolveWall(flight, DEFAULT_WALL, true)

    // Assert
    expect(standing).toBe('over')
    expect(jumping).toBe('blocked')
  })
})

describe('wallForShot', () => {
  test('posiciona a barreira entre a bola e o centro do gol', () => {
    // Act
    const wall = wallForShot(60, 90)

    // Assert
    expect(wall.centerX).toBeGreaterThan(60)
    expect(wall.centerX).toBeLessThan(90)
  })
})
