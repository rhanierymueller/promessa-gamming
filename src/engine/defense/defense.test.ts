import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { DEFAULT_SHOT_CONFIG as SHOT_CFG, goalCenter } from '../shot/config'
import { flightX } from '../shot/flight'
import {
  DEFAULT_DEFENSE_CONFIG as CFG,
  generateOpponentShot,
  resolveDive,
} from './defense'

const CENTER = goalCenter(SHOT_CFG)

describe('generateOpponentShot', () => {
  test('sempre mira dentro do gol', () => {
    // Act & Assert
    for (let seed = 0; seed < 30; seed++) {
      const { value } = generateOpponentShot(createRng(seed), 0.8, 90, SHOT_CFG)
      const finalX = flightX(value, 1)
      expect(finalX).toBeGreaterThan(SHOT_CFG.goal.left)
      expect(finalX).toBeLessThan(SHOT_CFG.goal.right)
      expect(value.targetHeight).toBeLessThan(SHOT_CFG.goal.barHeight)
    }
  })

  test('cobrador habilidoso busca mais o canto que o perna de pau', () => {
    // Arrange
    const distances = (skill: number): number => {
      let total = 0
      for (let seed = 0; seed < 40; seed++) {
        const { value } = generateOpponentShot(createRng(seed), skill, 90, SHOT_CFG)
        total += Math.abs(flightX(value, 1) - CENTER)
      }
      return total / 40
    }

    // Act & Assert
    expect(distances(1)).toBeGreaterThan(distances(0))
  })

  test('é determinística para a mesma seed', () => {
    // Act & Assert
    expect(generateOpponentShot(createRng(9), 0.5, 90, SHOT_CFG)).toEqual(
      generateOpponentShot(createRng(9), 0.5, 90, SHOT_CFG),
    )
  })
})

describe('resolveDive', () => {
  const shotTo = (targetX: number, targetHeight = 10) =>
    generateOpponentShot(createRng(1), 0, 90, SHOT_CFG).value && {
      ...generateOpponentShot(createRng(1), 0, 90, SHOT_CFG).value,
      targetX,
      targetHeight,
      curve: 0,
      startX: 90,
    }

  test('mergulho na direção certa e no tempo defende', () => {
    // Arrange
    const shot = shotTo(60)

    // Act & Assert
    expect(resolveDive(shot, 60, 0.3, CENTER, CFG)).toBe('saved')
  })

  test('mergulhar para o lado errado é gol sofrido', () => {
    // Arrange
    const shot = shotTo(60)

    // Act & Assert
    expect(resolveDive(shot, 120, 0.3, CENTER, CFG)).toBe('conceded')
  })

  test('sem mergulho só sai defesa se a bola vier no corpo', () => {
    // Arrange
    const central = shotTo(CENTER + 3)
    const corner = shotTo(58)

    // Act & Assert
    expect(resolveDive(central, null, 0, CENTER, CFG)).toBe('saved')
    expect(resolveDive(corner, null, 0, CENTER, CFG)).toBe('conceded')
  })

  test('mergulho atrasado encurta o alcance', () => {
    // Arrange: bola a 12 do mergulho — dentro do alcance normal, fora do atrasado
    const shot = shotTo(60)

    // Act & Assert
    expect(resolveDive(shot, 72, 0.3, CENTER, CFG)).toBe('saved')
    expect(resolveDive(shot, 72, 0.85, CENTER, CFG)).toBe('conceded')
  })

  test('bola no ângulo exige mergulho mais preciso', () => {
    // Arrange: mesma distância da luva, alturas diferentes
    const low = shotTo(60, 10)
    const high = shotTo(60, CFG.highBallHeight + 4)

    // Act & Assert
    expect(resolveDive(low, 73, 0.3, CENTER, CFG)).toBe('saved')
    expect(resolveDive(high, 73, 0.3, CENTER, CFG)).toBe('conceded')
  })
})
