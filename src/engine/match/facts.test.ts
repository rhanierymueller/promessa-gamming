import { describe, expect, test } from 'vitest'
import { buildMatchFacts, MOTM_MIN_RATING, type MatchFactsInput } from './facts'

const baseInput: MatchFactsInput = {
  seed: 77,
  teamGoals: 2,
  opponentGoals: 1,
  playerRating: 6.5,
  playerName: 'Rhany',
  teamSquad: ['Grilo', 'Formiga', 'Bagre', 'Doca', 'Rhany', 'Pardal'],
  opponentSquad: ['Tico', 'Jacaré', 'Trovão', 'Café', 'Maranhão'],
}

describe('buildMatchFacts', () => {
  test('é determinístico para o mesmo jogo', () => {
    // Act & Assert
    expect(buildMatchFacts(baseInput)).toEqual(buildMatchFacts(baseInput))
  })

  test('números são coerentes: gols ≤ no gol ≤ finalizações, posse dentro da faixa', () => {
    // Act
    const facts = buildMatchFacts(baseInput)

    // Assert
    expect(facts.onTargetTeam).toBeGreaterThanOrEqual(baseInput.teamGoals)
    expect(facts.shotsTeam).toBeGreaterThanOrEqual(facts.onTargetTeam)
    expect(facts.onTargetOpponent).toBeGreaterThanOrEqual(baseInput.opponentGoals)
    expect(facts.shotsOpponent).toBeGreaterThanOrEqual(facts.onTargetOpponent)
    expect(facts.possessionTeam).toBeGreaterThanOrEqual(34)
    expect(facts.possessionTeam).toBeLessThanOrEqual(66)
  })

  test('quem vence tende a ter mais posse', () => {
    // Arrange: goleada de 3 gols de diferença
    const rout = { ...baseInput, teamGoals: 4, opponentGoals: 1 }

    // Act & Assert
    expect(buildMatchFacts(rout).possessionTeam).toBeGreaterThan(50)
  })

  test('nota de gala faz o USUÁRIO ser o craque do jogo', () => {
    // Arrange
    const gala = { ...baseInput, playerRating: MOTM_MIN_RATING + 0.5 }

    // Act
    const facts = buildMatchFacts(gala)

    // Assert
    expect(facts.bestPlayerIsUser).toBe(true)
    expect(facts.bestPlayerName).toBe('Rhany')
  })

  test('derrota com nota baixa dá o craque ao adversário', () => {
    // Arrange
    const badDay = { ...baseInput, teamGoals: 0, opponentGoals: 3, playerRating: 5 }

    // Act
    const facts = buildMatchFacts(badDay)

    // Assert
    expect(facts.bestPlayerIsUser).toBe(false)
    expect(baseInput.opponentSquad).toContain(facts.bestPlayerName)
  })

  test('vitória com nota comum elege um companheiro (nunca o usuário por tabela)', () => {
    // Arrange
    const teamWin = { ...baseInput, teamGoals: 2, opponentGoals: 0, playerRating: 6 }

    // Act
    const facts = buildMatchFacts(teamWin)

    // Assert
    expect(facts.bestPlayerIsUser).toBe(false)
    expect(baseInput.teamSquad).toContain(facts.bestPlayerName)
    expect(facts.bestPlayerName).not.toBe('Rhany')
  })
})
