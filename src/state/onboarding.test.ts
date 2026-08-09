import { describe, expect, test } from 'vitest'
import { hasSeenOnboarding, markOnboardingSeen } from './onboarding'

const memoryStorage = () => {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    data,
  }
}

describe('marca de onboarding visto', () => {
  test('storage vazio significa primeira vez', () => {
    const storage = memoryStorage()
    expect(hasSeenOnboarding(storage, 'home')).toBe(false)
    expect(hasSeenOnboarding(storage, 'match')).toBe(false)
  })

  test('marcar como visto vale só para a área marcada', () => {
    const storage = memoryStorage()
    markOnboardingSeen(storage, 'home')
    expect(hasSeenOnboarding(storage, 'home')).toBe(true)
    // a partida ainda não foi apresentada
    expect(hasSeenOnboarding(storage, 'match')).toBe(false)
  })

  test('as chaves vivem no espaço do jogo, longe de outras do domínio', () => {
    const storage = memoryStorage()
    markOnboardingSeen(storage, 'match')
    expect([...storage.data.keys()]).toEqual(['promessa.onboarding.match'])
  })
})
