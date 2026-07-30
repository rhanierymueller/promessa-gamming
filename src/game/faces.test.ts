import { describe, expect, test } from 'vitest'
import { facePresentationFor, faceUrlFor } from './faces'

describe('facePresentationFor', () => {
  test('mantém URL e enquadramento estáveis para o mesmo jogador', () => {
    const first = facePresentationFor('corinthians-3', 'masculino')
    const second = facePresentationFor('corinthians-3', 'masculino')

    expect(first).toEqual(second)
    expect(first?.url).toBe(faceUrlFor('corinthians-3', 'masculino'))
  })

  test('aplica correções limitadas aos retratos fora do centro', () => {
    const presentations = Array.from({ length: 200 }, (_, index) =>
      facePresentationFor(`jogador-${index}`, 'masculino'),
    ).filter((face) => face !== null)

    expect(presentations.some((face) => Math.abs(face.xShiftPercent) >= 5)).toBe(true)
    expect(presentations.some((face) => face.topCropPercent > 0)).toBe(true)
    for (const face of presentations) {
      expect(face.xShiftPercent).toBeGreaterThanOrEqual(-10)
      expect(face.xShiftPercent).toBeLessThanOrEqual(10)
      expect(face.topCropPercent).toBeGreaterThanOrEqual(0)
      expect(face.topCropPercent).toBeLessThanOrEqual(2)
    }
  })
})
