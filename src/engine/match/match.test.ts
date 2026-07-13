import { describe, expect, test } from 'vitest'
import { DEFAULT_MATCH_CONFIG as CFG } from './config'
import {
  advance,
  applyDefenseResult,
  applyPassResult,
  applyShotResult,
  currentMoment,
  isFinished,
  isPlayerMoment,
  startMatch,
} from './match'
import { displayRating } from './rating'
import type { MatchState } from './types'

/** Joga a partida inteira: gol em todo chute, acerto em todo passe. */
const playPerfectMatch = (state: MatchState): MatchState => {
  let current = state
  while (!isFinished(current)) {
    const moment = currentMoment(current)
    if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') {
      current = applyShotResult(current, 'goal', false, CFG)
    } else if (moment.kind === 'playerPass') {
      current = applyPassResult(current, true, 0.5, CFG)
    } else if (moment.kind === 'opponentFreeKick') {
      current = applyDefenseResult(current, true, CFG)
    } else {
      current = advance(current)
    }
  }
  return current
}

describe('startMatch', () => {
  test('gera a timeline entre o apito inicial e o final, em ordem de minuto', () => {
    // Arrange & Act
    const match = startMatch(42, CFG)

    // Assert
    expect(match.plan[0].kind).toBe('kickoff')
    expect(match.plan[match.plan.length - 1].kind).toBe('fulltime')
    const minutes = match.plan.map((m) => m.minute)
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes)
  })

  test('inclui exatamente os lances jogáveis configurados', () => {
    // Arrange & Act
    const match = startMatch(42, CFG)

    // Assert
    expect(match.plan.filter((m) => m.kind === 'playerShot')).toHaveLength(CFG.playerShots)
    expect(match.plan.filter((m) => m.kind === 'playerFreeKick')).toHaveLength(CFG.playerFreeKicks)
    expect(match.plan.filter((m) => m.kind === 'playerPass')).toHaveLength(CFG.playerPasses)
    expect(match.plan.filter((m) => m.kind === 'opponentFreeKick')).toHaveLength(CFG.opponentFreeKicks)
  })

  test('é determinística para a mesma seed', () => {
    // Act & Assert
    expect(startMatch(7, CFG)).toEqual(startMatch(7, CFG))
  })

  test('seeds diferentes geram partidas diferentes', () => {
    // Act & Assert
    expect(startMatch(1, CFG).plan).not.toEqual(startMatch(2, CFG).plan)
  })
})

describe('advance', () => {
  test('narração não mexe no placar', () => {
    // Arrange
    const match = startMatch(42, CFG)

    // Act
    const after = advance(match)

    // Assert
    expect(after.score).toEqual({ team: 0, opponent: 0 })
    expect(after.cursor).toBe(1)
  })

  test('gol do time e do adversário movem o placar', () => {
    // Arrange: percorre a partida errando todos os lances do jogador
    let state = startMatch(11, CFG)
    let expectedTeam = 0
    let expectedOpponent = 0

    // Act
    while (!isFinished(state)) {
      const moment = currentMoment(state)
      if (moment.kind === 'teamGoal') expectedTeam++
      if (moment.kind === 'opponentGoal') expectedOpponent++
      if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') state = applyShotResult(state, 'miss', false, CFG)
      else if (moment.kind === 'playerPass') state = applyPassResult(state, false, -0.4, CFG)
      else if (moment.kind === 'opponentFreeKick') state = applyDefenseResult(state, true, CFG)
      else state = advance(state)
    }

    // Assert
    expect(state.score.team).toBe(expectedTeam)
    expect(state.score.opponent).toBe(expectedOpponent)
  })

  test('recusa avançar por cima de um lance do jogador', () => {
    // Arrange: avança até o primeiro momento jogável
    let state = startMatch(42, CFG)
    while (!isPlayerMoment(currentMoment(state))) state = advance(state)

    // Act & Assert
    expect(() => advance(state)).toThrow(/mini-game/)
  })
})

describe('applyShotResult e applyPassResult', () => {
  const atFirstMoment = (kind: 'playerShot' | 'playerPass', seed = 42): MatchState => {
    let state = startMatch(seed, CFG)
    while (currentMoment(state).kind !== kind) {
      const moment = currentMoment(state)
      if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') state = applyShotResult(state, 'save', false, CFG)
      else if (moment.kind === 'playerPass') state = applyPassResult(state, true, 0, CFG)
      else if (moment.kind === 'opponentFreeKick') state = applyDefenseResult(state, true, CFG)
      else state = advance(state)
    }
    return state
  }

  test('gol do jogador soma no placar, nas estatísticas e na nota', () => {
    // Arrange
    const before = atFirstMoment('playerShot')

    // Act
    const after = applyShotResult(before, 'goal', true, CFG)

    // Assert
    expect(after.score.team).toBe(before.score.team + 1)
    expect(after.stats.goals).toBe(before.stats.goals + 1)
    expect(after.stats.golacos).toBe(1)
    expect(after.rating).toBeGreaterThan(before.rating)
  })

  test('chute pra fora derruba a nota sem mexer no placar', () => {
    // Arrange
    const before = atFirstMoment('playerShot')

    // Act
    const after = applyShotResult(before, 'miss', false, CFG)

    // Assert
    expect(after.score).toEqual(before.score)
    expect(after.rating).toBeLessThan(before.rating)
  })

  test('passe certo conta nas estatísticas e aplica o delta na nota', () => {
    // Arrange
    const before = atFirstMoment('playerPass')

    // Act
    const after = applyPassResult(before, true, 0.5, CFG)

    // Assert
    expect(after.stats.passes).toBe(1)
    expect(after.stats.passesCompleted).toBe(1)
    expect(after.rating).toBeCloseTo(Math.min(CFG.maxRating, before.rating + 0.5))
  })

  test('aplicar resultado de chute num momento de passe é erro de programação', () => {
    // Arrange
    const state = atFirstMoment('playerPass')

    // Act & Assert
    expect(() => applyShotResult(state, 'goal', false, CFG)).toThrow(/fora de hora/)
  })
})

describe('applyDefenseResult', () => {
  const atDefenseMoment = (seed = 42): MatchState => {
    let state = startMatch(seed, CFG)
    while (currentMoment(state).kind !== 'opponentFreeKick') {
      const moment = currentMoment(state)
      if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') state = applyShotResult(state, 'save', false, CFG)
      else if (moment.kind === 'playerPass') state = applyPassResult(state, true, 0, CFG)
      else state = advance(state)
    }
    return state
  }

  test('defesa sobe a nota sem mexer no placar', () => {
    // Arrange
    const before = atDefenseMoment()

    // Act
    const after = applyDefenseResult(before, true, CFG)

    // Assert
    expect(after.score).toEqual(before.score)
    expect(after.rating).toBeGreaterThan(before.rating)
  })

  test('gol sofrido soma no placar deles e desconta na nota', () => {
    // Arrange
    const before = atDefenseMoment()

    // Act
    const after = applyDefenseResult(before, false, CFG)

    // Assert
    expect(after.score.opponent).toBe(before.score.opponent + 1)
    expect(after.rating).toBeLessThan(before.rating)
  })
})

describe('partida completa', () => {
  test('flui do início ao fim com placar e nota coerentes', () => {
    // Arrange & Act
    const finished = playPerfectMatch(startMatch(99, CFG))

    // Assert
    expect(isFinished(finished)).toBe(true)
    const finishes = CFG.playerShots + CFG.playerFreeKicks
    expect(finished.stats.shots).toBe(finishes)
    expect(finished.stats.goals).toBe(finishes)
    expect(finished.score.team).toBeGreaterThanOrEqual(finishes)
    expect(finished.rating).toBeLessThanOrEqual(CFG.maxRating)
    expect(finished.rating).toBeGreaterThan(CFG.baseRating)
  })

  test('a nota nunca estoura os limites', () => {
    // Arrange: partida perfeita (teto) e depois desastre (piso)
    const perfect = playPerfectMatch(startMatch(5, CFG))

    let disaster = startMatch(5, CFG)
    while (!isFinished(disaster)) {
      const moment = currentMoment(disaster)
      if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') disaster = applyShotResult(disaster, 'miss', false, CFG)
      else if (moment.kind === 'playerPass') disaster = applyPassResult(disaster, false, -2, CFG)
      else if (moment.kind === 'opponentFreeKick') disaster = applyDefenseResult(disaster, false, CFG)
      else disaster = advance(disaster)
    }

    // Assert
    expect(perfect.rating).toBeLessThanOrEqual(CFG.maxRating)
    expect(disaster.rating).toBeGreaterThanOrEqual(CFG.minRating)
  })
})

describe('displayRating', () => {
  test('arredonda para uma casa decimal', () => {
    expect(displayRating(7.6499999)).toBe(7.6)
    expect(displayRating(6.85)).toBe(6.9)
  })
})
