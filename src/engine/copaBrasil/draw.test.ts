import { describe, expect, test } from 'vitest'
import { CLUBS } from '../../data/clubs'
import { initialDivisions, divisionOf } from '../pyramid/pyramid'
import { createRng } from '../rng'
import { drawCopaBrasil, DIVISION_SHARE, spotsPerDivision } from './draw'
import { COPA_BRASIL_TEAMS } from './types'

const divisions = initialDivisions()

const sorteio = (seed: number, guaranteed: string | null = null) =>
  drawCopaBrasil(divisions, createRng(seed), guaranteed).value

const porDivisao = (bracket: readonly string[]): readonly number[] => {
  const count = [0, 0, 0, 0]
  for (const id of bracket) count[divisionOf(divisions, id)]++
  return count
}

describe('sorteio da Copa do Brasil', () => {
  test('a chave fecha com 32 clubes, sem repetir ninguém', () => {
    // Act
    const bracket = sorteio(7)

    // Assert
    expect(bracket).toHaveLength(COPA_BRASIL_TEAMS)
    expect(new Set(bracket).size).toBe(COPA_BRASIL_TEAMS)
  })

  test('as vagas seguem a fatia de cada divisão: 60/30/7/4', () => {
    // Act
    const spots = spotsPerDivision()

    // Assert
    expect(spots.reduce((sum, value) => sum + value, 0)).toBe(COPA_BRASIL_TEAMS)
    expect(spots[0]).toBeGreaterThan(spots[1])
    expect(spots[1]).toBeGreaterThan(spots[2])
    expect(spots[2]).toBeGreaterThanOrEqual(spots[3])
    expect(spots[3]).toBeGreaterThan(0)
  })

  test('a Série A domina a chave, mas a Série D está lá', () => {
    // Act
    const contagem = porDivisao(sorteio(11))

    // Assert
    expect(contagem[0]).toBeGreaterThan(contagem[1])
    expect(contagem[3]).toBeGreaterThan(0)
    // a fatia da Série A não pode virar chave inteira
    expect(contagem[0]).toBeLessThan(COPA_BRASIL_TEAMS)
  })

  test('o meu clube entra sempre, mesmo sendo da Série D', () => {
    // Arrange: um clube da última divisão
    const pequeno = CLUBS.find((club) => divisionOf(divisions, club.id) === 3)!

    // Act + Assert: em qualquer sorteio
    for (const seed of [1, 2, 3, 42, 777]) {
      expect(sorteio(seed, pequeno.id)).toContain(pequeno.id)
    }
  })

  test('o clube garantido não aparece duas vezes', () => {
    const bracket = sorteio(5, 'leoes-capital')
    expect(bracket.filter((id) => id === 'leoes-capital')).toHaveLength(1)
  })

  test('o garantido não cai sempre no mesmo lugar da chave', () => {
    // Arrange + Act: o mesmo clube em sorteios diferentes
    const posicoes = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
      sorteio(seed, 'leoes-capital').indexOf('leoes-capital'),
    )

    // Assert
    expect(new Set(posicoes).size).toBeGreaterThan(1)
  })

  test('é determinístico: a mesma semente dá a mesma chave', () => {
    expect(sorteio(99, 'leoes-capital')).toEqual(sorteio(99, 'leoes-capital'))
  })

  test('sementes diferentes dão chaves diferentes', () => {
    expect(sorteio(1)).not.toEqual(sorteio(2))
  })

  test('as vagas ficam perto da fatia pedida de cada divisão', () => {
    // as fatias 60/30/7/4 somam 101%: a Série A absorve a sobra do
    // arredondamento, então cada divisão fica a no máximo 2 vagas do alvo
    const spots = spotsPerDivision()
    spots.forEach((vagas, division) => {
      const alvo = DIVISION_SHARE[division] * COPA_BRASIL_TEAMS
      expect(Math.abs(vagas - alvo)).toBeLessThanOrEqual(2)
    })
  })

  test('só entram clubes que existem na pirâmide', () => {
    const ids = new Set(CLUBS.map((club) => club.id))
    for (const id of sorteio(13)) expect(ids.has(id)).toBe(true)
  })
})
