import { describe, expect, test } from 'vitest'
import {
  clampVolume,
  DEFAULT_VOLUME,
  effectsGainFor,
  isMuted,
  MAX_VOLUME,
  musicGainFor,
  parseStoredVolume,
  volumeLabel,
} from './volume'

describe('volume contínuo', () => {
  test('o padrão é discreto — abre o site sem incomodar', () => {
    expect(DEFAULT_VOLUME).toBeGreaterThan(0)
    expect(DEFAULT_VOLUME).toBeLessThanOrEqual(0.25)
  })

  test('o valor fica entre o silêncio e o máximo', () => {
    expect(clampVolume(-3)).toBe(0)
    expect(clampVolume(99)).toBe(MAX_VOLUME)
    expect(clampVolume(0.42)).toBe(0.42)
  })

  test('valor inválido cai no padrão em vez de quebrar o áudio', () => {
    expect(clampVolume(Number.NaN)).toBe(DEFAULT_VOLUME)
  })

  test('subir o controle sempre aumenta os dois canais', () => {
    // Arrange
    const passos = [0, 0.2, 0.4, 0.6, 0.8, 1]

    // Assert
    for (let i = 1; i < passos.length; i++) {
      expect(effectsGainFor(passos[i])).toBeGreaterThan(effectsGainFor(passos[i - 1]))
      expect(musicGainFor(passos[i])).toBeGreaterThan(musicGainFor(passos[i - 1]))
    }
  })

  test('no zero é silêncio de verdade nos dois canais', () => {
    expect(effectsGainFor(0)).toBe(0)
    expect(musicGainFor(0)).toBe(0)
    expect(isMuted(0)).toBe(true)
    expect(isMuted(0.05)).toBe(false)
  })

  test('a música fica bem abaixo dos efeitos — é fundo, não trilha', () => {
    for (const v of [0.2, 0.5, 1]) {
      expect(musicGainFor(v)).toBeLessThan(effectsGainFor(v) / 2)
    }
  })

  test('nenhum ganho estoura o canal', () => {
    expect(effectsGainFor(1)).toBeLessThanOrEqual(1)
    expect(musicGainFor(1)).toBeLessThanOrEqual(1)
  })

  test('o padrão de hoje é mais baixo que os 0.35 do botão antigo', () => {
    expect(effectsGainFor(DEFAULT_VOLUME)).toBeLessThan(0.35)
  })

  test('o rótulo mostra a porcentagem para leitor de tela', () => {
    expect(volumeLabel(0)).toContain('desligado')
    expect(volumeLabel(0.2)).toContain('20')
  })
})

describe('leitura do que ficou salvo', () => {
  test('lê o número salvo', () => {
    expect(parseStoredVolume('0.45', null)).toBe(0.45)
  })

  test('sem nada salvo, cai no padrão', () => {
    expect(parseStoredVolume(null, null)).toBe(DEFAULT_VOLUME)
    expect(parseStoredVolume('qualquer-coisa', null)).toBe(DEFAULT_VOLUME)
  })

  test('quem silenciou no botão de três degraus continua no mudo', () => {
    expect(parseStoredVolume('mute', null)).toBe(0)
  })

  test('os degraus antigos viram números equivalentes', () => {
    expect(parseStoredVolume('low', null)).toBe(DEFAULT_VOLUME)
    expect(parseStoredVolume('high', null)).toBeGreaterThan(DEFAULT_VOLUME)
  })

  test('quem silenciou no botão original continua no mudo', () => {
    // o botão liga/desliga gravava '1' numa chave separada
    expect(parseStoredVolume(null, '1')).toBe(0)
    expect(parseStoredVolume(null, '0')).toBe(DEFAULT_VOLUME)
  })

  test('o volume salvo manda mais que a chave antiga', () => {
    expect(parseStoredVolume('0.7', '1')).toBe(0.7)
  })
})
