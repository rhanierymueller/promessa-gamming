import { describe, expect, test } from 'vitest'
import {
  DATA_INVENTORY,
  isConsentCurrent,
  parseConsent,
  recordConsent,
  TERMS_VERSION,
} from './consent'

describe('aceite dos termos', () => {
  test('quem aceitou a versão atual está em dia', () => {
    expect(isConsentCurrent(recordConsent(1_700_000_000_000))).toBe(true)
  })

  test('quem nunca aceitou NÃO está em dia', () => {
    expect(isConsentCurrent(null)).toBe(false)
  })

  test('aceite de versão ANTIGA não vale — o texto mudou', () => {
    // a lei pede consentimento informado: aceitar a v1 não cobre o que a v2
    // passou a coletar
    expect(isConsentCurrent({ version: TERMS_VERSION - 1, acceptedAt: 1 })).toBe(false)
  })

  test('o aceite guarda QUANDO foi dado — é a prova exigida', () => {
    expect(recordConsent(1_700_000_000_000).acceptedAt).toBe(1_700_000_000_000)
  })

  test('registro sem data não vale como prova', () => {
    expect(parseConsent({ version: 1, acceptedAt: 0 })).toBeNull()
    expect(isConsentCurrent({ version: 1, acceptedAt: 0 })).toBe(false)
  })

  test('lixo salvo não vira aceite', () => {
    expect(parseConsent(null)).toBeNull()
    expect(parseConsent('sim')).toBeNull()
    expect(parseConsent({ version: 'x', acceptedAt: 1 })).toBeNull()
  })
})

describe('inventário de dados', () => {
  test('todo item diz O QUE, POR QUE e ONDE fica', () => {
    for (const item of DATA_INVENTORY) {
      expect(item.what.length).toBeGreaterThan(0)
      expect(item.why.length).toBeGreaterThan(0)
      expect(['aparelho', 'servidor']).toContain(item.where)
    }
  })

  test('cobre o que vai para o servidor: conta, ranking e carreira', () => {
    const noServidor = DATA_INVENTORY.filter((i) => i.where === 'servidor').map((i) => i.what)
    expect(noServidor.join(' ')).toMatch(/E-mail/)
    expect(noServidor.join(' ')).toMatch(/carreira/i)
  })
})
