/**
 * Desfechos de uma decisão de partida.
 *
 * A decisão deixou de ser binária ("completou o passe ou não") e passou a
 * resolver em um de cinco desfechos, num único sorteio. Três deles mexem no
 * placar — é o que faz a escolha do jogador decidir a partida em vez de só
 * mexer na nota dele.
 */
export type Desfecho =
  /** Você marca. */
  | 'gol'
  /** Você cria; o time finaliza numa rolagem própria. Assistência sua. */
  | 'chance'
  /** A jogada morre sem dano. */
  | 'nada'
  /** Perde a bola. Custa nota, não custa gol. */
  | 'perdeu'
  /** Perde a bola, sai o contra-ataque e o adversário marca. */
  | 'contra'

export const DESFECHOS: readonly Desfecho[] = ['gol', 'chance', 'nada', 'perdeu', 'contra']

/**
 * Faixa de variância da jogada. Não é o mesmo que "chance de dar certo": uma
 * jogada de faixa alta decide mais e entrega mais, para os dois lados.
 */
export type Faixa = 'alta' | 'media' | 'baixa'

export const FAIXAS: readonly Faixa[] = ['alta', 'media', 'baixa']

/** Pesos base de uma jogada — nunca probabilidades. */
export type Pesos = Record<Desfecho, number>

/** Probabilidades normalizadas. Soma 1 por construção. */
export type Distribuicao = Record<Desfecho, number>

/**
 * Tudo que desloca a distribuição, já resolvido em números.
 *
 * Deliberadamente sem tipos de domínio (perk, tática, setor): mantém o cálculo
 * puro e testável, e evita ciclo de import entre `decision` e `match`/`career`.
 * Quem traduz perk e tática nestes números é `context.ts`.
 */
export interface Modificadores {
  /** Nível (1-10) do atributo que a jogada declara. Fora da faixa é aparado. */
  readonly nivel: number
  /** Multiplicador extra sobre gol e chance (perk maestro). */
  readonly bonusBom: number
  /** Multiplicador extra sobre contra (perk frieza). */
  readonly cortaContra: number
  /** Postura do time sobre o contra-ataque: recuar segura, contra-ataque expõe. */
  readonly taticaContra: number
  /** Sua atuação contagiando o time, −0.5..1. */
  readonly momentum: number
  /** Seu ataque contra a defesa deles, −1..1. */
  readonly edgeAtaque: number
  /** Sua defesa contra o ataque deles, −1..1. */
  readonly edgeDefesa: number
  /** O quanto o jogo está truncado, 0..1. */
  readonly travamento: number
}
