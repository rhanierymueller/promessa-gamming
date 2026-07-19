import { describe, expect, test } from 'vitest'
import { createRng, type RngState } from '../rng'
import { momentumFor, rollAutoGoal, rollMicroGoal, type Tactic } from './tactics'

const TRIALS = 2000

const autoGoalRate = (kind: 'teamGoal' | 'opponentGoal', tactic: Tactic): number => {
  let rng: RngState = createRng(42)
  let kept = 0
  for (let i = 0; i < TRIALS; i++) {
    const roll = rollAutoGoal(kind, tactic, rng)
    if (roll.value) kept++
    rng = roll.next
  }
  return kept / TRIALS
}

const microRate = (tactic: Tactic, side: 'team' | 'opponent'): number => {
  let rng: RngState = createRng(42)
  let count = 0
  for (let i = 0; i < TRIALS; i++) {
    const roll = rollMicroGoal(tactic, rng)
    if (roll.value === side) count++
    rng = roll.next
  }
  return count / TRIALS
}

describe('rollAutoGoal', () => {
  test('recuar evita muito mais gols do adversário que o equilibrado', () => {
    expect(autoGoalRate('opponentGoal', 'recuar')).toBeLessThan(
      autoGoalRate('opponentGoal', 'equilibrado') - 0.15,
    )
  })

  test('recuar também seca o próprio ataque', () => {
    expect(autoGoalRate('teamGoal', 'recuar')).toBeLessThan(autoGoalRate('teamGoal', 'equilibrado'))
  })

  test('é determinístico para o mesmo RNG', () => {
    expect(rollAutoGoal('teamGoal', 'recuar', createRng(7))).toEqual(
      rollAutoGoal('teamGoal', 'recuar', createRng(7)),
    )
  })
})

describe('rollMicroGoal', () => {
  test('contra-ataque gera mais gols emergentes nossos que qualquer outra tática', () => {
    const counter = microRate('contra-ataque', 'team')
    expect(counter).toBeGreaterThan(microRate('equilibrado', 'team'))
    expect(counter).toBeGreaterThan(microRate('recuar', 'team'))
  })

  test('recuar quase elimina gols emergentes (dos dois lados)', () => {
    expect(microRate('recuar', 'team')).toBeLessThan(0.01)
    expect(microRate('recuar', 'opponent')).toBeLessThan(0.015)
  })

  test('a maioria dos lances corridos não vira gol', () => {
    let rng: RngState = createRng(1)
    let none = 0
    for (let i = 0; i < TRIALS; i++) {
      const roll = rollMicroGoal('contra-ataque', rng)
      if (roll.value === null) none++
      rng = roll.next
    }
    expect(none / TRIALS).toBeGreaterThan(0.9)
  })
})

describe('momentum', () => {
  test('nota alta empurra o time: mais gols nossos vingam, menos deles', () => {
    // Arrange/Act: 2000 sorteios com e sem momentum
    const keptCount = (kind: 'teamGoal' | 'opponentGoal', momentum: number): number => {
      let rng = createRng(77)
      let kept = 0
      for (let i = 0; i < 2000; i++) {
        const roll = rollAutoGoal(kind, 'equilibrado', rng, momentum)
        rng = roll.next
        if (roll.value) kept++
      }
      return kept
    }

    // Assert
    expect(keptCount('teamGoal', 1)).toBeGreaterThan(keptCount('teamGoal', 0))
    expect(keptCount('opponentGoal', 1)).toBeLessThan(keptCount('opponentGoal', 0))
  })

  test('momentumFor mapeia a nota para -0.5..1', () => {
    expect(momentumFor(6)).toBe(0)
    expect(momentumFor(10)).toBe(1)
    expect(momentumFor(3)).toBe(-0.5)
  })
})

describe('rollMicroGoal com abismo técnico', () => {
  test('time muito melhor marca mais e sofre menos no lance corrido', () => {
    // Arrange
    let rngUp = createRng(11)
    let rngDown = createRng(11)
    let oursUp = 0
    let oursDown = 0
    let theirsUp = 0
    let theirsDown = 0

    // Act: mesmo dado, edges opostos
    for (let i = 0; i < 2000; i++) {
      const up = rollMicroGoal('equilibrado', rngUp, 0, 0.5)
      rngUp = up.next
      if (up.value === 'team') oursUp++
      if (up.value === 'opponent') theirsUp++
      const down = rollMicroGoal('equilibrado', rngDown, 0, -0.5)
      rngDown = down.next
      if (down.value === 'team') oursDown++
      if (down.value === 'opponent') theirsDown++
    }

    // Assert
    expect(oursUp).toBeGreaterThan(oursDown)
    expect(theirsUp).toBeLessThan(theirsDown)
  })
})
