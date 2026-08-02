import { CLUBS } from '../../data/clubs'
import type { Divisions } from '../pyramid/pyramid'
import { divisionOf } from '../pyramid/pyramid'
import { nextFloat, type RngResult, type RngState } from '../rng'
import { COPA_BRASIL_TEAMS } from './types'

/**
 * Sorteio da Copa do Brasil: 32 clubes tirados da pirâmide inteira.
 *
 * A distribuição é o que dá o sabor da competição — a Série A domina, mas
 * sempre sobra vaga para quem está embaixo. É por isso que a Série D entra:
 * uma vaga só, mas ela existe, e o time pequeno pode cair no seu caminho.
 */

/** Fatia de cada divisão nas 32 vagas (0=A … 3=D). */
export const DIVISION_SHARE: readonly number[] = [0.6, 0.3, 0.07, 0.04]

/** Quantas vagas cada divisão recebe — o arredondamento sobra para a Série A. */
export const spotsPerDivision = (total = COPA_BRASIL_TEAMS): readonly number[] => {
  const raw = DIVISION_SHARE.map((share) => Math.round(share * total))
  const assigned = raw.slice(1).reduce((sum, value) => sum + value, 0)
  // a Série A absorve a diferença: com 60/30/7/4 a soma bruta não fecha em 32
  return [Math.max(0, total - assigned), ...raw.slice(1)]
}

/** Embaralha uma lista de forma determinística (Fisher-Yates com o rng do jogo). */
const shuffle = (items: readonly string[], rng: RngState): RngResult<string[]> => {
  const pool = [...items]
  let state = rng
  for (let i = pool.length - 1; i > 0; i--) {
    const roll = nextFloat(state)
    state = roll.next
    const j = Math.floor(roll.value * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return { value: pool, next: state }
}

/**
 * Os 32 participantes, na ordem da chave (0 enfrenta 1, 2 enfrenta 3…).
 *
 * O clube do jogador entra SEMPRE, sem gastar vaga da divisão dele: a Copa é o
 * torneio em que o protagonista está garantido, seja qual for a série que
 * disputa. Se faltar clube numa divisão pequena, a Série A completa — a chave
 * precisa fechar em 32 de qualquer jeito.
 */
export const drawCopaBrasil = (
  divisions: Divisions,
  rng: RngState,
  /** Entra na chave mesmo que o sorteio não o tirasse. */
  guaranteedClubId: string | null = null,
): RngResult<readonly string[]> => {
  const spots = spotsPerDivision()
  const chosen: string[] = []
  let state = rng

  if (guaranteedClubId) chosen.push(guaranteedClubId)

  for (let division = 0; division < spots.length; division++) {
    const pool = CLUBS.map((club) => club.id).filter(
      (id) => divisionOf(divisions, id) === division && !chosen.includes(id),
    )
    const shuffled = shuffle(pool, state)
    state = shuffled.next
    // o clube garantido já ocupa uma vaga da própria divisão
    const alreadyIn = guaranteedClubId && divisionOf(divisions, guaranteedClubId) === division ? 1 : 0
    chosen.push(...shuffled.value.slice(0, Math.max(0, spots[division] - alreadyIn)))
  }

  // divisão pequena demais para a cota: quem sobra vem de onde houver clube
  if (chosen.length < COPA_BRASIL_TEAMS) {
    const rest = CLUBS.map((club) => club.id).filter((id) => !chosen.includes(id))
    const shuffled = shuffle(rest, state)
    state = shuffled.next
    chosen.push(...shuffled.value.slice(0, COPA_BRASIL_TEAMS - chosen.length))
  }

  // a ordem do sorteio decide os confrontos: embaralhar de novo evita que o
  // clube garantido caia sempre na mesma ponta da chave
  const bracket = shuffle(chosen.slice(0, COPA_BRASIL_TEAMS), state)
  return { value: bracket.value, next: bracket.next }
}
