import { describe, expect, test } from 'vitest'
import { clubById, CLUBS, randomOpponent } from './clubs'

const REAL_CLUB_MARKS = [
  'corinthians', 'cruzeiro', 'flamengo', 'palmeiras', 'santos', 'grêmio', 'gremio',
  'vasco', 'botafogo', 'fluminense', 'atlético', 'atletico', 'internacional',
  'bahia', 'fortaleza', 'galo', 'mengão', 'mengao', 'timão', 'timao', 'colorado',
]

describe('CLUBS (database da liga fictícia)', () => {
  test('tem pelo menos 16 clubes com ids e abreviações únicos', () => {
    // Assert
    expect(CLUBS.length).toBeGreaterThanOrEqual(16)
    expect(new Set(CLUBS.map((c) => c.id)).size).toBe(CLUBS.length)
    expect(new Set(CLUBS.map((c) => c.abbr)).size).toBe(CLUBS.length)
  })

  test('nenhum nome contém marca de clube real (regra jurídica do projeto)', () => {
    // Act & Assert
    for (const club of CLUBS) {
      const haystack = `${club.name} ${club.nickname}`.toLowerCase()
      for (const mark of REAL_CLUB_MARKS) {
        expect(haystack, `"${club.name}" contém "${mark}"`).not.toContain(mark)
      }
    }
  })

  test('todo clube tem cores hex válidas e abreviação de 3 letras', () => {
    // Assert
    for (const club of CLUBS) {
      expect(club.colors.primary).toMatch(/^#[0-9A-F]{6}$/i)
      expect(club.colors.secondary).toMatch(/^#[0-9A-F]{6}$/i)
      expect(club.abbr).toMatch(/^[A-Z]{3}$/)
    }
  })

  test('força fica entre 1 e 5 estrelas e a liga tem grandes e pequenos', () => {
    // Assert
    for (const club of CLUBS) {
      expect(club.strength).toBeGreaterThanOrEqual(1)
      expect(club.strength).toBeLessThanOrEqual(5)
      expect(Number.isInteger(club.strength)).toBe(true)
    }
    expect(CLUBS.some((c) => c.strength >= 5)).toBe(true)
    expect(CLUBS.some((c) => c.strength <= 2)).toBe(true)
  })
})

describe('clubById', () => {
  test('encontra clube existente e retorna null para desconhecido', () => {
    // Assert
    expect(clubById('real-vila')?.name).toBe('Real da Vila')
    expect(clubById('nao-existe')).toBeNull()
  })
})

describe('randomOpponent', () => {
  test('nunca devolve o próprio clube', () => {
    // Act & Assert
    for (let i = 0; i < 20; i++) {
      const opponent = randomOpponent('real-vila', i / 20)
      expect(opponent.id).not.toBe('real-vila')
    }
  })
})
