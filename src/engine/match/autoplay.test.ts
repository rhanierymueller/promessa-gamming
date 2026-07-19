import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { DEFAULT_MATCH_CONFIG } from './config'
import { isFinished, startMatch } from './match'
import { simulateToEnd, type AutoPlayProbs } from './autoplay'

const ALWAYS: AutoPlayProbs = { shotGoal: 1, passComplete: 1, defenseSave: 1 }
const NEVER: AutoPlayProbs = { shotGoal: 0, passComplete: 0, defenseSave: 0 }

describe('simulateToEnd', () => {
  test('consome o plano inteiro e termina a partida', () => {
    // Arrange
    const match = startMatch(42, DEFAULT_MATCH_CONFIG)

    // Act
    const { value } = simulateToEnd(match, DEFAULT_MATCH_CONFIG, ALWAYS, createRng(7))

    // Assert
    expect(isFinished(value.state)).toBe(true)
  })

  test('com probabilidade 1, todo chute do jogador vira gol', () => {
    // Arrange
    const match = startMatch(42, DEFAULT_MATCH_CONFIG)
    const playerShots = match.plan.filter(
      (m) => m.kind === 'playerShot' || m.kind === 'playerFreeKick',
    ).length

    // Act
    const { value } = simulateToEnd(match, DEFAULT_MATCH_CONFIG, ALWAYS, createRng(7))

    // Assert
    expect(value.state.stats.goals).toBe(playerShots)
    expect(value.state.stats.shots).toBe(playerShots)
  })

  test('com probabilidade 0, nenhum lance do jogador dá certo e a nota cai', () => {
    // Arrange
    const match = startMatch(42, DEFAULT_MATCH_CONFIG)

    // Act
    const { value } = simulateToEnd(match, DEFAULT_MATCH_CONFIG, NEVER, createRng(7))

    // Assert
    expect(value.state.stats.goals).toBe(0)
    expect(value.state.stats.passesCompleted).toBe(0)
    expect(value.state.rating).toBeLessThan(DEFAULT_MATCH_CONFIG.baseRating)
  })

  test('gols do plano continuam valendo no placar', () => {
    // Arrange: seed com pelo menos um gol de plano de cada lado
    const match = startMatch(1234, DEFAULT_MATCH_CONFIG)
    const planTeamGoals = match.plan.filter((m) => m.kind === 'teamGoal').length
    const planOppGoals = match.plan.filter((m) => m.kind === 'opponentGoal').length

    // Act
    const { value } = simulateToEnd(match, DEFAULT_MATCH_CONFIG, NEVER, createRng(7))

    // Assert: prob 0 → só os gols do plano entram (defesa nunca pega a falta deles)
    const oppFreeKicks = match.plan.filter((m) => m.kind === 'opponentFreeKick').length
    expect(value.state.score.team).toBe(planTeamGoals)
    expect(value.state.score.opponent).toBe(planOppGoals + oppFreeKicks)
  })

  test('emite eventos para lances do jogador e gols, com minuto e sucesso', () => {
    // Arrange
    const match = startMatch(42, DEFAULT_MATCH_CONFIG)

    // Act
    const { value } = simulateToEnd(match, DEFAULT_MATCH_CONFIG, ALWAYS, createRng(7))

    // Assert
    const playable = match.plan.filter(
      (m) => m.kind !== 'kickoff' && m.kind !== 'fulltime' && m.kind !== 'commentary',
    ).length
    expect(value.events).toHaveLength(playable)
    for (const event of value.events) {
      expect(event.minute).toBeGreaterThanOrEqual(1)
      expect(event.minute).toBeLessThanOrEqual(90)
    }
    expect(value.events.every((event) => event.success)).toBe(true)
  })

  test('é determinístico para o mesmo rng', () => {
    // Arrange
    const match = startMatch(99, DEFAULT_MATCH_CONFIG)
    const probs: AutoPlayProbs = { shotGoal: 0.5, passComplete: 0.6, defenseSave: 0.4 }

    // Act & Assert
    expect(simulateToEnd(match, DEFAULT_MATCH_CONFIG, probs, createRng(5))).toEqual(
      simulateToEnd(match, DEFAULT_MATCH_CONFIG, probs, createRng(5)),
    )
  })

  test('partida já terminada devolve estado intacto e zero eventos', () => {
    // Arrange
    const match = startMatch(42, DEFAULT_MATCH_CONFIG)
    const done = simulateToEnd(match, DEFAULT_MATCH_CONFIG, ALWAYS, createRng(7)).value.state

    // Act
    const again = simulateToEnd(done, DEFAULT_MATCH_CONFIG, ALWAYS, createRng(8))

    // Assert
    expect(again.value.state).toEqual(done)
    expect(again.value.events).toHaveLength(0)
  })
})
