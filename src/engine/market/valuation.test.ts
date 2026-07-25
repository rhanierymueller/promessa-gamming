import { describe, expect, test } from 'vitest'
import { ageValueMultiplier } from './valuation'

/**
 * A regra de negócio: o mercado paga pelo FUTURO. Mesmo overall, o garoto
 * custa muito mais que o veterano — ele ainda tem carreira para render.
 */

describe('ageValueMultiplier', () => {
  test('garoto de 20 vale MUITO mais que veterano de 35 com o mesmo overall', () => {
    // Arrange
    const jovem = ageValueMultiplier(20, 'alto')
    const veterano = ageValueMultiplier(35, 'alto')

    // Assert: não é uma diferença de detalhe — é de patamar
    expect(jovem).toBeGreaterThan(veterano * 3)
  })

  test('o valor cai de forma monótona a partir do auge', () => {
    // Arrange: dos 28 em diante cada ano vale menos que o anterior
    const idades = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37]

    // Act + Assert
    for (let i = 1; i < idades.length; i++) {
      expect(ageValueMultiplier(idades[i], 'medio')).toBeLessThan(
        ageValueMultiplier(idades[i - 1], 'medio'),
      )
    }
  })

  test('entre jovens, potencial alto vale mais que potencial baixo', () => {
    expect(ageValueMultiplier(19, 'alto')).toBeGreaterThan(ageValueMultiplier(19, 'medio'))
    expect(ageValueMultiplier(19, 'medio')).toBeGreaterThan(ageValueMultiplier(19, 'baixo'))
  })

  test('no veterano o potencial quase não muda o preço (não há mais o que render)', () => {
    // Arrange
    const alto = ageValueMultiplier(35, 'alto')
    const baixo = ageValueMultiplier(35, 'baixo')

    // Assert
    expect(alto - baixo).toBeLessThan(0.1)
  })

  test('o multiplicador nunca zera nem explode', () => {
    for (let age = 16; age <= 40; age++) {
      for (const potential of ['alto', 'medio', 'baixo'] as const) {
        const value = ageValueMultiplier(age, potential)
        expect(value).toBeGreaterThan(0.1)
        expect(value).toBeLessThanOrEqual(2.2)
      }
    }
  })

  test('o auge da carreira ainda vale mais que a decadência', () => {
    expect(ageValueMultiplier(26, 'medio')).toBeGreaterThan(ageValueMultiplier(33, 'medio'))
  })
})
