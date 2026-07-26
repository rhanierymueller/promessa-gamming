import { describe, expect, test } from 'vitest'
import { clubById } from '../../data/clubs'
import { FORMATIONS } from './formation'
import { lineupRating, overallAt, squadPlayersFor } from './players'
import { bestLineup } from './bestLineup'

const CLUB = clubById('leoes-capital')!
const F = FORMATIONS['4-3-3']

describe('escalação que a IA monta', () => {
  const squad = squadPlayersFor(CLUB, 5)
  const lineup = bestLineup(squad, F)

  test('escala 11 jogadores, sem repetir ninguém', () => {
    expect(lineup).toHaveLength(11)
    expect(new Set(lineup).size).toBe(11)
    for (const index of lineup) expect(index).toBeGreaterThanOrEqual(0)
  })

  test('é MELHOR que pegar os 11 primeiros do elenco — era o bug', () => {
    // craque sobrando no banco enquanto um reserva pior era titular
    const ingenua = squad.slice(0, 11).map((_, i) => i)
    expect(lineupRating(lineup.map((i) => squad[i]), F.slots))
      .toBeGreaterThanOrEqual(lineupRating(ingenua.map((i) => squad[i]), F.slots))
  })

  test('nenhum reserva rende mais que o titular da vaga', () => {
    // é exatamente o que se via na tela: 83 no banco, 76 em campo
    const banco = squad.map((_, i) => i).filter((i) => !lineup.includes(i))
    const trocasQueMelhoram: string[] = []
    for (const reserva of banco) {
      lineup.forEach((titular, slot) => {
        const vaga = F.slots[slot]
        if (overallAt(squad[reserva], vaga) > overallAt(squad[titular], vaga)) {
          trocasQueMelhoram.push(`${squad[reserva].name} > ${squad[titular].name} (${vaga})`)
        }
      })
    }
    expect(trocasQueMelhoram).toEqual([])
  })

  test('é determinístico', () => {
    expect(bestLineup(squad, F)).toEqual(bestLineup(squad, F))
  })

  test('acompanha o esquema: 3-5-2 escala outra gente', () => {
    expect(bestLineup(squad, FORMATIONS['3-5-2'])).not.toEqual(lineup)
  })
})

