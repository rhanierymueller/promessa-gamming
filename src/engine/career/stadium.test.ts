import { describe, expect, test } from 'vitest'
import { stadiumTierFor } from './stadium'

describe('stadiumTierFor', () => {
  test('cada divisão tem o seu palco: da várzea ao caldeirão', () => {
    // Act & Assert
    expect(stadiumTierFor(3, 'liga')).toBe('varzea')
    expect(stadiumTierFor(2, 'liga')).toBe('pequeno')
    expect(stadiumTierFor(1, 'liga')).toBe('medio')
    expect(stadiumTierFor(0, 'liga')).toBe('grande')
  })

  test('jogo de seleção é sempre estádio grande', () => {
    // Act & Assert
    expect(stadiumTierFor(3, 'selecao')).toBe('grande')
    expect(stadiumTierFor(0, 'selecao')).toBe('grande')
  })

  test('divisão desconhecida cai na várzea (treinos e amistosos)', () => {
    // Act & Assert
    expect(stadiumTierFor(null, 'liga')).toBe('varzea')
    expect(stadiumTierFor(7, 'amistoso')).toBe('varzea')
  })
})
