import { describe, expect, test } from 'vitest'
import type { MatchRecord } from '../state/save'
import { isValidLeagueCode, normalizeLeagueCode, weeklyPointsFor } from './points'

const record = (overrides: Partial<MatchRecord>): MatchRecord => ({
  opponentId: 'pampa',
  teamGoals: 2,
  opponentGoals: 1,
  rating: 7,
  playerGoals: 1,
  playedAt: 0,
  competition: 'liga',
  ...overrides,
})

describe('weeklyPointsFor', () => {
  test('vitória + gols + gala somam pontos', () => {
    // Arrange: vitória (3) + 2 gols + nota de gala (2)
    const match = record({ teamGoals: 3, opponentGoals: 0, playerGoals: 2, rating: 8.5 })

    // Act & Assert
    expect(weeklyPointsFor(match)).toBe(7)
  })

  test('empate sem gols do craque vale 1', () => {
    expect(weeklyPointsFor(record({ teamGoals: 1, opponentGoals: 1, playerGoals: 0 }))).toBe(1)
  })

  test('derrota sem gols vale 0', () => {
    expect(weeklyPointsFor(record({ teamGoals: 0, opponentGoals: 2, playerGoals: 0 }))).toBe(0)
  })
})

describe('código de convite', () => {
  test('aceita 6 chars do alfabeto seguro e normaliza minúsculas', () => {
    // Act & Assert
    expect(isValidLeagueCode('abc234')).toBe(true)
    expect(normalizeLeagueCode(' abc234 ')).toBe('ABC234')
  })

  test('rejeita tamanho errado e caracteres ambíguos', () => {
    expect(isValidLeagueCode('ABC12')).toBe(false)
    expect(isValidLeagueCode('ABC10O')).toBe(false)
  })
})
