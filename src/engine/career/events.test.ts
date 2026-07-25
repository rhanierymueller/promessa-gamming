import { describe, expect, test } from 'vitest'
import {
  DEFAULT_MORALE,
  LIFE_EVENTS,
  driftMorale,
  eventById,
  maybeEventForRound,
  moraleRatingBonus,
  resolveLifeEvent,
} from './events'

describe('catálogo de eventos', () => {
  test('todo evento tem prompt e exatamente 3 opções com textos', () => {
    expect(LIFE_EVENTS.length).toBeGreaterThanOrEqual(6)
    for (const event of LIFE_EVENTS) {
      expect(event.prompt.length).toBeGreaterThan(0)
      expect(event.options).toHaveLength(3)
      for (const option of event.options) {
        expect(option.label.length).toBeGreaterThan(0)
        expect(option.textWin.length).toBeGreaterThan(0)
        expect(option.textLose.length).toBeGreaterThan(0)
        expect(option.chance).toBeGreaterThan(0)
        expect(option.chance).toBeLessThanOrEqual(1)
      }
    }
  })

  test('a primeira opção de cada evento é a segura (chance 1)', () => {
    for (const event of LIFE_EVENTS) {
      expect(event.options[0].chance).toBe(1)
    }
  })
})

describe('sorteio de evento', () => {
  test('é determinístico para a mesma seed', () => {
    const a = maybeEventForRound(12345)
    const b = maybeEventForRound(12345)
    expect(a).toEqual(b)
  })

  test('sorteia evento em parte das rodadas, não em todas', () => {
    const drawn = Array.from({ length: 60 }, (_, i) => maybeEventForRound(i * 7919))
    const hits = drawn.filter((event) => event !== null)
    expect(hits.length).toBeGreaterThan(5)
    expect(hits.length).toBeLessThan(55)
    for (const hit of hits) {
      expect(eventById(hit!.templateId)).toBeDefined()
    }
  })
})

describe('resolução de evento', () => {
  test('opção segura sempre dá certo', () => {
    const event = LIFE_EVENTS[0]
    const result = resolveLifeEvent(event.id, 0, 999)
    expect(result.success).toBe(true)
    expect(result.moraleDelta).toBe(event.options[0].moraleWin)
    expect(result.note).toBe(event.options[0].textWin)
  })

  test('é determinística para a mesma seed', () => {
    const a = resolveLifeEvent(LIFE_EVENTS[1].id, 2, 4242)
    const b = resolveLifeEvent(LIFE_EVENTS[1].id, 2, 4242)
    expect(a).toEqual(b)
  })

  test('fracasso aplica moral negativa e o texto de derrota', () => {
    const event = LIFE_EVENTS[0]
    const results = Array.from({ length: 80 }, (_, i) => resolveLifeEvent(event.id, 2, i * 31))
    const failures = results.filter((result) => !result.success)
    expect(failures.length).toBeGreaterThan(0)
    for (const failure of failures) {
      expect(failure.moraleDelta).toBeLessThan(0)
      expect(failure.note).toBe(event.options[2].textLose)
    }
  })

  test('índice inválido cai na opção segura', () => {
    const result = resolveLifeEvent(LIFE_EVENTS[0].id, 9, 1)
    expect(result.success).toBe(true)
  })
})

describe('moral', () => {
  test('deriva em direção ao neutro e reage a vitória/derrota', () => {
    expect(driftMorale(90, false, false)).toBeLessThan(90)
    expect(driftMorale(10, false, false)).toBeGreaterThan(10)
    expect(driftMorale(50, true, false)).toBeGreaterThan(50)
    expect(driftMorale(50, false, true)).toBeLessThan(50)
  })

  test('fica sempre entre 0 e 100', () => {
    expect(driftMorale(99, true, false)).toBeLessThanOrEqual(100)
    expect(driftMorale(1, false, true)).toBeGreaterThanOrEqual(0)
  })

  test('bônus de nota inicial acompanha a moral', () => {
    expect(moraleRatingBonus(DEFAULT_MORALE)).toBe(0)
    expect(moraleRatingBonus(100)).toBeCloseTo(0.8)
    expect(moraleRatingBonus(0)).toBeCloseTo(-0.8)
    expect(moraleRatingBonus(75)).toBeCloseTo(0.4)
  })
})
