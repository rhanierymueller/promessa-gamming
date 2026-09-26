import { nextFloat, type RngResult, type RngState } from '../rng'
import type { Distribuicao } from './outcomes'

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

/**
 * Chance de a jogada TERMINAR em gol do seu time — seu ou do companheiro.
 *
 * É o número que a tela mostra. Ele não pode ser `gol + chance`: a chance
 * criada só vira gol depois da rolagem do elenco, e somar as duas colunas
 * anunciaria "cavar a falta" com 36% de gol quando o dado entrega ~16%. A
 * tela e o sorteio têm que concordar, então a conversão entra aqui pela MESMA
 * função que `rolarAssistencia` consome.
 */
export const chanceDeTerminarEmGol = (dist: Distribuicao, edgeAtaque: number): number =>
  dist.gol + dist.chance * chanceDeConverter(edgeAtaque)

export const rolarAssistencia = (
  edgeAtaque: number,
  rng: RngState,
): RngResult<boolean> => {
  const roll = nextFloat(rng)
  return { value: roll.value < chanceDeConverter(edgeAtaque), next: roll.next }
}
