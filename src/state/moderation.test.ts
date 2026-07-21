import { describe, expect, test } from 'vitest'
import { isOffensiveName } from './moderation'

describe('isOffensiveName', () => {
  test('nomes normais de futebol passam', () => {
    for (const name of [
      'Galáticos FC',
      'Estrela do Norte',
      'Zé Craque',
      'craque_10',
      'Timão da Vila',
      'Furacão 2000',
    ]) {
      expect(isOffensiveName(name), name).toBe(false)
    }
  })

  test('efeito Scunthorpe: palavras inocentes que CONTÊM termos curtos passam', () => {
    for (const name of [
      'Curitiba EC',
      'Computador FC',
      'Pacutinga',
      'Vasco da Gama',
      'Disputa Final',
      'Analista FC',
    ]) {
      expect(isOffensiveName(name), name).toBe(false)
    }
  })

  test('palavrões diretos são bloqueados', () => {
    for (const name of ['Merda FC', 'Time Bosta', 'porra united', 'Caralho EC', 'puta fc', 'FC Buceta']) {
      expect(isOffensiveName(name), name).toBe(true)
    }
  })

  test('disfarces não enganam: maiúsculas, acentos, leetspeak e pontos', () => {
    for (const name of ['MÉRDA FC', 'B0STA CITY', 'p.u.t.a', 'c4ralho', 'BuC3tA', 'm-e-r-d-a']) {
      expect(isOffensiveName(name), name).toBe(true)
    }
  })

  test('slurs e ofensas graves são bloqueados mesmo dentro de outras palavras', () => {
    for (const name of ['SuperViado FC', 'osfilhodaputa', 'vagabundaFC']) {
      expect(isOffensiveName(name), name).toBe(true)
    }
  })
})
