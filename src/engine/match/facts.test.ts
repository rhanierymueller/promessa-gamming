import { describe, expect, test } from 'vitest'
import { MOTM_MIN_RATING, pickBestPlayer, type BestPlayerInput } from './facts'

const baseInput: BestPlayerInput = {
  seed: 77,
  teamGoals: 2,
  opponentGoals: 1,
  playerRating: 6.5,
  playerName: 'Rhany',
  teamSquad: ['Grilo', 'Formiga', 'Bagre', 'Doca', 'Rhany', 'Pardal'],
  opponentSquad: ['Tico', 'Jacaré', 'Trovão', 'Café', 'Maranhão'],
}

describe('pickBestPlayer', () => {
  test('é determinístico para o mesmo jogo', () => {
    expect(pickBestPlayer(baseInput)).toEqual(pickBestPlayer(baseInput))
  })

  test('nota de gala VENCENDO faz o usuário ser o craque do jogo', () => {
    // Arrange
    const gala = { ...baseInput, playerRating: MOTM_MIN_RATING + 0.5 }

    // Act
    const best = pickBestPlayer(gala)

    // Assert
    expect(best.isUser).toBe(true)
    expect(best.name).toBe('Rhany')
  })

  test('DERROTA nunca elege o usuário — nem com nota 10', () => {
    // Arrange: o craque do jogo sai do lado que ganhou
    const derrota = { ...baseInput, teamGoals: 2, opponentGoals: 3, playerRating: 10 }

    // Act
    const best = pickBestPlayer(derrota)

    // Assert
    expect(best.isUser).toBe(false)
    expect(baseInput.opponentSquad).toContain(best.name)
  })

  test('derrota não elege NINGUÉM do time perdedor', () => {
    // Arrange
    for (const rating of [3, 5, 7, 8.5, 10]) {
      const best = pickBestPlayer({ ...baseInput, teamGoals: 0, opponentGoals: 1, playerRating: rating })
      expect(baseInput.teamSquad).not.toContain(best.name)
      expect(best.isUser).toBe(false)
    }
  })

  test('empate com nota de gala ainda pode eleger o usuário', () => {
    // Arrange: empate não é derrota
    const empate = { ...baseInput, teamGoals: 1, opponentGoals: 1, playerRating: MOTM_MIN_RATING + 1 }

    // Act + Assert
    expect(pickBestPlayer(empate).isUser).toBe(true)
  })

  test('derrota com nota baixa dá o craque ao adversário', () => {
    // Arrange
    const badDay = { ...baseInput, teamGoals: 0, opponentGoals: 3, playerRating: 5 }

    // Act
    const best = pickBestPlayer(badDay)

    // Assert
    expect(best.isUser).toBe(false)
    expect(baseInput.opponentSquad).toContain(best.name)
  })

  test('vitória com nota comum elege um companheiro (nunca o usuário por tabela)', () => {
    // Arrange
    const teamWin = { ...baseInput, teamGoals: 2, opponentGoals: 0, playerRating: 6 }

    // Act
    const best = pickBestPlayer(teamWin)

    // Assert
    expect(best.isUser).toBe(false)
    expect(baseInput.teamSquad).toContain(best.name)
    expect(best.name).not.toBe('Rhany')
  })
})
