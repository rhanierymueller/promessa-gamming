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
 * Depois de cortar teamGoalChance (0.40 → 0.25), opponentGoalChance (0.35 →
 * 0.32) e as taxas de lance corrido, a medição com o perfil equilibrado deu:
 *
 *     gols meus  2.426   gols deles 1.886   V/E/D 50.8 / 20.6 / 28.6
 *
 * contra 2.418 / 1.866 e 50.9 / 21.9 / 27.2 antes. A média e o equilíbrio
 * ficaram onde estavam, e a fatia do placar que sai do pé do jogador subiu de
 * 42% para 68%.
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
}

const medir = (perfil: Perfil): Medida => {
  let meus = 0
  let deles = 0
  let doMeuPe = 0

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
    // gol seu + assistência sua: o que saiu de uma decisão ou de um chute seu
    doMeuPe += sim.value.state.stats.goals + sim.value.state.stats.assists
  }

  return { meus: meus / PARTIDAS, deles: deles / PARTIDAS, doMeuPe: doMeuPe / PARTIDAS }
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
    // antes da mudança eram ~42% (só os chutes); a decisão levou a ~68%
    expect(doMeuPe / meus).toBeGreaterThan(0.6)
  })

  it('ousar rende mais gol e cobra mais caro que se proteger', () => {
    const ousado = medidas.get('ousado')!
    const cauteloso = medidas.get('cauteloso')!
    expect(ousado.meus).toBeGreaterThan(cauteloso.meus)
    expect(ousado.deles).toBeGreaterThan(cauteloso.deles)
  })
})
