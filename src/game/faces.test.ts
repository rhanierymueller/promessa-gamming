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

  test('inclui os lotes 4 e 5 no sorteio geral sem misturar rostos asiáticos', () => {
    const urls = Array.from({ length: 500 }, (_, index) =>
      faceUrlFor(`clube-${index}`, 'masculino'),
    ).filter((url): url is string => url !== null)

    expect(urls.some((url) => url.includes('jogador4-'))).toBe(true)
    expect(urls.some((url) => url.includes('jogador5-'))).toBe(true)
    expect(urls.every((url) => !url.includes('/asia/'))).toBe(true)
  })

  test('centraliza o retrato desalinhado sem alterar sua escala', () => {
    const presentation = Array.from({ length: 500 }, (_, index) =>
      facePresentationFor(`clube-${index}`, 'masculino'),
    ).find((face) => face?.url.includes('jogador5-03'))

    expect(presentation?.xShiftPercent).toBe(7.6)
  })

  test('usa exclusivamente o pool asiático em Japão e Coreia do Sul', () => {
    const japan = Array.from({ length: 18 }, (_, index) =>
      faceUrlFor(`nation-japao-${index}`, 'masculino'),
    )
    const korea = Array.from({ length: 18 }, (_, index) =>
      faceUrlFor(`nation-coreia-do-sul-${index}`, 'masculino'),
    )
    const urls = [...japan, ...korea].filter((url): url is string => url !== null)

    expect(new Set(urls).size).toBeGreaterThan(1)
    expect(urls.every((url) => url.includes('/asia/'))).toBe(true)
  })
})
