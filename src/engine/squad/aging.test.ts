import { describe, expect, test } from 'vitest'
import { ageFactor, declineAgeFor, DECLINE_AGE, PEAK_AGE, RETIRE_AGE, peakAgeFor } from './aging'

describe('cada carreira tem o seu tempo', () => {
  test('o precoce estoura cedo; o tardio ainda está se fazendo', () => {
    // Arrange: mesmo potencial, ritmos opostos
    const precoce = 1
    const tardio = 0

    // Assert: aos 21 o precoce já rende bem mais
    expect(ageFactor(21, 'medio', precoce)).toBeGreaterThan(ageFactor(21, 'medio', tardio))
  })

  test('quem amadurece cedo chega ao auge antes', () => {
    expect(peakAgeFor(1)).toBeLessThan(peakAgeFor(0))
  })

  test('o tardio também chega lá — só demora mais', () => {
    // Arrange
    const tardio = 0

    // Act: no auge DELE, rende o mesmo que o precoce no auge dele
    const noAugeDoTardio = ageFactor(peakAgeFor(tardio), 'medio', tardio)
    const noAugeDoPrecoce = ageFactor(peakAgeFor(1), 'medio', 1)

    // Assert
    expect(noAugeDoTardio).toBeCloseTo(noAugeDoPrecoce, 5)
  })

  test('ninguém amadurece antes dos 23 nem depois dos 30', () => {
    for (const bloom of [0, 0.25, 0.5, 0.75, 1]) {
      expect(peakAgeFor(bloom)).toBeGreaterThanOrEqual(23)
      expect(peakAgeFor(bloom)).toBeLessThanOrEqual(30)
    }
  })

  test('sem ritmo informado, a curva é a de sempre — pico aos 27', () => {
    expect(ageFactor(PEAK_AGE, 'medio')).toBe(1)
    expect(ageFactor(20, 'medio')).toBe(ageFactor(20, 'medio', 0.5))
  })

  test('todo mundo acaba caindo — cedo ou tarde', () => {
    for (const bloom of [0, 0.5, 1]) {
      expect(ageFactor(37, 'medio', bloom)).toBeLessThan(ageFactor(peakAgeFor(bloom), 'medio', bloom))
    }
  })

  test('quem estoura cedo também apaga cedo; quem demora, dura mais', () => {
    expect(declineAgeFor(1)).toBeLessThan(declineAgeFor(0))
  })

  test('o precoce já está caindo numa idade em que o tardio ainda cresce', () => {
    // Arrange: aos 29, o precoce (auge aos 23) está em queda
    const precoce = 1
    const tardio = 0

    // Assert
    expect(ageFactor(29, 'medio', precoce)).toBeLessThan(ageFactor(26, 'medio', precoce))
    expect(ageFactor(29, 'medio', tardio)).toBeGreaterThan(ageFactor(26, 'medio', tardio))
  })

  test('o ritmo médio mantém a curva clássica: platô até 31, queda aos 32', () => {
    expect(declineAgeFor(0.5)).toBe(DECLINE_AGE)
  })
})

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
