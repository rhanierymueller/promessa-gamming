import type { AttributeKey } from '../career/attributes'
import { DESFECHOS, type Faixa, type Pesos } from './outcomes'

/**
 * Catálogo de jogadas. Cinco são sorteadas por lance.
 *
 * As jogadas NÃO estão numa escada de risco. Se estivessem, a ordenação já
 * entregaria a resposta e a porcentagem na tela viraria enfeite. Cada jogada
 * tem assinatura própria: "cavar a falta" quase nunca vira gol seu mas cria
 * muito e não expõe nada; "caneta no zagueiro" decide dos dois lados.
 *
 * Cada jogada declara o ATRIBUTO que a governa. É o que faz o mesmo menu
 * premiar escolhas diferentes para um matador e para um camisa 10 — o catálogo
 * lê a build do jogador em vez de tratar todo craque igual.
 */

export type JogadaId =
  | 'driblar-zaga'
  | 'caneta-zagueiro'
  | 'voleio-de-fora'
  | 'girar-e-finalizar'
  | 'tabela-e-infiltrar'
  | 'toque-de-primeira'
  | 'lancamento-nas-costas'
  | 'chutar-de-fora'
  | 'cruzamento-rasteiro'
  | 'segunda-trave'
  | 'devolver-capitao'
  | 'segurar-a-bola'
  | 'cavar-a-falta'
  | 'recuar-pro-goleiro'

export interface Jogada {
  readonly id: JogadaId
  /** Quem governa a jogada: é este atributo que desloca a distribuição. */
  readonly atributo: AttributeKey
  readonly faixa: Faixa
  readonly pesos: Pesos
}

const jogada = (
  id: JogadaId,
  atributo: AttributeKey,
  faixa: Faixa,
  gol: number,
  chance: number,
  nada: number,
  perdeu: number,
  contra: number,
): Jogada => ({ id, atributo, faixa, pesos: { gol, chance, nada, perdeu, contra } })

/*
 * Os pesos de CONTRA das faixas média e baixa subiram junto com o piso de risco
 * em weights.ts. Estavam em 1 e 2: normalizados, davam 1% na tela, e uma
 * decisão de 1% de risco não é decisão — a opção segura saía de graça e o perk
 * que corta contra-ataque não tinha o que cortar. A hierarquia continua de pé:
 * ousada arrisca mais que média, que arrisca mais que segura.
 */
export const CATALOGO: readonly Jogada[] = [
  // ── faixa alta: decide a partida, para os dois lados ──────────────────────
  jogada('driblar-zaga', 'finalizacao', 'alta', 22, 15, 20, 25, 18),
  jogada('caneta-zagueiro', 'finalizacao', 'alta', 20, 12, 18, 29, 21),
  jogada('voleio-de-fora', 'finalizacao', 'alta', 16, 6, 40, 24, 14),

  // ── faixa média: o meio do caminho, onde mora a maior parte do jogo ───────
  jogada('girar-e-finalizar', 'finalizacao', 'media', 17, 10, 45, 19, 11),
  jogada('tabela-e-infiltrar', 'passe', 'media', 15, 20, 38, 18, 11),
  jogada('toque-de-primeira', 'passe', 'media', 14, 25, 40, 14, 9),
  jogada('lancamento-nas-costas', 'passe', 'media', 12, 24, 42, 15, 9),
  jogada('cruzamento-rasteiro', 'passe', 'media', 10, 26, 45, 13, 8),
  jogada('chutar-de-fora', 'finalizacao', 'media', 11, 8, 62, 15, 6),

  // ── faixa baixa: constrói ou preserva, quase nunca decide ─────────────────
  jogada('segunda-trave', 'cobranca', 'baixa', 6, 28, 58, 7, 4),
  jogada('devolver-capitao', 'passe', 'baixa', 4, 20, 70, 5, 4),
  jogada('segurar-a-bola', 'passe', 'baixa', 3, 18, 73, 5, 4),
  jogada('cavar-a-falta', 'cobranca', 'baixa', 2, 30, 55, 11, 5),
  jogada('recuar-pro-goleiro', 'passe', 'baixa', 1, 12, 82, 4, 3),
]

export const jogadaPorId = (id: JogadaId): Jogada =>
  CATALOGO.find((item) => item.id === id)!

export const jogadasDaFaixa = (faixa: Faixa): readonly Jogada[] =>
  CATALOGO.filter((item) => item.faixa === faixa)

/** Massa de risco da jogada: o quanto ela decide, para qualquer lado. */
export const massaDeRisco = (item: Jogada): number => {
  const total = DESFECHOS.reduce((acc, desfecho) => acc + item.pesos[desfecho], 0)
  return (item.pesos.gol + item.pesos.contra) / total
}
