import { nextFloat, type RngResult, type RngState } from '../rng'

/**
 * O desfecho `chance`: você criou, o TIME finaliza.
 *
 * É o que dá ao armador um meio de decidir a partida sem chutar — e faz a
 * qualidade do elenco importar na estatística pessoal do jogador. Um passe
 * geral para um ataque ruim morre; o mesmo passe para um ataque bom vira gol
 * e assistência.
 */

const BASE = 0.42
/** Peso do confronto do seu ataque contra a defesa deles (edge −1..1). */
const PESO_ATAQUE = 0.25
/** Nem o pior ataque desperdiça tudo, nem o melhor converte sempre. */
const MIN = 0.22
const MAX = 0.62

export const chanceDeConverter = (edgeAtaque: number): number =>
  Math.min(MAX, Math.max(MIN, BASE + edgeAtaque * PESO_ATAQUE))

export const rolarAssistencia = (
  edgeAtaque: number,
  rng: RngState,
): RngResult<boolean> => {
  const roll = nextFloat(rng)
  return { value: roll.value < chanceDeConverter(edgeAtaque), next: roll.next }
}
