import { describe, expect, test } from 'vitest'
import { ovrClass, OVR_ELITE, OVR_HIGH, OVR_MID } from './overallTier'

describe('ovrClass', () => {
  test('classifica craque de elite a partir de 85', () => {
    expect(ovrClass(OVR_ELITE)).toBe('ovr-elite')
    expect(ovrClass(94)).toBe('ovr-elite')
    expect(ovrClass(99)).toBe('ovr-elite')
  })

  test('classifica jogador forte entre 75 e 84', () => {
    expect(ovrClass(OVR_HIGH)).toBe('ovr-high')
    expect(ovrClass(80)).toBe('ovr-high')
    expect(ovrClass(OVR_ELITE - 1)).toBe('ovr-high')
  })

  test('classifica jogador mediano entre 62 e 74', () => {
    expect(ovrClass(OVR_MID)).toBe('ovr-mid')
    expect(ovrClass(70)).toBe('ovr-mid')
    expect(ovrClass(OVR_HIGH - 1)).toBe('ovr-mid')
  })

  test('classifica jogador fraco abaixo de 62', () => {
    expect(ovrClass(OVR_MID - 1)).toBe('ovr-low')
    expect(ovrClass(40)).toBe('ovr-low')
    expect(ovrClass(0)).toBe('ovr-low')
  })

  test('separa visualmente um craque de 95 de um titular de 75', () => {
    // antes da faixa elite os dois caíam em ovr-high e ficavam idênticos na lista
    expect(ovrClass(95)).not.toBe(ovrClass(75))
  })
})
