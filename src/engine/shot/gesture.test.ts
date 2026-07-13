import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { DEFAULT_SHOT_CONFIG as CFG } from './config'
import { applyDispersion, readGesture } from './gesture'
import type { Vec2 } from './types'

const straightDrag = (fromY: number, toY: number, x = 90): Vec2[] => [
  { x, y: fromY },
  { x, y: (fromY + toY) / 2 },
  { x, y: toY },
]

describe('readGesture', () => {
  test('retorna null com menos de 3 pontos', () => {
    // Arrange
    const points: Vec2[] = [{ x: 90, y: 300 }, { x: 90, y: 240 }]

    // Act & Assert
    expect(readGesture(points, 90, CFG)).toBeNull()
  })

  test('retorna null para traço curto demais', () => {
    // Arrange
    const points = straightDrag(300, 290)

    // Act & Assert
    expect(readGesture(points, 90, CFG)).toBeNull()
  })

  test('retorna null quando o traço não aponta para cima', () => {
    // Arrange
    const points = straightDrag(240, 300)

    // Act & Assert
    expect(readGesture(points, 90, CFG)).toBeNull()
  })

  test('traço reto para cima mira o centro sem curva', () => {
    // Arrange
    const points = straightDrag(300, 240)

    // Act
    const command = readGesture(points, 90, CFG)

    // Assert
    expect(command).not.toBeNull()
    expect(command!.curve).toBe(0)
    expect(command!.targetX).toBe(90)
  })

  test('traço mais longo gera mais força e mais altura', () => {
    // Arrange
    const shortDrag = readGesture(straightDrag(300, 260), 90, CFG)!
    const longDrag = readGesture(straightDrag(300, 180), 90, CFG)!

    // Assert
    expect(longDrag.power).toBeGreaterThan(shortDrag.power)
    expect(longDrag.targetHeight).toBeGreaterThan(shortDrag.targetHeight)
  })

  test('barriga do traço para a direita vira curva positiva, limitada ao máximo', () => {
    // Arrange
    const gentle: Vec2[] = [{ x: 90, y: 300 }, { x: 98, y: 270 }, { x: 90, y: 240 }]
    const extreme: Vec2[] = [{ x: 90, y: 300 }, { x: 160, y: 270 }, { x: 90, y: 240 }]

    // Act
    const gentleCommand = readGesture(gentle, 90, CFG)!
    const extremeCommand = readGesture(extreme, 90, CFG)!

    // Assert
    expect(gentleCommand.curve).toBeGreaterThan(0)
    expect(extremeCommand.curve).toBe(CFG.maxCurve)
  })

  test('força é limitada entre o mínimo e 1', () => {
    // Arrange
    const barelyValid = readGesture(straightDrag(300, 280), 90, CFG)!
    const overDrag = readGesture(straightDrag(310, 40), 90, CFG)!

    // Assert
    expect(barelyValid.power).toBe(CFG.minPower)
    expect(overDrag.power).toBe(1)
  })
})

describe('applyDispersion', () => {
  test('abaixo do limiar de força não dispersa a mira', () => {
    // Arrange
    const command = { power: 0.6, targetX: 60, targetHeight: 30, curve: 0 }

    // Act
    const { value } = applyDispersion(command, createRng(1), CFG)

    // Assert
    expect(value.targetX).toBe(60)
    expect(value.targetHeight).toBe(30)
  })

  test('força acima do limiar dispersa a mira', () => {
    // Arrange
    const command = { power: 1, targetX: 60, targetHeight: 30, curve: 0 }

    // Act
    const { value } = applyDispersion(command, createRng(1), CFG)

    // Assert
    expect(value.targetX).not.toBe(60)
  })

  test('chute fraco sai rasteiro', () => {
    // Arrange
    const command = { power: 0.3, targetX: 90, targetHeight: 40, curve: 0 }

    // Act
    const { value } = applyDispersion(command, createRng(7), CFG)

    // Assert
    expect(value.targetHeight).toBeLessThanOrEqual(CFG.weakShotMaxHeight)
  })

  test('é determinística para a mesma seed', () => {
    // Arrange
    const command = { power: 0.95, targetX: 55, targetHeight: 35, curve: 10 }

    // Act
    const first = applyDispersion(command, createRng(42), CFG)
    const second = applyDispersion(command, createRng(42), CFG)

    // Assert
    expect(first).toEqual(second)
  })
})
