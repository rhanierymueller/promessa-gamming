import type { Jogada } from './catalog'
import { DESFECHOS, type Distribuicao, type Modificadores, type Pesos } from './outcomes'

/**
 * De pesos base para probabilidade.
 *
 * A regra central: os modificadores multiplicam PESOS e a probabilidade só
 * nasce da normalização.
 *
 *     P(desfecho_i) = (w_i · m_i) / Σ_j (w_j · m_j)
 *
 * Somar direto na probabilidade — como o `boostedPassChance` antigo fazia —
 * exige clamp para não estourar 100%, e o clamp achata a escolha: com passe
 * treinado e perk, a opção segura chegava a 97% e virava opção grátis. Aqui a
 * soma fecha em 1 por construção, e nada chega a 0% nem a 100%.
 *
 * `nada` é a ÂNCORA: é o único desfecho que nenhum modificador multiplica. Sem
 * ela, multiplicar todos os pesos por um fator comum não mudaria nada depois
 * da normalização, e os modificadores perderiam efeito.
 *
 * Monotonicidade não é só empírica. Com m = 1 + 0.8f e r = 1 − 0.45f, escrevendo
 * K = (gol+chance+nada+perdeu+contra) e L = 0.8·(gol+chance) − 0.45·(perdeu+contra):
 *
 *     dP(gol)/df    tem o sinal de   0.8·nada + 1.25·(perdeu+contra)  > 0
 *     dP(contra)/df tem o sinal de  −1.25·(gol+chance) − 0.45·nada    < 0
 *
 * Ou seja: treinar o atributo governante SEMPRE sobe o gol e SEMPRE desce o
 * contra-ataque — e as duas garantias dependem de `nada` e dos pesos ruins
 * serem positivos, que é o que o teste do catálogo assegura.
 */

const NIVEL_MIN = 1
const NIVEL_MAX = 10

/** Quanto o nível máximo do atributo empurra gol e criação. */
const GANHO_BOM = 0.8
/** Quanto o nível máximo do atributo corta perda de bola e contra-ataque. */
const CORTE_RUIM = 0.45
/** Peso do confronto de setores. */
const PESO_ATAQUE = 0.35
const PESO_DEFESA = 0.35
/** Jogo travado seca os dois lados do placar. */
const PESO_TRAVAMENTO = 0.25
/** Momentum: jogando bem, você decide mais e entrega menos. */
const PESO_MOMENTUM_GOL = 0.1
const PESO_MOMENTUM_CONTRA = 0.15

export const NEUTRO: Modificadores = {
  nivel: NIVEL_MIN,
  bonusBom: 1,
  cortaContra: 1,
  taticaContra: 1,
  momentum: 0,
  edgeAtaque: 0,
  edgeDefesa: 0,
  travamento: 0,
}

/** 0 no nível mínimo, 1 no máximo. Nível fora da faixa é aparado. */
const fatorNivel = (nivel: number): number =>
  (Math.min(NIVEL_MAX, Math.max(NIVEL_MIN, nivel)) - NIVEL_MIN) / (NIVEL_MAX - NIVEL_MIN)

const pesosModificados = (pesos: Pesos, mod: Modificadores): Pesos => {
  const f = fatorNivel(mod.nivel)
  const bom = (1 + f * GANHO_BOM) * mod.bonusBom
  const ruim = 1 - f * CORTE_RUIM
  const travado = 1 - mod.travamento * PESO_TRAVAMENTO

  return {
    gol:
      pesos.gol *
      bom *
      (1 + mod.edgeAtaque * PESO_ATAQUE) *
      travado *
      (1 + mod.momentum * PESO_MOMENTUM_GOL),
    chance: pesos.chance * bom,
    // âncora: nunca multiplicada
    nada: pesos.nada,
    perdeu: pesos.perdeu * ruim,
    contra:
      pesos.contra *
      ruim *
      (1 - mod.edgeDefesa * PESO_DEFESA) *
      travado *
      mod.taticaContra *
      (1 - mod.momentum * PESO_MOMENTUM_CONTRA) *
      mod.cortaContra,
  }
}

/**
 * A distribuição de desfechos da jogada neste contexto.
 *
 * Esta é a ÚNICA fonte de probabilidade do sistema: a tela mostra o que ela
 * devolve e o sorteio consome o que ela devolve. Não existe caminho onde a
 * porcentagem exibida ao jogador difira da que o dado usa.
 */
export const distribuicao = (jogada: Jogada, mod: Modificadores): Distribuicao => {
  const pesos = pesosModificados(jogada.pesos, mod)
  const total = DESFECHOS.reduce((acc, desfecho) => acc + pesos[desfecho], 0)
  return DESFECHOS.reduce(
    (acc, desfecho) => ({ ...acc, [desfecho]: pesos[desfecho] / total }),
    {} as Distribuicao,
  )
}

/** Saldo esperado de gol da jogada: o seu menos o do adversário. */
export const saldoEsperado = (jogada: Jogada, mod: Modificadores): number => {
  const d = distribuicao(jogada, mod)
  return d.gol - d.contra
}
