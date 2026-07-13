import { describe, expect, test } from 'vitest'
import { isCallUpEligible } from './callup'

describe('isCallUpEligible', () => {
  test('menos de 5 jogos não convoca, por melhor que sejam as notas', () => {
    expect(isCallUpEligible([])).toBe(false)
    expect(isCallUpEligible([10, 10, 10, 10])).toBe(false)
  })

  test('média 8.0 nas últimas 5 convoca', () => {
    expect(isCallUpEligible([8, 8, 8, 8, 8])).toBe(true)
    expect(isCallUpEligible([8, 7.5, 8.5, 8, 7.5])).toBe(false) // média 7.9
    expect(isCallUpEligible([9, 8.5, 8.5, 8, 8])).toBe(true)
  })

  test('bons jogos DE VERDADE: média 7.9 fica de fora', () => {
    expect(isCallUpEligible([7.9, 7.9, 7.9, 7.9, 7.9])).toBe(false)
  })

  test('só a forma recente conta: início ruim não impede, fim ruim derruba', () => {
    expect(isCallUpEligible([4, 4, 8.5, 8, 8, 8, 8])).toBe(true)
    expect(isCallUpEligible([9, 9, 9, 9, 9, 6, 6, 6, 6, 6])).toBe(false)
  })
})
