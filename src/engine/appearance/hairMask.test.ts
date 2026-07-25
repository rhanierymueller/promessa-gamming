import { describe, expect, test } from 'vitest'
import { hairMaskOf } from './hairMask'

const W = 40
const H = 40

/** Tela em branco: tudo pele clara e opaco. */
const canvasWithSkin = (): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    const p = i * 4
    data[p] = 200
    data[p + 1] = 140
    data[p + 2] = 100
    data[p + 3] = 255
  }
  return data
}

const paintRect = (
  data: Uint8ClampedArray,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: readonly [number, number, number],
): void => {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = (y * W + x) * 4
      data[p] = rgb[0]
      data[p + 1] = rgb[1]
      data[p + 2] = rgb[2]
    }
  }
}

const PRETO: readonly [number, number, number] = [20, 18, 17]
const countOf = (mask: Uint8Array): number => mask.reduce((sum, v) => sum + v, 0)

describe('máscara de cabelo', () => {
  test('encontra a massa escura no alto da cabeça', () => {
    // Arrange: cabelo preto ocupando o topo
    const data = canvasWithSkin()
    paintRect(data, 8, 2, 32, 14, PRETO)

    // Act
    const mask = hairMaskOf(data, W, H)

    // Assert: o miolo do bloco entrou
    expect(countOf(mask)).toBeGreaterThan(150)
    expect(mask[10 * W + 20]).toBe(1)
  })

  test('cabelo PRETO conta como cabelo — era o bug', () => {
    // a regra antiga exigia marrom (r - b >= 10) e ignorava preto neutro
    const data = canvasWithSkin()
    paintRect(data, 8, 2, 32, 14, [12, 12, 12])
    expect(countOf(hairMaskOf(data, W, H))).toBeGreaterThan(150)
  })

  test('pupilas e traços do rosto ficam de fora', () => {
    // Arrange: cabelo em cima e dois olhinhos escuros no meio do rosto
    const data = canvasWithSkin()
    paintRect(data, 8, 2, 32, 14, PRETO)
    paintRect(data, 14, 22, 17, 25, PRETO)
    paintRect(data, 23, 22, 26, 25, PRETO)

    // Act
    const mask = hairMaskOf(data, W, H)

    // Assert
    expect(mask[23 * W + 15]).toBe(0)
    expect(mask[23 * W + 24]).toBe(0)
  })

  test('contorno fino em volta do corpo não vira cabelo', () => {
    // Arrange: moldura preta de 1px, como o traço do desenho
    const data = canvasWithSkin()
    paintRect(data, 0, 0, W, 1, PRETO)
    paintRect(data, 0, H - 1, W, H, PRETO)
    paintRect(data, 0, 0, 1, H, PRETO)
    paintRect(data, W - 1, 0, W, H, PRETO)

    // Assert
    expect(countOf(hairMaskOf(data, W, H))).toBe(0)
  })

  test('sombra escura no torso não vira cabelo', () => {
    // Arrange: mancha escura grande, porém embaixo — cabelo mora no alto
    const data = canvasWithSkin()
    paintRect(data, 8, 26, 32, 38, PRETO)

    // Assert
    expect(countOf(hairMaskOf(data, W, H))).toBe(0)
  })

  test('sem nada escuro, não marca nada', () => {
    expect(countOf(hairMaskOf(canvasWithSkin(), W, H))).toBe(0)
  })

  test('pixel transparente nunca entra', () => {
    // Arrange: bloco escuro, mas invisível
    const data = canvasWithSkin()
    paintRect(data, 8, 2, 32, 14, PRETO)
    for (let y = 2; y < 14; y++) {
      for (let x = 8; x < 32; x++) data[(y * W + x) * 4 + 3] = 0
    }

    // Assert
    expect(countOf(hairMaskOf(data, W, H))).toBe(0)
  })
})
