import { bestLineup } from './bestLineup'
import type { Formation } from './formation'
import { lineupRating, type SquadPlayer } from './players'
import { sectorRatings, type SectorRatings } from './sectors'

/** Indicadores coletivos calculados exclusivamente pelos titulares. */
export interface LineupStrength {
  readonly overall: number
  readonly sectors: SectorRatings
}

/**
 * Força do time que vai a campo.
 *
 * `lineup` contém índices do elenco; somente os slots existentes na formação
 * são lidos. Reservas, mesmo que tenham overall maior, não entram na conta até
 * serem efetivamente escalados.
 */
export const lineupStrength = (
  squad: readonly SquadPlayer[],
  lineup: readonly number[],
  formation: Formation,
): LineupStrength => {
  const starters = formation.slots.map((_, slot) => squad[lineup[slot]])
  return {
    overall: lineupRating(starters, formation.slots),
    sectors: sectorRatings(starters, formation),
  }
}

/** Força dos titulares escolhidos automaticamente pelo técnico da IA. */
export const bestLineupStrength = (
  squad: readonly SquadPlayer[],
  formation: Formation,
): LineupStrength => lineupStrength(squad, bestLineup(squad, formation), formation)
