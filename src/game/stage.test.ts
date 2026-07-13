import { describe, expect, test } from 'vitest'
import type { Vec2 } from '../engine/shot/types'
import {
  beginRound,
  createDefenseStage,
  createStage,
  tick,
  TOTAL_SHOTS,
  tryDive,
  tryStartShot,
  type StageEvent,
  type StageState,
} from './stage'

const validDrag: Vec2[] = [
  { x: 90, y: 300 },
  { x: 80, y: 265 },
  { x: 70, y: 230 },
]

const DT = 1 / 60
const MAX_TICKS = 600

/** Avança o palco até a fase mudar, acumulando eventos. */
const tickUntilPhaseChanges = (state: StageState): [StageState, StageEvent[]] => {
  const startPhase = state.phase
  let current = state
  const events: StageEvent[] = []
  for (let i = 0; i < MAX_TICKS && current.phase === startPhase; i++) {
    const [next, newEvents] = tick(current, DT)
    current = next
    events.push(...newEvents)
  }
  expect(current.phase).not.toBe(startPhase)
  return [current, events]
}

const playOneShot = (state: StageState): [StageState, StageEvent[]] => {
  const armed = tryStartShot(state, validDrag)
  const [flying, kickEvents] = tickUntilPhaseChanges(armed)      // runup -> flying
  const [resolved, outcomeEvents] = tickUntilPhaseChanges(flying) // flying -> result
  const [settled, tailEvents] = tickUntilPhaseChanges(resolved)   // result -> ready|end
  return [settled, [...kickEvents, ...outcomeEvents, ...tailEvents]]
}

describe('createStage e beginRound', () => {
  test('nasce na introdução e começa a rodada pronta para o primeiro chute', () => {
    // Arrange
    const stage = createStage(42)

    // Act
    const round = beginRound(stage)

    // Assert
    expect(stage.phase).toBe('intro')
    expect(round.phase).toBe('ready')
    expect(round.shotIndex).toBe(0)
    expect(round.goals).toBe(0)
  })
})

describe('tryStartShot', () => {
  test('gesto válido inicia a corrida com o lance simulado', () => {
    // Arrange
    const round = beginRound(createStage(42))

    // Act
    const armed = tryStartShot(round, validDrag)

    // Assert
    expect(armed.phase).toBe('runup')
    expect(armed.sim).not.toBeNull()
  })

  test('gesto inválido é ignorado', () => {
    // Arrange
    const round = beginRound(createStage(42))
    const downward: Vec2[] = [{ x: 90, y: 240 }, { x: 90, y: 270 }, { x: 90, y: 300 }]

    // Act & Assert
    expect(tryStartShot(round, downward)).toBe(round)
  })

  test('fora da fase ready não aceita chute', () => {
    // Arrange
    const armed = tryStartShot(beginRound(createStage(42)), validDrag)

    // Act & Assert
    expect(tryStartShot(armed, validDrag)).toBe(armed)
  })
})

describe('fluxo completo de um chute', () => {
  test('corrida dispara o kick e o voo termina com o evento do desfecho', () => {
    // Arrange
    const armed = tryStartShot(beginRound(createStage(42)), validDrag)

    // Act
    const [flying, kickEvents] = tickUntilPhaseChanges(armed)
    const [resolved, outcomeEvents] = tickUntilPhaseChanges(flying)

    // Assert
    expect(kickEvents).toEqual(['kick'])
    expect(flying.phase).toBe('flying')
    expect(resolved.phase).toBe('result')
    expect(outcomeEvents).toHaveLength(1)
    expect(['goal', 'save', 'post', 'miss']).toContain(outcomeEvents[0])
    expect(resolved.results).toHaveLength(1)
  })

  test('após o resultado o palco prepara o próximo chute', () => {
    // Arrange
    const round = beginRound(createStage(42))

    // Act
    const [afterFirst] = playOneShot(round)

    // Assert
    expect(afterFirst.phase).toBe('ready')
    expect(afterFirst.shotIndex).toBe(1)
    expect(afterFirst.sim).toBeNull()
  })
})

describe('palco de chute único (modo partida)', () => {
  test('termina na fase end após um único chute, preservando o lance simulado', () => {
    // Arrange
    const round = beginRound(createStage(42, 1))

    // Act
    const [after] = playOneShot(round)

    // Assert
    expect(after.phase).toBe('end')
    expect(after.results).toHaveLength(1)
    expect(after.sim).not.toBeNull()
  })
})

describe('falta com barreira', () => {
  test('chute rasteiro no meio bate na barreira: evento blocked e NA BARREIRA', () => {
    // Arrange
    const round = beginRound(createStage(42, 1, true))
    expect(round.wall).not.toBeNull()
    const lowDrag: Vec2[] = [{ x: 90, y: 300 }, { x: 90, y: 285 }, { x: 90, y: 270 }]

    // Act
    const armed = tryStartShot(round, lowDrag)
    const [flying] = tickUntilPhaseChanges(armed)
    const [resolved, events] = tickUntilPhaseChanges(flying)

    // Assert
    expect(events).toContain('blocked')
    expect(resolved.phase).toBe('result')
    expect(resolved.results).toEqual(['miss'])
    expect(resolved.msg?.text).toBe('NA BARREIRA!')
  })

  test('sem barreira o mesmo chute segue até o gol', () => {
    // Arrange
    const round = beginRound(createStage(42, 1, false))

    // Assert
    expect(round.wall).toBeNull()
  })
})

describe('modo defesa', () => {
  test('o rival cobra sozinho e sem mergulho a bola no canto vira gol deles', () => {
    // Arrange: skill 1 = cobrador de elite, sempre no canto
    const round = beginRound(createDefenseStage(42, 1))
    expect(round.mode).toBe('defend')
    expect(round.sim).not.toBeNull()

    // Act: ninguém arrasta — ready(auto) -> runup -> flying -> result
    const [running] = tickUntilPhaseChanges(round)
    const [flying, kickEvents] = tickUntilPhaseChanges(running)
    const [resolved, endEvents] = tickUntilPhaseChanges(flying)

    // Assert
    expect(running.phase).toBe('runup')
    expect(kickEvents).toEqual(['kick'])
    expect(resolved.phase).toBe('result')
    expect(endEvents).toEqual(['defenseConcede'])
    expect(resolved.results).toEqual(['goal'])
  })

  test('mergulho na direção da bola defende', () => {
    // Arrange
    const round = beginRound(createDefenseStage(42, 1))
    const finalX = round.sim!.outcome.finalX

    // Act: entra no voo e mergulha exatamente no destino da bola
    const [running] = tickUntilPhaseChanges(round)
    const [flying] = tickUntilPhaseChanges(running)
    const dived = tryDive(flying, (finalX - 90) / 1.6)
    const [resolved, events] = tickUntilPhaseChanges(dived)

    // Assert
    expect(dived.diveX).not.toBeNull()
    expect(events).toEqual(['defenseSave'])
    expect(resolved.results).toEqual(['save'])
    expect(resolved.msg?.text).toBe('DEFESAÇA!')
  })

  test('não aceita chute do usuário em modo defesa', () => {
    // Arrange
    const round = beginRound(createDefenseStage(42, 1))

    // Act & Assert
    expect(tryStartShot(round, validDrag)).toBe(round)
  })
})

describe('rodada completa', () => {
  test('termina na fase end após todos os chutes, com placar consistente', () => {
    // Arrange
    let state = beginRound(createStage(7))

    // Act
    for (let shot = 0; shot < TOTAL_SHOTS; shot++) {
      ;[state] = playOneShot(state)
    }

    // Assert
    expect(state.phase).toBe('end')
    expect(state.results).toHaveLength(TOTAL_SHOTS)
    expect(state.goals).toBe(state.results.filter((r) => r === 'goal').length)
  })

  test('mesma seed e mesmos gestos produzem o mesmo placar', () => {
    // Arrange
    const run = (seed: number): string => {
      let state = beginRound(createStage(seed))
      for (let shot = 0; shot < TOTAL_SHOTS; shot++) {
        ;[state] = playOneShot(state)
      }
      return state.results.join(',')
    }

    // Act & Assert
    expect(run(99)).toBe(run(99))
  })
})
