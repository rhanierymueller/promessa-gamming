import { describe, expect, it } from 'vitest'
import { DEFAULT_ATTRIBUTES } from '../career/attributes'
import type { ContextoDaJogada } from '../decision/context'
import { PERFIS, type Perfil } from '../decision/profile'
import { createRng } from '../rng'
import { simulateToEnd } from './autoplay'
import { DEFAULT_MATCH_CONFIG } from './config'
import { startMatch } from './match'
import { rollMicroGoal } from './tactics'

/**
 * Sonda de calibragem do placar.
 *
 * A decisão passou a marcar gol para os dois lados. Sem uma trava, cada ajuste
 * futuro num peso do catálogo desregula o placar da partida inteira em
 * silêncio — o teste continua verde e o jogo vira 5×3 toda semana.
 *
 * O alvo veio de uma medição do motor ANTES da mudança (40.000 partidas,
 * confronto neutro, tática equilibrada, craque nível 3):
 *
 *     gols meus  2.418   —  chute 1.024 | plano 0.800 | lance corrido 0.442
 *     gols deles 1.866   —  corrido 0.447 | plano/falta/dado 1.419
 *
 * A ideia da mudança é que a decisão ABSORVA gol do sorteio, não some por cima.
 * Depois vieram o chute único, a falta ocasional e o especial garantido entre
 * falta/dados — que derrubaram a vitória para 40.4% sem nenhum teste acusar,
 * porque só a média de gols estava sob guarda. A compensação veio de
 * `playerDecisions: 3` (mais do lance novo, não mais sorteio) com
 * teamGoalChance 0.30 e opponentGoalChance 0.25. Medição em 20.000 partidas:
 *
 *     gols meus 2.389   gols deles 1.876   V/E/D 50.0 / 21.6 / 28.4
 *
 * contra 2.418 / 1.866 e 50.9 / 21.9 / 27.2 antes de tudo, com 63% dos gols do
 * time saindo de gol ou assistência do protagonista (eram 42%).
 *
 * A faixa é larga de propósito. Ela não existe para fixar um número exato, e
 * sim para acusar quando o placar SAI DA REALIDADE do jogo — os três perfis de
 * escolha produzem placares diferentes de propósito, e isso é a mecânica
 * funcionando.
 */

const PARTIDAS = 4000
/** Lances corridos por partida: 90 minutos a cada MICRO_EVERY_MINUTES (2.4). */
const MICRO_POR_PARTIDA = 37

const CONTEXTO: ContextoDaJogada = {
  attributes: DEFAULT_ATTRIBUTES,
  perks: [],
  tatica: 'equilibrado',
  momentum: 0,
  edges: { attack: 0, defense: 0, midfield: 0 },
  travamento: 0,
}

const PROBS = { shotGoal: 0.34, defenseSave: 0.42 }

interface Medida {
  readonly meus: number
  readonly deles: number
  readonly doMeuPe: number
  readonly vitorias: number
  readonly empates: number
}

const medir = (perfil: Perfil): Medida => {
  let meus = 0
  let deles = 0
  let doMeuPe = 0
  let vitorias = 0
  let empates = 0

  for (let i = 0; i < PARTIDAS; i++) {
    const state = startMatch(i * 7919 + 13, DEFAULT_MATCH_CONFIG)
    const sim = simulateToEnd(
      state,
      DEFAULT_MATCH_CONFIG,
      PROBS,
      { contexto: CONTEXTO, perfil },
      createRng(i * 104729 + 7),
    )
    let t = sim.value.state.score.team
    let o = sim.value.state.score.opponent

    // o lance corrido acontece na tela, não no plano — entra aqui para a
    // medição refletir a partida de verdade
    let rng = createRng(i * 15485863 + 3)
    for (let m = 0; m < MICRO_POR_PARTIDA; m++) {
      const roll = rollMicroGoal('equilibrado', rng, 0, 0)
      rng = roll.next
      if (roll.value === 'team') t++
      if (roll.value === 'opponent') o++
    }

    meus += t
    deles += o
    if (t > o) vitorias++
    else if (t === o) empates++
    // gol seu + assistência sua: o que saiu de uma decisão ou de um chute seu
    doMeuPe += sim.value.state.stats.goals + sim.value.state.stats.assists
  }

  return {
    meus: meus / PARTIDAS,
    deles: deles / PARTIDAS,
    doMeuPe: doMeuPe / PARTIDAS,
    vitorias: vitorias / PARTIDAS,
    empates: empates / PARTIDAS,
  }
}

describe('calibragem do placar', () => {
  const medidas = new Map<Perfil, Medida>(PERFIS.map((perfil) => [perfil, medir(perfil)]))

  it.each(PERFIS)('perfil %s mantém a média de gols na faixa do jogo', (perfil) => {
    const { meus, deles } = medidas.get(perfil)!
    expect(meus, `gols meus (${perfil})`).toBeGreaterThan(1.6)
    expect(meus, `gols meus (${perfil})`).toBeLessThan(3.2)
    expect(deles, `gols deles (${perfil})`).toBeGreaterThan(1.2)
    expect(deles, `gols deles (${perfil})`).toBeLessThan(2.6)
  })

  it('o total da partida não estoura para placar de handebol', () => {
    for (const perfil of PERFIS) {
      const { meus, deles } = medidas.get(perfil)!
      expect(meus + deles, `total (${perfil})`).toBeLessThan(5.0)
    }
  })

  it('a maior parte do placar passa a sair do pé do jogador', () => {
    const { meus, doMeuPe } = medidas.get('equilibrado')!
    // antes das decisões eram ~42%; com o conjunto atual ficam ~62%
    expect(doMeuPe / meus).toBeGreaterThan(0.6)
  })

  /*
   * A média de gols sozinha NÃO protege o balanceamento: quando playerShots caiu
   * de 2 para 1 e a falta virou ocasional, os gols continuaram dentro da faixa
   * enquanto a vitória despencava de 50.9% para 40.4% — o teste seguiu verde e
   * a carreira ficou muito mais dura sem ninguém perceber. Quem decide se o jogo
   * está justo é o RESULTADO, então ele é medido aqui.
   */
  it('o jogador equilibrado ganha aproximadamente metade das partidas', () => {
    const { vitorias, empates } = medidas.get('equilibrado')!
    expect(vitorias).toBeGreaterThan(0.45)
    expect(vitorias).toBeLessThan(0.56)
    expect(empates).toBeGreaterThan(0.15)
    expect(empates).toBeLessThan(0.28)
  })

  it('ousar rende mais gol e cobra mais caro que se proteger', () => {
    const ousado = medidas.get('ousado')!
    const cauteloso = medidas.get('cauteloso')!
    expect(ousado.meus).toBeGreaterThan(cauteloso.meus)
    expect(ousado.deles).toBeGreaterThan(cauteloso.deles)
  })
})
