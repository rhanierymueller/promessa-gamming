import { nextFloat, type RngResult, type RngState } from '../rng'
import type { Jogada } from './catalog'
import { notaDe } from './nota'
import { DESFECHOS, type Desfecho, type Modificadores } from './outcomes'
import { distribuicao } from './weights'

export interface Resolucao {
  readonly desfecho: Desfecho
  readonly notaDelta: number
}

/**
 * Resolve a jogada num ÚNICO sorteio sobre a cumulativa da distribuição.
 *
 * Um sorteio só, e sobre exatamente a mesma distribuição que a tela mostrou: é
 * o que garante que a porcentagem anunciada ao jogador seja a que o dado usa.
 * Dois sorteios em cascata ("acertou? então rola a consequência") permitiriam a
 * tela mostrar um número e o resultado obedecer a outro.
 */
export const resolverDecisao = (
  jogada: Jogada,
  mod: Modificadores,
  rng: RngState,
): RngResult<Resolucao> => {
  const dist = distribuicao(jogada, mod)
  const roll = nextFloat(rng)

  let acumulado = 0
  for (const desfecho of DESFECHOS) {
    acumulado += dist[desfecho]
    if (roll.value < acumulado) {
      return { value: { desfecho, notaDelta: notaDe(jogada.faixa, desfecho) }, next: roll.next }
    }
  }

  // a cumulativa pode fechar um epsilon abaixo de 1 por ponto flutuante:
  // o último desfecho absorve a sobra em vez de o lance ficar sem resultado
  const ultimo = DESFECHOS[DESFECHOS.length - 1]
  return {
    value: { desfecho: ultimo, notaDelta: notaDe(jogada.faixa, ultimo) },
    next: roll.next,
  }
}

/** O desfecho mexeu no placar? Para quem? */
export const ladoDoGol = (desfecho: Desfecho): 'team' | 'opponent' | null => {
  if (desfecho === 'gol') return 'team'
  if (desfecho === 'contra') return 'opponent'
  return null
}
