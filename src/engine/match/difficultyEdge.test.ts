import { describe, expect, test } from 'vitest'
import { autoProbsForEdge } from './difficulty'

const BASE = { shotGoal: 0.55, defenseSave: 0.66 }

describe('a força do adversário pesa na simulação', () => {
  test('contra time mais fraco, você converte mais', () => {
    expect(autoProbsForEdge(BASE, 75, 55).shotGoal).toBeGreaterThan(BASE.shotGoal)
  })

  test('contra time mais forte, você converte menos — era o que faltava', () => {
    // medido antes: 58 contra 65 ainda vencia 93% das simulações
    expect(autoProbsForEdge(BASE, 58, 65).shotGoal).toBeLessThan(BASE.shotGoal)
  })

  test('times iguais não mudam nada', () => {
    expect(autoProbsForEdge(BASE, 64, 64)).toEqual(BASE)
  })

  test('o azarão nunca fica sem chance', () => {
    const massacre = autoProbsForEdge(BASE, 30, 99)
    expect(massacre.shotGoal).toBeGreaterThanOrEqual(0.08)
    expect(massacre.defenseSave).toBeGreaterThanOrEqual(0.08)
  })

  test('o favorito nunca vira imbatível', () => {
    const folgado = autoProbsForEdge(BASE, 99, 30)
    expect(folgado.shotGoal).toBeLessThanOrEqual(0.92)
    expect(folgado.defenseSave).toBeLessThanOrEqual(0.92)
  })

  test('quanto maior a diferença, maior o efeito', () => {
    const pouco = autoProbsForEdge(BASE, 68, 64).shotGoal
    const muito = autoProbsForEdge(BASE, 80, 64).shotGoal
    expect(muito).toBeGreaterThan(pouco)
  })
})
