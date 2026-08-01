import { describe, expect, it, test } from 'vitest'
import { CLUBS } from '../data/clubs'
import { CONTINENTAL_CLUBS } from '../data/continentalClubs'
import {
  crestIdentityFor,
  hasNamedCrestIdentity,
} from './clubCrestIdentity'

describe('identidade visual dos clubes', () => {
  it('dá direção de arte explícita aos 56 clubes da liga', () => {
    expect(CLUBS).toHaveLength(56)
    for (const club of CLUBS) {
      expect(hasNamedCrestIdentity(club.id), club.name).toBe(true)
    }
  })

  it('não repete a mesma composição completa em dois clubes', () => {
    const signatures = CLUBS.map((club) => {
      const identity = crestIdentityFor(club.id)
      return [
        identity.shield,
        identity.pattern,
        identity.emblem,
        identity.plate,
      ].join(':')
    })

    expect(new Set(signatures).size).toBe(CLUBS.length)
  })

  it('liga símbolos importantes ao nome ou apelido do clube', () => {
    expect(crestIdentityFor('leoes-capital').emblem).toBe('lion')
    expect(crestIdentityFor('imperial').emblem).toBe('crown')
    expect(crestIdentityFor('ferroviario-minas').emblem).toBe('rail')
    expect(crestIdentityFor('farol-salvador').emblem).toBe('lighthouse')
    expect(crestIdentityFor('mandacaru').emblem).toBe('cactus')
    expect(crestIdentityFor('cafeeira').emblem).toBe('coffee')
    expect(crestIdentityFor('velho-chico').emblem).toBe('fish')
  })

  it('mantém fallback determinístico para clubes futuros', () => {
    expect(crestIdentityFor('clube-do-futuro')).toEqual(
      crestIdentityFor('clube-do-futuro'),
    )
    expect(hasNamedCrestIdentity('clube-do-futuro')).toBe(false)
  })
})

describe('identidade de escudo dos clubes continentais', () => {
  test('todo clube sul-americano tem identidade declarada, sem cair no fallback', () => {
    for (const club of CONTINENTAL_CLUBS) {
      expect(hasNamedCrestIdentity(club.id)).toBe(true)
    }
  })

  test('os oito emblemas novos são usados por algum clube', () => {
    const usados = new Set(CONTINENTAL_CLUBS.map((club) => crestIdentityFor(club.id).emblem))
    for (const emblem of ['condor', 'jaguar', 'volcano', 'harp', 'llama', 'orchid', 'maize', 'cordillera']) {
      expect(usados.has(emblem as never)).toBe(true)
    }
  })
})
