import { describe, expect, test } from 'vitest'
import { DEFAULT_MATCH_CONFIG as CFG } from './config'
import { matchConfigForRatings } from './difficulty'
import { startMatch } from './match'

/** Placar só dos gols de PLANO (sem os lances do usuário) para N partidas. */
const planWinRate = (myRating: number, oppRating: number, samples: number): number => {
  const config = matchConfigForRatings(CFG, myRating, oppRating)
  let wins = 0
  for (let seed = 1; seed <= samples; seed++) {
    const match = startMatch(seed, config)
    const team = match.plan.filter((moment) => moment.kind === 'teamGoal').length
    const opp = match.plan.filter((moment) => moment.kind === 'opponentGoal').length
    if (team > opp) wins++
  }
  return wins / samples
}

describe('matchConfigForRatings', () => {
  test('confronto igual mantém a base equilibrada', () => {
    // Act
    const config = matchConfigForRatings(CFG, 60, 60)

    // Assert
    expect(config.teamGoalChance).toBeCloseTo(CFG.teamGoalChance, 5)
    expect(config.opponentGoalChance).toBeCloseTo(CFG.opponentGoalChance, 5)
  })

  test('time 50 contra time 80: zebra é rara mas NÃO impossível', () => {
    // Act
    const underdogWins = planWinRate(50, 80, 400)

    // Assert
    expect(underdogWins).toBeGreaterThan(0.01)
    expect(underdogWins).toBeLessThan(0.22)
  })

  test('time 80 contra time 50 vence com folga na maioria', () => {
    // Act
    const favoriteWins = planWinRate(80, 50, 400)

    // Assert
    expect(favoriteWins).toBeGreaterThan(0.5)
  })

  test('probabilidades ficam presas em limites jogáveis', () => {
    // Act
    const crushed = matchConfigForRatings(CFG, 30, 92)
    const crushing = matchConfigForRatings(CFG, 92, 30)

    // Assert
    expect(crushed.teamGoalChance).toBeGreaterThanOrEqual(0.05)
    expect(crushed.opponentGoalChance).toBeLessThanOrEqual(0.9)
    expect(crushing.teamGoalChance).toBeLessThanOrEqual(0.85)
    expect(crushing.opponentGoalChance).toBeGreaterThanOrEqual(0.05)
    expect(crushed.maxOpponentGoals).toBeGreaterThan(CFG.maxOpponentGoals)
    expect(crushing.maxTeamGoals).toBeGreaterThan(CFG.maxTeamGoals)
  })
})
