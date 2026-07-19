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

  test('nota de gala faz o USUÁRIO ser o craque do jogo', () => {
    // Arrange
    const gala = { ...baseInput, playerRating: MOTM_MIN_RATING + 0.5 }

    // Act
    const best = pickBestPlayer(gala)

    // Assert
    expect(best.isUser).toBe(true)
    expect(best.name).toBe('Rhany')
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
