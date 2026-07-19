import { CLUBS, clubById } from '../../data/clubs'
import { nextFloat, type RngResult, type RngState } from '../rng'

/**
 * Pirâmide de 4 divisões × 14 clubes. Fim de temporada: os 4 primeiros SOBEM
 * (exceto Série A) e os 4 últimos CAEM (exceto Série D). A divisão do jogador
 * usa a tabela REAL da temporada; as outras são simuladas por força + sorte.
 */

export const DIVISION_COUNT = 4
export const DIVISION_TEAMS = 14
export const PROMOTED_COUNT = 4
export const RELEGATED_COUNT = 4

export const DIVISION_NAMES = ['Série A', 'Série B', 'Série C', 'Série D'] as const

export type Divisions = readonly (readonly string[])[]

/** Layout inicial da pirâmide, a partir da divisão de origem de cada clube. */
export const initialDivisions = (): Divisions =>
  [0, 1, 2, 3].map((division) =>
    CLUBS.filter((club) => club.division === division).map((club) => club.id),
  )

export const divisionOf = (divisions: Divisions, clubId: string): number =>
  divisions.findIndex((division) => division.includes(clubId))

/** Classificação simulada de uma divisão: força pesa, a sorte decide o resto. */
export const simulateDivisionOrder = (
  clubIds: readonly string[],
  rng: RngState,
): RngResult<readonly string[]> => {
  let current = rng
  const scored = clubIds.map((id) => {
    const roll = nextFloat(current)
    current = roll.next
    const strength = clubById(id)?.strength ?? 1
    return { id, score: strength * 2 + roll.value * 5 }
  })
  return {
    value: scored.sort((a, b) => b.score - a.score).map((entry) => entry.id),
    next: current,
  }
}

export interface PyramidShift {
  readonly divisions: Divisions
  /** Movimento do clube observado: subiu, caiu ou permaneceu. */
  readonly movement: 'up' | 'down' | 'stay'
}

/**
 * Aplica acesso e rebaixamento. `playerDivision` usa `playerOrder` (tabela
 * real); as demais divisões são simuladas com o rng.
 */
export const applyPromotionRelegation = (
  divisions: Divisions,
  playerDivision: number,
  playerOrder: readonly string[],
  playerClubId: string,
  rng: RngState,
): RngResult<PyramidShift> => {
  let current = rng
  const orders: (readonly string[])[] = []
  for (let division = 0; division < divisions.length; division++) {
    if (division === playerDivision) {
      orders.push(playerOrder)
    } else {
      const simulated = simulateDivisionOrder(divisions[division], current)
      orders.push(simulated.value)
      current = simulated.next
    }
  }

  const next: string[][] = orders.map((order) => [...order])
  // de baixo pra cima: os 4 últimos de d trocam com os 4 primeiros de d+1
  for (let division = 0; division < divisions.length - 1; division++) {
    const relegated = next[division].splice(DIVISION_TEAMS - RELEGATED_COUNT, RELEGATED_COUNT)
    const promoted = next[division + 1].splice(0, PROMOTED_COUNT)
    next[division].push(...promoted)
    next[division + 1].unshift(...relegated)
  }

  const before = playerDivision
  const after = divisionOf(next, playerClubId)
  const movement = after < before ? 'up' : after > before ? 'down' : 'stay'
  return { value: { divisions: next, movement }, next: current }
}
