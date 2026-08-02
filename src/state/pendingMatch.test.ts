import { describe, expect, test } from 'vitest'
import {
  clearPendingMatch,
  forfeitRecord,
  markPendingMatch,
  readPendingMatch,
  WO_OPPONENT_GOALS,
  WO_RATING,
  type PendingMatch,
} from './pendingMatch'

const fakeStorage = (): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> => {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    removeItem: (key: string) => { data.delete(key) },
  }
}

const pending: PendingMatch = { opponentId: 'mare-rubra', kind: 'liga', seed: 12345 }

describe('pendingMatch', () => {
  test('marca, lê de volta e limpa', () => {
    // Arrange
    const storage = fakeStorage()

    // Act & Assert
    expect(readPendingMatch(storage)).toBeNull()
    markPendingMatch(storage, pending)
    expect(readPendingMatch(storage)).toEqual(pending)
    clearPendingMatch(storage)
    expect(readPendingMatch(storage)).toBeNull()
  })

  test('conteúdo corrompido ou incompleto vira null', () => {
    // Arrange
    const storage = fakeStorage()

    // Act & Assert
    storage.setItem('promessa.pending-match', 'não é json')
    expect(readPendingMatch(storage)).toBeNull()
    storage.setItem('promessa.pending-match', JSON.stringify({ opponentId: 'x' }))
    expect(readPendingMatch(storage)).toBeNull()
    storage.setItem('promessa.pending-match', JSON.stringify({ opponentId: 'x', kind: 'copa', seed: 1 }))
    expect(readPendingMatch(storage)).toBeNull()
  })

  test('forfeitRecord: derrota por W.O. 0x3 com nota baixa', () => {
    // Act
    const record = forfeitRecord(pending, 1_700_000_000_000)

    // Assert
    expect(record).toEqual({
      opponentId: 'mare-rubra',
      teamGoals: 0,
      opponentGoals: WO_OPPONENT_GOALS,
      rating: WO_RATING,
      playerGoals: 0,
      playedAt: 1_700_000_000_000,
      competition: 'liga',
    })
  })

  test('forfeitRecord de torneio computa como jogo de seleção', () => {
    // Act
    const record = forfeitRecord({ ...pending, kind: 'torneio' }, 1)

    // Assert
    expect(record.competition).toBe('selecao')
  })

  test('forfeitRecord de Libertados computa como jogo continental', () => {
    // Act
    const record = forfeitRecord({ ...pending, kind: 'libertados' }, 1)

    // Assert
    expect(record.competition).toBe('libertados')
  })

  test('readPendingMatch aceita uma partida de Libertados gravada', () => {
    // Arrange
    const storage = fakeStorage()

    // Act
    markPendingMatch(storage, { opponentId: 'sa-inti', kind: 'libertados', seed: 3 })

    // Assert
    expect(readPendingMatch(storage)?.kind).toBe('libertados')
  })
})
