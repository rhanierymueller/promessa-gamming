import { describe, expect, test } from 'vitest'
import { FORMATIONS } from './formation'
import type { SquadPlayer, SquadPosition } from './players'
import { bestLineupStrength, lineupStrength } from './teamStrength'

const player = (id: string, overall: number, position: SquadPosition): SquadPlayer => ({
  id,
  name: id,
  position,
  altPositions: [],
  age: 25,
  potential: 'medio',
  peakAge: 27,
  shirt: Number(id.replace(/\D/g, '')) + 1,
  attrs: {
    pac: overall,
    fin: overall,
    pas: overall,
    dri: overall,
    def: overall,
    fis: overall,
  },
  overall,
})

describe('força coletiva usa somente os titulares', () => {
  const formation = FORMATIONS['4-3-3']
  const starters = formation.slots.map((position, index) =>
    player(`titular-${index}`, 60, position),
  )
  const bench = Array.from({ length: 7 }, (_, index) =>
    player(`reserva-${index}`, 90, formation.slots[(10 + index) % formation.slots.length]),
  )
  const squad = [...starters, ...bench]
  const lineup = Array.from({ length: 11 }, (_, index) => index)

  test('reservas fortes não inflam o overall geral nem os setores', () => {
    const strength = lineupStrength(squad, lineup, formation)

    expect(strength.overall).toBe(60)
    expect(strength.sectors).toEqual({ def: 60, mei: 60, ata: 60 })
  })

  test('um reserva só passa a contar quando entra na escalação', () => {
    const before = lineupStrength(squad, lineup, formation)
    const after = lineupStrength(squad, [...lineup.slice(0, 10), 11], formation)

    expect(after.overall).toBeGreaterThan(before.overall)
    expect(after.sectors.ata).toBeGreaterThan(before.sectors.ata)
    expect(after.sectors.def).toBe(before.sectors.def)
    expect(after.sectors.mei).toBe(before.sectors.mei)
  })

  test('o técnico da IA calcula a força depois de escolher seus titulares', () => {
    expect(bestLineupStrength(squad, formation).overall).toBeGreaterThan(
      lineupStrength(squad, lineup, formation).overall,
    )
  })
})
