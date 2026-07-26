import { describe, expect, test } from 'vitest'
import {
  CAREER_KEYS,
  clearAllLocalData,
  clearCareerData,
  PREFERENCE_KEYS,
} from './localData'

const fakeStorage = () => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v) },
    removeItem: (k: string) => { data.delete(k) },
  }
}

const cheio = () => {
  const s = fakeStorage()
  for (const k of [...CAREER_KEYS, ...PREFERENCE_KEYS]) s.setItem(k, 'x')
  s.setItem('outro-app', 'x')
  return s
}

describe('limpeza dos dados locais', () => {
  test('sair da conta leva o progresso', () => {
    const s = cheio()
    clearCareerData(s)
    for (const k of CAREER_KEYS) expect(s.getItem(k), k).toBeNull()
  })

  test('sair da conta MANTÉM as preferências do aparelho', () => {
    // volume e som são do aparelho: quem sai não quer o som voltando ao padrão
    const s = cheio()
    clearCareerData(s)
    for (const k of PREFERENCE_KEYS) expect(s.getItem(k), k).toBe('x')
  })

  test('excluir a conta não deixa NADA do jogo para trás', () => {
    const s = cheio()
    clearAllLocalData(s)
    for (const k of [...CAREER_KEYS, ...PREFERENCE_KEYS]) expect(s.getItem(k), k).toBeNull()
  })

  test('nunca mexe em chave que não é do jogo', () => {
    const s = cheio()
    clearAllLocalData(s)
    expect(s.getItem('outro-app')).toBe('x')
  })

  test('a lista cobre o save e a partida pendente', () => {
    expect(CAREER_KEYS).toContain('promessa.save')
    expect(CAREER_KEYS).toContain('promessa.pending-match')
  })
})
