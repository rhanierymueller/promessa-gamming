import { describe, expect, test } from 'vitest'
import { mancheteFor, type MancheteMode } from './manchete'

const MODES: readonly MancheteMode[] = ['finalizacao', 'goleiro', 'falta']

describe('mancheteFor', () => {
  test('devolve manchete diferente por modo com o mesmo placar', () => {
    const manchetes = MODES.map((mode) => mancheteFor(10, mode))
    expect(new Set(manchetes).size).toBe(MODES.length)
  })

  test('cobre todo placar possível em qualquer modo', () => {
    for (const mode of MODES) {
      for (let score = 0; score <= 10; score++) {
        expect(mancheteFor(score, mode)).toBeTruthy()
      }
    }
  })

  test('placar alto e placar baixo dão manchetes distintas', () => {
    for (const mode of MODES) {
      expect(mancheteFor(10, mode)).not.toBe(mancheteFor(0, mode))
    }
  })

  test('a manchete nunca melhora quando o placar cai', () => {
    for (const mode of MODES) {
      const distintas = new Set<string>()
      for (let score = 10; score >= 0; score--) {
        distintas.add(mancheteFor(score, mode))
      }
      // 5 faixas por modo: sem buraco e sem faixa inalcançável
      expect(distintas.size).toBe(5)
    }
  })

  test('placar negativo cai na pior faixa em vez de estourar', () => {
    for (const mode of MODES) {
      expect(mancheteFor(-1, mode)).toBe(mancheteFor(0, mode))
    }
  })

  test('a falta fala de barreira, não de finalização', () => {
    expect(mancheteFor(10, 'falta')).not.toBe(mancheteFor(10, 'finalizacao'))
  })
})
