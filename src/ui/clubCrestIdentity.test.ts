import { describe, expect, it } from 'vitest'
import { CLUBS } from '../data/clubs'
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
