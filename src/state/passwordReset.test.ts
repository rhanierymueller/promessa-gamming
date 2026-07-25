import { describe, expect, test } from 'vitest'
import { MIN_PASSWORD } from './registration'
import {
  RESET_COOLDOWN_MS,
  markResetRequested,
  resetCooldownRemaining,
  validateNewPassword,
  type CooldownStorage,
} from './passwordReset'

const memoryStorage = (): CooldownStorage => {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }
}

describe('validateNewPassword', () => {
  test('aceita senha válida com confirmação igual', () => {
    // Arrange
    const password = 'segredo-forte-123'

    // Act
    const result = validateNewPassword(password, password)

    // Assert
    expect(result).toEqual({})
  })

  test('reprova senha mais curta que o mínimo', () => {
    const short = 'a'.repeat(MIN_PASSWORD - 1)
    const result = validateNewPassword(short, short)
    expect(result.password).toBeTruthy()
  })

  test('aceita senha exatamente no tamanho mínimo', () => {
    const exact = 'a'.repeat(MIN_PASSWORD)
    expect(validateNewPassword(exact, exact)).toEqual({})
  })

  test('reprova confirmação diferente', () => {
    const result = validateNewPassword('segredo-forte-123', 'segredo-forte-456')
    expect(result.confirmPassword).toBeTruthy()
  })

  test('senha vazia reprova nos dois campos independentes', () => {
    const result = validateNewPassword('', 'algo-diferente')
    expect(result.password).toBeTruthy()
    expect(result.confirmPassword).toBeTruthy()
  })
})

describe('cooldown de pedido de link (anti-spam)', () => {
  test('sem pedido anterior não há espera', () => {
    // Arrange
    const storage = memoryStorage()

    // Act + Assert
    expect(resetCooldownRemaining(storage, 1_000_000)).toBe(0)
  })

  test('logo após pedir, a espera é o cooldown inteiro', () => {
    // Arrange
    const storage = memoryStorage()
    const now = 1_000_000

    // Act
    markResetRequested(storage, now)

    // Assert
    expect(resetCooldownRemaining(storage, now)).toBe(RESET_COOLDOWN_MS)
  })

  test('a espera diminui com o tempo e zera ao fim', () => {
    const storage = memoryStorage()
    const now = 1_000_000
    markResetRequested(storage, now)

    expect(resetCooldownRemaining(storage, now + RESET_COOLDOWN_MS / 2)).toBe(RESET_COOLDOWN_MS / 2)
    expect(resetCooldownRemaining(storage, now + RESET_COOLDOWN_MS)).toBe(0)
    expect(resetCooldownRemaining(storage, now + RESET_COOLDOWN_MS * 2)).toBe(0)
  })

  test('valor corrompido no storage não trava (zera a espera)', () => {
    const storage = memoryStorage()
    storage.setItem('promessa.reset-request', 'não-é-número')
    expect(resetCooldownRemaining(storage, 1_000_000)).toBe(0)
  })

  test('relógio voltado para trás (timestamp futuro) não bloqueia para sempre', () => {
    // Arrange: pedido marcado num "futuro" distante (clock skew / adulteração)
    const storage = memoryStorage()
    markResetRequested(storage, 5_000_000)

    // Act + Assert: nunca espera mais que o cooldown máximo
    expect(resetCooldownRemaining(storage, 1_000_000)).toBeLessThanOrEqual(RESET_COOLDOWN_MS)
  })
})
