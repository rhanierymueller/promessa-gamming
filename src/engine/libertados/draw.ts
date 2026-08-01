import { clubById } from '../../data/clubs'
import { CONTINENTAL_CLUBS, continentalClubById } from '../../data/continentalClubs'
import { nextFloat, type RngResult, type RngState } from '../rng'
import { GROUP_COUNT, GROUP_SIZE, POT_COUNT } from './types'

/**
 * Sorteio da Libertados: quatro potes por força e um clube de cada pote por
 * grupo, recusando quem repetiria país no grupo. Determinístico pela seed.
 */

/** País do clube. Quem não está no catálogo continental é da pirâmide. */
export const nationOf = (clubId: string): string =>
  continentalClubById(clubId)?.nationId ?? 'brasil'

const strengthOf = (clubId: string): number => clubById(clubId)?.strength ?? 3

/** Tira `count` clubes do catálogo continental, sem repetir. */
export const pickContinentalClubs = (
  count: number,
  rng: RngState,
): RngResult<readonly string[]> => {
  const pool = CONTINENTAL_CLUBS.map((club) => club.id)
  const drawn: string[] = []
  let current = rng
  while (drawn.length < count && pool.length > 0) {
    const roll = nextFloat(current)
    current = roll.next
    drawn.push(pool.splice(Math.floor(roll.value * pool.length) % pool.length, 1)[0])
  }
  return { value: drawn, next: current }
}

/**
 * Quatro potes de oito: ordena os 32 por força e fatia. O desempate é o id,
 * para o pote não depender da ordem em que os clubes chegaram.
 */
export const buildPots = (clubIds: readonly string[]): readonly (readonly string[])[] => {
  const ranked = [...clubIds].sort((a, b) => {
    const diff = strengthOf(b) - strengthOf(a)
    return diff !== 0 ? diff : a.localeCompare(b)
  })
  const size = ranked.length / POT_COUNT
  return Array.from({ length: POT_COUNT }, (_, pot) =>
    ranked.slice(pot * size, (pot + 1) * size),
  )
}

/** Embaralho determinístico (Fisher-Yates com o RNG do jogo). */
const shuffle = (items: readonly string[], rng: RngState): RngResult<readonly string[]> => {
  const shuffled = [...items]
  let current = rng
  for (let index = shuffled.length - 1; index > 0; index--) {
    const roll = nextFloat(current)
    current = roll.next
    const swap = Math.floor(roll.value * (index + 1)) % (index + 1)
    const held = shuffled[index]
    shuffled[index] = shuffled[swap]
    shuffled[swap] = held
  }
  return { value: shuffled, next: current }
}

/**
 * Distribui os clubes de UM pote entre os grupos que ainda esperam por ele —
 * um clube por grupo, sem repetir país.
 *
 * Precisa voltar atrás quando um grupo fica sem candidato válido. Sem isso, o
 * último grupo a ser preenchido herda o que sobrou do pote e não tem escolha:
 * numa varredura de 300 seeds, 87% dos grupos com país repetido eram o último
 * da fila, que chegou a juntar três paraguaios.
 *
 * Devolve null quando nem com retrocesso existe distribuição válida.
 */
const assignPot = (
  clubs: readonly string[],
  nationsByGroup: readonly (readonly string[])[],
  slot = 0,
  used: readonly number[] = [],
): readonly string[] | null => {
  if (slot === nationsByGroup.length) return []
  for (let index = 0; index < clubs.length; index++) {
    if (used.includes(index)) continue
    if (nationsByGroup[slot].includes(nationOf(clubs[index]))) continue
    const rest = assignPot(clubs, nationsByGroup, slot + 1, [...used, index])
    if (rest) return [clubs[index], ...rest]
  }
  return null
}

/**
 * Monta os grupos tirando um clube de cada pote, na ordem sorteada e sem dois
 * clubes do mesmo país no mesmo grupo. Sem distribuição possível, o pote entra
 * na ordem embaralhada mesmo — o sorteio nunca trava.
 */
export const drawGroups = (
  clubIds: readonly string[],
  playerClubId: string | null,
  rng: RngState,
): RngResult<readonly (readonly string[])[]> => {
  const pots = buildPots(clubIds).map((pot) => [...pot])
  const groups: string[][] = Array.from({ length: GROUP_COUNT }, () => [])
  let current = rng

  // o clube do jogador abre o grupo A, saindo do pote dele
  if (playerClubId) {
    const potIndex = pots.findIndex((pot) => pot.includes(playerClubId))
    if (potIndex >= 0) {
      pots[potIndex].splice(pots[potIndex].indexOf(playerClubId), 1)
      groups[0].push(playerClubId)
    }
  }

  for (let potIndex = 0; potIndex < POT_COUNT; potIndex++) {
    // o grupo do jogador já recebeu o clube dele neste pote
    const pending = groups
      .map((_, index) => index)
      .filter((index) => groups[index].length === potIndex)
    const shuffled = shuffle(pots[potIndex], current)
    current = shuffled.next
    const nationsByGroup = pending.map((index) => groups[index].map(nationOf))
    const assigned =
      assignPot(shuffled.value, nationsByGroup) ?? shuffled.value.slice(0, pending.length)
    pending.forEach((groupIndex, slot) => groups[groupIndex].push(assigned[slot]))
  }

  return { value: groups.map((group) => group.slice(0, GROUP_SIZE)), next: current }
}
