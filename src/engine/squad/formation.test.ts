import { describe, expect, test } from 'vitest'
import { FORMATION_IDS, FORMATIONS, userSlotIndex } from './formation'

describe('FORMATIONS', () => {
  test('todas têm 11 posições, goleiro único no slot 0 e layout dentro do campo', () => {
    for (const id of FORMATION_IDS) {
      const formation = FORMATIONS[id]
      expect(formation.slots).toHaveLength(11)
      expect(formation.layout).toHaveLength(11)
      expect(formation.slots[0]).toBe('GOL')
      expect(formation.slots.filter((slot) => slot === 'GOL')).toHaveLength(1)
      for (const point of formation.layout) {
        expect(point.x).toBeGreaterThan(0)
        expect(point.x).toBeLessThan(0.5)
        expect(point.y).toBeGreaterThan(0)
        expect(point.y).toBeLessThan(1)
      }
    }
  })

  test('os nomes batem com o desenho tático', () => {
    expect(FORMATIONS['4-3-3'].slots.filter((s) => s === 'ZAG')).toHaveLength(2)
    expect(FORMATIONS['4-4-2'].slots.filter((s) => s === 'ATA')).toHaveLength(2)
    expect(FORMATIONS['3-5-2'].slots.filter((s) => s === 'ZAG')).toHaveLength(3)
  })
})

describe('userSlotIndex', () => {
  test('posição exata ganha o slot exato', () => {
    expect(FORMATIONS['4-3-3'].slots[userSlotIndex('4-3-3', 'ATA')]).toBe('ATA')
    expect(FORMATIONS['4-3-3'].slots[userSlotIndex('4-3-3', 'VOL')]).toBe('VOL')
    expect(FORMATIONS['3-5-2'].slots[userSlotIndex('3-5-2', 'LD')]).toBe('LD')
  })

  test('sem slot exato, cai no mesmo setor do campo', () => {
    // 4-4-2 não tem ponta: o PON joga como atacante
    const slot = userSlotIndex('4-4-2', 'PON')
    expect(FORMATIONS['4-4-2'].slots[slot]).toBe('ATA')
  })

  test('nunca escala o usuário no gol', () => {
    for (const id of FORMATION_IDS) {
      for (const position of ['LD', 'ZAG', 'LE', 'VOL', 'MEI', 'PON', 'ATA'] as const) {
        expect(userSlotIndex(id, position)).toBeGreaterThan(0)
      }
    }
  })
})
