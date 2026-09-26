import { nextFloat, type RngResult, type RngState } from '../rng'
import { rolarAssistencia } from './assist'
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

export interface Lance {
  readonly resolucao: Resolucao
  /** Só faz sentido no desfecho `chance`: o time converteu? Fora dele é sempre false. */
  readonly assistConvertida: boolean
}

/**
 * O lance inteiro: sorteia o desfecho e, se você criou, rola a finalização do
 * time. É o ÚNICO caminho que resolve uma decisão — a tela e o "Simular até o
 * fim" chamam esta função. Antes cada um encadeava `resolverDecisao` com
 * `rolarAssistencia` por conta própria, e dois caminhos que precisam concordar
 * são um convite para divergirem.
 */
export const jogarDecisao = (
  jogada: Jogada,
  mod: Modificadores,
  rng: RngState,
): RngResult<Lance> => {
  const passo = resolverDecisao(jogada, mod, rng)
  if (passo.value.desfecho !== 'chance') {
    return { value: { resolucao: passo.value, assistConvertida: false }, next: passo.next }
  }
  // você criou; agora é o ataque do time contra a defesa deles
  const assist = rolarAssistencia(mod.edgeAtaque, passo.next)
  return { value: { resolucao: passo.value, assistConvertida: assist.value }, next: assist.next }
}

/** O desfecho mexeu no placar? Para quem? */
export const ladoDoGol = (desfecho: Desfecho): 'team' | 'opponent' | null => {
  if (desfecho === 'gol') return 'team'
  if (desfecho === 'contra') return 'opponent'
  return null
}
