import { describe, expect, test } from 'vitest'
import { ageFactor, DECLINE_AGE, PEAK_AGE, RETIRE_AGE } from './aging'

describe('ageFactor — curva de carreira estilo FIFA', () => {
  test('aos 16 o jogador rende bem menos que no pico', () => {
    // Act & Assert
    expect(ageFactor(16, 'medio')).toBeLessThan(0.8)
    expect(ageFactor(PEAK_AGE, 'medio')).toBe(1)
  })

  test('cresce todo ano até o pico e segura o nível até os 31', () => {
    // Act & Assert
    for (let age = 16; age < PEAK_AGE; age++) {
      expect(ageFactor(age + 1, 'medio')).toBeGreaterThan(ageFactor(age, 'medio'))
    }
    expect(ageFactor(31, 'medio')).toBe(1)
  })

  test('a partir dos 32 só cai, até a aposentadoria aos 38', () => {
    // Act & Assert
    expect(DECLINE_AGE).toBe(32)
    expect(RETIRE_AGE).toBe(38)
    for (let age = DECLINE_AGE; age < RETIRE_AGE; age++) {
      expect(ageFactor(age + 1, 'medio')).toBeLessThan(ageFactor(age, 'medio'))
    }
    expect(ageFactor(RETIRE_AGE, 'medio')).toBeLessThan(1)
  })

  test('potencial define o teto: alto vira craque, baixo fica na média', () => {
    // Act & Assert: no pico, o teto muda com o potencial
    expect(ageFactor(PEAK_AGE, 'alto')).toBeGreaterThan(ageFactor(PEAK_AGE, 'medio'))
    expect(ageFactor(PEAK_AGE, 'medio')).toBeGreaterThan(ageFactor(PEAK_AGE, 'baixo'))
    // e um jovem de potencial alto já promete mais que um veterano limitado
    expect(ageFactor(21, 'alto')).toBeGreaterThan(ageFactor(21, 'baixo'))
  })
})
