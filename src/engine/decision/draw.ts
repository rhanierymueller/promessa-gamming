import { nextInt, type RngResult, type RngState } from '../rng'
import { CATALOGO, jogadasDaFaixa, massaDeRisco, type Jogada } from './catalog'
import { FAIXAS } from './outcomes'

/** Quantas jogadas o lance oferece. */
export const QUANTAS_OPCOES = 5

const tirarUma = (pool: readonly Jogada[], rng: RngState): RngResult<Jogada> => {
  const escolha = nextInt(rng, 0, pool.length - 1)
  return { value: pool[escolha.value], next: escolha.next }
}

/**
 * Sorteia as jogadas do lance.
 *
 * Não é sorteio uniforme: garante UMA DE CADA FAIXA antes de completar o resto.
 * Sem essa regra, um sorteio pode servir cinco opções conservadoras e o lance
 * deixa de ser uma decisão.
 *
 * A ordem final é por massa de risco, do mais decisivo ao mais conservador — um
 * layout estável que o jogador aprende. Ordenar assim não devolve a "escada de
 * risco" que o design evita: a massa de risco não diz nada sobre a divisão entre
 * gol seu e chance criada, então "cavar a falta" e "recuar pro goleiro" ficam
 * vizinhas sendo escolhas completamente diferentes.
 */
export const sortearJogadas = (rng: RngState): RngResult<readonly Jogada[]> => {
  const escolhidas: Jogada[] = []
  let atual = rng

  for (const faixa of FAIXAS) {
    const sorteio = tirarUma(jogadasDaFaixa(faixa), atual)
    atual = sorteio.next
    escolhidas.push(sorteio.value)
  }

  while (escolhidas.length < QUANTAS_OPCOES) {
    const restante = CATALOGO.filter((jogada) => !escolhidas.includes(jogada))
    const sorteio = tirarUma(restante, atual)
    atual = sorteio.next
    escolhidas.push(sorteio.value)
  }

  return {
    value: [...escolhidas].sort((a, b) => massaDeRisco(b) - massaDeRisco(a)),
    next: atual,
  }
}
