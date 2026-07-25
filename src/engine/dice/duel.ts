import { nextInt, type RngResult, type RngState } from '../rng'

/**
 * Lance decisivo nos DADOS: cada lado rola TRÊS vezes seguidas — como na
 * mesa de verdade, você joga a sua série inteira e depois passa o dado. Quem
 * começa é sorteado. A maior soma leva o gol; empate vai para a morte súbita,
 * um dado de cada, para o lance nunca terminar em nada.
 */

export type DiceSide = 1 | 2 | 3 | 4 | 5 | 6

export const ROLLS_PER_SIDE = 3
export const DIE_SIDES = 6

export type DuelSide = 'player' | 'ai'

export interface DiceDuel {
  /** Quem abre o duelo — sorteado, às vezes você, às vezes o rival. */
  readonly starter: DuelSide
  readonly playerRolls: readonly DiceSide[]
  readonly aiRolls: readonly DiceSide[]
  /** De quem é a vez; 'done' quando já há vencedor. */
  readonly turn: DuelSide | 'done'
  readonly winner: DuelSide | null
  readonly rng: RngState
}

export const createDuel = (rng: RngState): DiceDuel => {
  const draw = nextInt(rng, 0, 1)
  const starter: DuelSide = draw.value === 0 ? 'player' : 'ai'
  return {
    starter,
    playerRolls: [],
    aiRolls: [],
    turn: starter,
    winner: null,
    rng: draw.next,
  }
}

/** Um dado honesto: 1 a 6 com a mesma chance. */
export const rollDie = (rng: RngState): RngResult<DiceSide> => {
  const roll = nextInt(rng, 1, DIE_SIDES)
  return { value: roll.value as DiceSide, next: roll.next }
}

export const totalOf = (rolls: readonly DiceSide[]): number =>
  rolls.reduce((sum, value) => sum + value, 0)

/**
 * Quem joga agora. Alterna a cada rolagem para o duelo ficar disputado lance
 * a lance, em vez de um jogar tudo e só depois o outro.
 */
const rollsOf = (duel: DiceDuel, side: DuelSide): readonly DiceSide[] =>
  side === 'player' ? duel.playerRolls : duel.aiRolls

const other = (side: DuelSide): DuelSide => (side === 'player' ? 'ai' : 'player')

const nextTurn = (duel: DiceDuel): DuelSide | 'done' => {
  const first = duel.starter
  const second = other(first)
  // série completa de quem abriu, depois a do outro — nada de alternar
  if (rollsOf(duel, first).length < ROLLS_PER_SIDE) return first
  if (rollsOf(duel, second).length < ROLLS_PER_SIDE) return second
  /*
   * Morte súbita: quem tem menos dados joga. Sem esta checagem o duelo
   * acabaria logo após a rolagem extra de um lado, sem o outro responder.
   */
  if (duel.playerRolls.length !== duel.aiRolls.length) {
    return duel.playerRolls.length < duel.aiRolls.length ? 'player' : 'ai'
  }
  return totalOf(duel.playerRolls) !== totalOf(duel.aiRolls) ? 'done' : first
}

const winnerOf = (duel: DiceDuel): DuelSide | null => {
  const mine = totalOf(duel.playerRolls)
  const theirs = totalOf(duel.aiRolls)
  const settled =
    duel.playerRolls.length >= ROLLS_PER_SIDE &&
    duel.aiRolls.length >= ROLLS_PER_SIDE &&
    duel.playerRolls.length === duel.aiRolls.length &&
    mine !== theirs
  if (!settled) return null
  return mine > theirs ? 'player' : 'ai'
}

/** Rola pelo lado da vez e devolve o duelo atualizado com o valor tirado. */
export const rollTurn = (duel: DiceDuel): { readonly duel: DiceDuel; readonly value: DiceSide } => {
  if (duel.turn === 'done') return { duel, value: 1 }
  const { value, next } = rollDie(duel.rng)
  const rolled: DiceDuel = {
    ...duel,
    rng: next,
    playerRolls: duel.turn === 'player' ? [...duel.playerRolls, value] : duel.playerRolls,
    aiRolls: duel.turn === 'ai' ? [...duel.aiRolls, value] : duel.aiRolls,
  }
  const winner = winnerOf(rolled)
  return {
    duel: { ...rolled, winner, turn: winner ? 'done' : nextTurn(rolled) },
    value,
  }
}

/** Quantas rolagens ainda faltam, no mínimo, para o duelo se decidir. */
export const rollsLeft = (duel: DiceDuel): number =>
  Math.max(0, ROLLS_PER_SIDE - duel.playerRolls.length) +
  Math.max(0, ROLLS_PER_SIDE - duel.aiRolls.length)
