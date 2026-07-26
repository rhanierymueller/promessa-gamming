import type { Formation } from './formation'
import { overallAt, type SquadPlayer } from './players'

/**
 * Overall por SETOR do time: defesa, meio e ataque.
 *
 * O overall único escondia a cara do time — 65 de um time que segura tudo e
 * não faz gol é bem diferente de 65 de um time que troca gols.
 *
 * O setor vem de ONDE a vaga fica no campo, não do rótulo da posição. É o que
 * faz a conta acompanhar o esquema: no 3-5-2 os alas aparecem como LD/LE mas
 * jogam adiantados, e contá-los como defesa daria uma linha de cinco onde o
 * desenho mostra três zagueiros e um meio de cinco.
 */

export type Sector = 'def' | 'mei' | 'ata'

/** Fronteiras no eixo do campo (0 = própria meta, 1 = gol adversário). */
const DEF_UNTIL = 0.2
const MEI_UNTIL = 0.4

/** O setor de uma vaga, pela posição dela no desenho tático. */
export const sectorAt = (x: number): Sector =>
  x < DEF_UNTIL ? 'def' : x < MEI_UNTIL ? 'mei' : 'ata'

export interface SectorRatings {
  readonly def: number
  readonly mei: number
  readonly ata: number
}

/** Usado quando a formação não tem nenhuma vaga do setor (raro, mas possível). */
const EMPTY_SECTOR = 50

export const sectorRatings = (
  players: readonly (SquadPlayer | undefined)[],
  formation: Formation,
): SectorRatings => {
  const soma: Record<Sector, number> = { def: 0, mei: 0, ata: 0 }
  const contagem: Record<Sector, number> = { def: 0, mei: 0, ata: 0 }

  formation.slots.forEach((slot, index) => {
    const sector = sectorAt(formation.layout[index]?.x ?? 0.5)
    const player = players[index]
    soma[sector] += player ? overallAt(player, slot) : EMPTY_SECTOR
    contagem[sector] += 1
  })

  const media = (sector: Sector): number =>
    contagem[sector] === 0 ? EMPTY_SECTOR : Math.round(soma[sector] / contagem[sector])

  return { def: media('def'), mei: media('mei'), ata: media('ata') }
}
