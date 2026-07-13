import { describe, expect, test } from 'vitest'
import { DEFAULT_MATCH_CONFIG as CFG } from './config'
import { matchConfigFor } from './difficulty'

describe('matchConfigFor', () => {
  test('confronto equilibrado mantém a configuração base', () => {
    // Act
    const config = matchConfigFor(CFG, 3, 3)

    // Assert
    expect(config.teamGoalChance).toBe(CFG.teamGoalChance)
    expect(config.opponentGoalChance).toBe(CFG.opponentGoalChance)
  })

  test('enfrentar um clube maior deixa o jogo mais difícil', () => {
    // Act
    const underdog = matchConfigFor(CFG, 2, 5)

    // Assert
    expect(underdog.opponentGoalChance).toBeGreaterThan(CFG.opponentGoalChance)
    expect(underdog.teamGoalChance).toBeLessThan(CFG.teamGoalChance)
    expect(underdog.maxOpponentGoals).toBe(CFG.maxOpponentGoals + 1)
  })

  test('enfrentar um clube menor facilita, mas dentro de limites', () => {
    // Act
    const favorite = matchConfigFor(CFG, 5, 1)

    // Assert
    expect(favorite.teamGoalChance).toBeGreaterThan(CFG.teamGoalChance)
    expect(favorite.opponentGoalChance).toBeLessThan(CFG.opponentGoalChance)
    expect(favorite.opponentGoalChance).toBeGreaterThanOrEqual(0.1)
    expect(favorite.teamGoalChance).toBeLessThanOrEqual(0.75)
  })
})
