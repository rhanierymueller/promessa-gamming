import { describe, expect, test } from 'vitest'
import { shootoutFor, SHOOTOUT_MIN_GOALS } from './shootout'

describe('disputa de pênaltis', () => {
  test('a mesma partida dá sempre a mesma disputa', () => {
    // a tela do jogo e o avanço do torneio calculam separado: se divergirem,
    // o jogador vê um resultado e o chaveamento registra outro
    for (const seed of [0, 7, 42, 9999]) {
      expect(shootoutFor(seed)).toEqual(shootoutFor(seed))
    }
  })

  test('nunca termina empatada — sempre há um vencedor', () => {
    for (let seed = 0; seed < 500; seed++) {
      const { playerGoals, opponentGoals, playerWon } = shootoutFor(seed)
      expect(playerGoals).not.toBe(opponentGoals)
      expect(playerWon).toBe(playerGoals > opponentGoals)
    }
  })

  test('o placar é de disputa de pênaltis de verdade', () => {
    for (let seed = 0; seed < 300; seed++) {
      const { playerGoals, opponentGoals } = shootoutFor(seed)
      expect(Math.min(playerGoals, opponentGoals)).toBeGreaterThanOrEqual(SHOOTOUT_MIN_GOALS)
      expect(Math.max(playerGoals, opponentGoals)).toBeLessThanOrEqual(5)
    }
  })

  test('nenhum lado leva vantagem no longo prazo', () => {
    // Arrange
    let vitorias = 0
    const total = 2000

    // Act
    for (let seed = 0; seed < total; seed++) {
      if (shootoutFor(seed).playerWon) vitorias++
    }

    // Assert
    expect(vitorias / total).toBeGreaterThan(0.45)
    expect(vitorias / total).toBeLessThan(0.55)
  })
})
