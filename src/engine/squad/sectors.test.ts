import { describe, expect, test } from 'vitest'
import { FORMATIONS } from './formation'
import { squadPlayersFor } from './players'
import { clubById } from '../../data/clubs'
import { sectorAt, sectorRatings } from './sectors'

const CLUB = clubById('leoes-capital')!
const squad = squadPlayersFor(CLUB, 1)

describe('overall por setor', () => {
  const contaPor = (id: '4-3-3' | '4-4-2' | '3-5-2') => {
    const f = FORMATIONS[id]
    const setores = f.layout.map((v) => sectorAt(v.x))
    return {
      def: setores.filter((s) => s === 'def').length,
      mei: setores.filter((s) => s === 'mei').length,
      ata: setores.filter((s) => s === 'ata').length,
    }
  }

  test('o setor vem da posição no campo: goleiro e zaga na defesa', () => {
    expect(sectorAt(0.05)).toBe('def')
    expect(sectorAt(0.15)).toBe('def')
    expect(sectorAt(0.3)).toBe('mei')
    expect(sectorAt(0.45)).toBe('ata')
  })

  test('4-3-3 dá 5 na defesa, 3 no meio e 3 no ataque', () => {
    expect(contaPor('4-3-3')).toEqual({ def: 5, mei: 3, ata: 3 })
  })

  test('4-4-2 dá 5, 4 e 2', () => {
    expect(contaPor('4-4-2')).toEqual({ def: 5, mei: 4, ata: 2 })
  })

  test('cada setor sai na faixa de overall, não zerado', () => {
    const r = sectorRatings(squad, FORMATIONS['4-3-3'])
    for (const valor of [r.def, r.mei, r.ata]) {
      expect(valor).toBeGreaterThan(30)
      expect(valor).toBeLessThanOrEqual(99)
    }
  })

  test('3-5-2: os ALAS contam no meio, não na defesa', () => {
    // eles aparecem como LD/LE, mas jogam adiantados no desenho — contá-los
    // atrás daria uma linha de cinco onde o esquema mostra três zagueiros
    expect(contaPor('3-5-2')).toEqual({ def: 4, mei: 5, ata: 2 })
  })

  test('reforçar o ataque sobe SÓ o ataque', () => {
    // Arrange: troca os atacantes por craques
    const f = FORMATIONS['4-3-3']
    const antes = sectorRatings(squad, f)
    const turbinado = squad.map((p, i) =>
      i < f.layout.length && sectorAt(f.layout[i].x) === 'ata'
        ? { ...p, attrs: { pac: 95, fin: 95, pas: 95, dri: 95, def: 95, fis: 95 } }
        : p,
    )

    // Act
    const depois = sectorRatings(turbinado, f)

    // Assert
    expect(depois.ata).toBeGreaterThan(antes.ata)
    expect(depois.def).toBe(antes.def)
    expect(depois.mei).toBe(antes.mei)
  })

  test('vaga vazia não derruba o setor para zero', () => {
    const r = sectorRatings([], FORMATIONS['4-3-3'])
    expect(r.def).toBeGreaterThan(0)
    expect(r.mei).toBeGreaterThan(0)
    expect(r.ata).toBeGreaterThan(0)
  })
})
