import { describe, expect, test } from 'vitest'
import { clubById, CLUBS } from '../../data/clubs'
import { SQUAD_SIZE } from '../squad/players'
import { aiTransfersFor, blockbusterOfTheYear, rivalSquadFor } from './aiTransfers'

const clubA = CLUBS.find((club) => club.division === 0)!
const clubD = CLUBS.find((club) => club.division === 3)!

describe('mercado dos rivais (contratações da IA)', () => {
  test('é determinístico: mesmas entradas, mesmas contratações', () => {
    // Arrange + Act
    const first = aiTransfersFor(clubA, 0, 5)
    const second = aiTransfersFor(clubA, 0, 5)

    // Assert
    expect(first).toEqual(second)
  })

  test('só Séries A e B contratam; C e D ficam de fora', () => {
    // Act + Assert
    expect(aiTransfersFor(clubD, 3, 10)).toHaveLength(0)
    expect(aiTransfersFor(clubA, 2, 10)).toHaveLength(0)
    const total = CLUBS.filter((c) => c.division <= 1)
      .flatMap((c) => aiTransfersFor(c, c.division, 3))
    expect(total.length).toBeGreaterThan(0)
  })

  test('contratado tem idade e overall plausíveis', () => {
    // Arrange + Act
    const transfers = CLUBS.filter((c) => c.division <= 1)
      .flatMap((c) => aiTransfersFor(c, c.division, 4))

    // Assert
    for (const transfer of transfers) {
      expect(transfer.signing.baseAge).toBeGreaterThanOrEqual(18)
      expect(transfer.signing.baseAge).toBeLessThanOrEqual(31)
      expect(transfer.overallAtSigning).toBeGreaterThanOrEqual(40)
      expect(transfer.overallAtSigning).toBeLessThanOrEqual(95)
      expect(transfer.signing.name.length).toBeGreaterThan(2)
    }
  })

  test('elenco rival mantém 18 jogadores e incorpora os contratados', () => {
    // Arrange
    const transfers = aiTransfersFor(clubA, 0, 6)
    const withAi = rivalSquadFor(clubA, 0, 6)

    // Assert: tamanho intacto; contratações ativas presentes no elenco
    expect(withAi).toHaveLength(SQUAD_SIZE)
    const activeIds = transfers
      .filter((t) => t.signing.baseAge + (6 - t.year) <= 38)
      .map((t) => t.signing.id)
    for (const id of activeIds) {
      expect(withAi.some((player) => player.id === id)).toBe(true)
    }
  })

  test('contratado envelhece de uma temporada para a outra', () => {
    // Arrange: primeiro ano com contratação de um clube grande
    const transfer = aiTransfersFor(clubA, 0, 8).find((t) => t.year <= 7)
    expect(transfer).toBeDefined()

    // Act
    const now = rivalSquadFor(clubA, 0, transfer!.year)
      .find((p) => p.id === transfer!.signing.id)
    const later = rivalSquadFor(clubA, 0, transfer!.year + 1)
      .find((p) => p.id === transfer!.signing.id)

    // Assert
    expect(now?.age).toBe(transfer!.signing.baseAge)
    expect(later?.age).toBe(transfer!.signing.baseAge + 1)
  })

  test('bomba do ano: só quando existe contratação realmente absurda (overall 80+)', () => {
    // Arrange: varre 12 temporadas — a bomba é rara mas acontece
    const divisions = [
      CLUBS.filter((c) => c.division === 0).map((c) => c.id),
      CLUBS.filter((c) => c.division === 1).map((c) => c.id),
      CLUBS.filter((c) => c.division === 2).map((c) => c.id),
      CLUBS.filter((c) => c.division === 3).map((c) => c.id),
    ]

    // Act
    const bombs = Array.from({ length: 12 }, (_, i) =>
      blockbusterOfTheYear(divisions, i + 1, clubD.id),
    ).filter((b) => b !== null)

    // Assert: existe, é 80+, e não é todo ano ("às vezes")
    expect(bombs.length).toBeGreaterThan(0)
    expect(bombs.length).toBeLessThan(12)
    for (const bomb of bombs) {
      expect(bomb!.overallAtSigning).toBeGreaterThanOrEqual(80)
      expect(clubById(bomb!.clubId)).toBeDefined()
      expect(bomb!.clubId).not.toBe(clubD.id)
    }
  })
})
