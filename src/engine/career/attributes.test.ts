import { describe, expect, test } from 'vitest'
import { DEFAULT_DEFENSE_CONFIG } from '../defense/defense'
import { DEFAULT_SHOT_CONFIG } from '../shot/config'
import { DEFAULT_WALL } from '../shot/wall'
import {
  applyUpgrade,
  boostedPassChance,
  canUpgrade,
  DEFAULT_ATTRIBUTES,
  defenseTuning,
  MAX_ATTRIBUTE,
  shotTuning,
  trainingPointsForRating,
  upgradeCost,
  wallTuning,
} from './attributes'

describe('progressão de atributos', () => {
  test('subir de nível fica mais caro por faixa: base até 5, dobro no 6-7, triplo no 8-9', () => {
    expect(upgradeCost(3)).toBe(3)
    expect(upgradeCost(4)).toBe(4)
    expect(upgradeCost(5)).toBe(5)
    expect(upgradeCost(6)).toBe(12)
    expect(upgradeCost(7)).toBe(14)
    expect(upgradeCost(8)).toBe(24)
    expect(upgradeCost(9)).toBe(27)
  })

  test('maxar um atributo do início (3) ao teto custa 89 pontos', () => {
    // Arrange
    const levels = [3, 4, 5, 6, 7, 8, 9]

    // Act
    const total = levels.reduce((sum, level) => sum + upgradeCost(level), 0)

    // Assert
    expect(total).toBe(89)
  })

  test('canUpgrade exige pontos suficientes e respeita o teto', () => {
    // Arrange
    const attrs = DEFAULT_ATTRIBUTES // tudo nível 3
    const maxed = { ...attrs, finalizacao: MAX_ATTRIBUTE }

    // Act & Assert
    expect(canUpgrade(attrs, 'finalizacao', 3)).toBe(true)
    expect(canUpgrade(attrs, 'finalizacao', 2)).toBe(false)
    expect(canUpgrade(maxed, 'finalizacao', 99)).toBe(false)
  })

  test('applyUpgrade sobe um nível sem mutar o original', () => {
    // Act
    const after = applyUpgrade(DEFAULT_ATTRIBUTES, 'passe')

    // Assert
    expect(after.passe).toBe(DEFAULT_ATTRIBUTES.passe + 1)
    expect(DEFAULT_ATTRIBUTES.passe).toBe(3)
  })
})

describe('trainingPointsForRating', () => {
  test('jogão rende 3, jogo bom 2, mediano 1, desastre 0', () => {
    expect(trainingPointsForRating(8.5)).toBe(3)
    expect(trainingPointsForRating(7)).toBe(2)
    expect(trainingPointsForRating(5.5)).toBe(1)
    expect(trainingPointsForRating(4.9)).toBe(0)
  })
})

describe('efeitos na física', () => {
  test('finalização reduz a dispersão do chute monotonicamente', () => {
    // Act
    const rookie = shotTuning(DEFAULT_SHOT_CONFIG, 1)
    const mid = shotTuning(DEFAULT_SHOT_CONFIG, 5)
    const elite = shotTuning(DEFAULT_SHOT_CONFIG, 10)

    // Assert
    expect(rookie.dispersionX).toBe(DEFAULT_SHOT_CONFIG.dispersionX)
    expect(mid.dispersionX).toBeLessThan(rookie.dispersionX)
    expect(elite.dispersionX).toBeLessThan(mid.dispersionX)
    expect(elite.dispersionX).toBeGreaterThan(0)
  })

  test('cobrança encolhe o pulo da barreira', () => {
    // Act
    const elite = wallTuning(DEFAULT_WALL, 10)

    // Assert
    expect(elite.jumpBoost).toBeLessThan(DEFAULT_WALL.jumpBoost)
    expect(elite.jumpBoost).toBeGreaterThan(0)
    expect(elite.height).toBe(DEFAULT_WALL.height)
  })

  test('defesa estica a luva e tolera mergulho mais tardio', () => {
    // Act
    const elite = defenseTuning(DEFAULT_DEFENSE_CONFIG, 10)

    // Assert
    expect(elite.reach).toBeGreaterThan(DEFAULT_DEFENSE_CONFIG.reach)
    expect(elite.lateDiveT).toBeGreaterThan(DEFAULT_DEFENSE_CONFIG.lateDiveT)
    expect(elite.lateDiveT).toBeLessThanOrEqual(0.85)
  })

  test('passe aumenta a chance mas nunca garante (cap 97%)', () => {
    // Act & Assert
    expect(boostedPassChance(0.6, 1)).toBe(0.6)
    expect(boostedPassChance(0.6, 10)).toBeCloseTo(0.78)
    expect(boostedPassChance(0.92, 10)).toBe(0.97)
  })
})
