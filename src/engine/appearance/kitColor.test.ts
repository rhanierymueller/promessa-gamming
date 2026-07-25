import { describe, expect, test } from 'vitest'
import { rgbFromHex } from './kitColor'

describe('cor do uniforme a partir do hexadecimal', () => {
  test('lê a cor de um clube', () => {
    expect(rgbFromHex('#F5C518')).toEqual([245, 197, 24])
    expect(rgbFromHex('#1E7A3C')).toEqual([30, 122, 60])
  })

  test('aceita sem a cerquilha e em maiúsculas ou minúsculas', () => {
    expect(rgbFromHex('f5c518')).toEqual([245, 197, 24])
    expect(rgbFromHex('#f5c518')).toEqual(rgbFromHex('#F5C518'))
  })

  test('valor inválido devolve null em vez de uma cor errada', () => {
    // melhor manter o uniforme original da arte do que pintar de preto
    expect(rgbFromHex('')).toBeNull()
    expect(rgbFromHex('#12')).toBeNull()
    expect(rgbFromHex('não é cor')).toBeNull()
  })
})
