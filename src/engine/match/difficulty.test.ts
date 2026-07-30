import { describe, expect, test } from 'vitest'
import { DEFAULT_ATTRIBUTES } from '../career/attributes'
import type { ContextoDaJogada } from '../decision/context'
import { createRng } from '../rng'
import { simulateToEnd } from './autoplay'
import { DEFAULT_MATCH_CONFIG as CFG } from './config'
import { matchConfigForRatings } from './difficulty'
import { startMatch } from './match'

const CONTEXTO: ContextoDaJogada = {
  attributes: DEFAULT_ATTRIBUTES,
  perks: [],
  tatica: 'equilibrado',
  momentum: 0,
  edges: { attack: 0, defense: 0, midfield: 0 },
  travamento: 0,
}

/**
 * Taxa de vitória no placar REAL da partida.
 *
 * Antes isto contava só os gols de PLANO, ignorando chute, defesa e decisão.
 * Servia enquanto o placar era quase todo sorteio — mas a decisão passou a
 * marcar para os dois lados, e medir só o plano deixaria este teste (o único
 * guarda de balanceamento do repo) verde enquanto o jogo desbalanceia.
 */
const winRate = (myRating: number, oppRating: number, samples: number): number => {
  const config = matchConfigForRatings(CFG, myRating, oppRating)
  let wins = 0
  for (let seed = 1; seed <= samples; seed++) {
    const sim = simulateToEnd(
      startMatch(seed, config),
      config,
      { shotGoal: 0.34, defenseSave: 0.42 },
      { contexto: CONTEXTO, perfil: 'equilibrado' },
      createRng(seed * 2654435761 + 11),
    )
    const { team, opponent } = sim.value.state.score
    if (team > opponent) wins++
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
    const underdogWins = winRate(50, 80, 400)

    // Assert
    expect(underdogWins).toBeGreaterThan(0.01)
    expect(underdogWins).toBeLessThan(0.22)
  })

  test('time 80 contra time 50 vence com folga na maioria', () => {
    // Act
    const favoriteWins = winRate(80, 50, 400)

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
