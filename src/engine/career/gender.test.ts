import { describe, expect, test } from 'vitest'
import { applyGender, wordsFor } from './gender'

describe('concordância de gênero nos textos', () => {
  test('carreira masculina mantém as frases como sempre foram', () => {
    expect(applyGender('{O} {jogador} decidiu: o gol foi {dele}.', 'masculino')).toBe(
      'O jogador decidiu: o gol foi dele.',
    )
  })

  test('carreira feminina flexiona artigo, pronome e substantivo', () => {
    expect(applyGender('{O} {jogador} decidiu: o gol foi {dele}.', 'feminino')).toBe(
      'A jogadora decidiu: o gol foi dela.',
    )
  })

  test('{Ele} no começo da frase sai com maiúscula', () => {
    expect(applyGender('{Ele} apareceu.', 'feminino')).toBe('Ela apareceu.')
    expect(applyGender('{Ele} apareceu.', 'masculino')).toBe('Ele apareceu.')
  })

  test('texto sem marcador passa intacto', () => {
    const frase = 'Gol do Corinthians aos 12 minutos!'
    expect(applyGender(frase, 'feminino')).toBe(frase)
  })

  test('a artilharia e a dona da braçadeira flexionam', () => {
    expect(wordsFor('feminino').artilheiro).toBe('artilheira')
    expect(wordsFor('feminino').dono).toBe('dona')
    expect(wordsFor('masculino').artilheiro).toBe('artilheiro')
  })

  test('nenhum marcador sobra depois da troca', () => {
    const modelo = '{O} {jogador}, {artilheiro} e {dono} da braçadeira. {Ele} joga, {dele}, {nele}, {do} time, o {cara}, {garoto}, {herdeiro}.'
    for (const gender of ['masculino', 'feminino'] as const) {
      expect(applyGender(modelo, gender)).not.toMatch(/\{[A-Za-z]+\}/)
    }
  })
})
