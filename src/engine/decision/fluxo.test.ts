import { describe, expect, it } from 'vitest'
import { DEFAULT_ATTRIBUTES } from '../career/attributes'
import { simulateToEnd } from '../match/autoplay'
import { DEFAULT_MATCH_CONFIG } from '../match/config'
import { advance, applyDecisionResult, currentMoment, isFinished, startMatch } from '../match/match'
import type { MatchConfig, MatchState } from '../match/types'
import { createRng, type RngState } from '../rng'
import { modificadoresPara, type ContextoDaJogada } from './context'
import { sortearJogadas } from './draw'
import { notaDe } from './nota'
import { escolhaDoPerfil, PERFIS, type Perfil } from './profile'
import { jogarDecisao } from './resolve'

/**
 * O lance de decisão de ponta a ponta, do jeito que a tela e a simulação o
 * jogam: sorteia o menu, escolhe, resolve, aplica no placar. Os testes por
 * módulo garantem cada peça; este garante que as peças se encaixam e que o
 * placar só muda pelos desfechos que o design promete.
 */

const CONTEXTO: ContextoDaJogada = {
  attributes: DEFAULT_ATTRIBUTES,
  perks: [],
  tatica: 'equilibrado',
  momentum: 0,
  edges: { attack: 0, defense: 0, midfield: 0 },
  travamento: 0,
}

/** Só decisões no plano: todo gol da partida sai de uma escolha. */
const SO_DECISOES: MatchConfig = {
  ...DEFAULT_MATCH_CONFIG,
  playerShots: 0,
  playerFreeKicks: 0,
  playerFreeKickChance: 0,
  opponentFreeKicks: 0,
  opponentFreeKickChance: 0,
  diceDuelChance: 0,
  minimumSpecialMoments: 0,
  teamGoalChance: 0,
  opponentGoalChance: 0,
  playerDecisions: 3,
}

interface Passo {
  readonly antes: MatchState
  readonly depois: MatchState
  readonly desfecho: string
  readonly faixa: string
  readonly assistConvertida: boolean
}

/** Joga a partida à mão, como a tela: um perfil faz o papel do clique. */
const jogarAMao = (
  seed: number,
  perfil: Perfil,
  contexto: ContextoDaJogada,
  rng: RngState,
): { readonly state: MatchState; readonly passos: readonly Passo[]; readonly rng: RngState } => {
  let state = startMatch(seed, SO_DECISOES)
  let dado = rng
  const passos: Passo[] = []
  while (!isFinished(state)) {
    const moment = currentMoment(state)
    if (moment.kind !== 'playerDecision') {
      state = advance(state)
      continue
    }
    const menu = sortearJogadas(dado)
    const jogada = escolhaDoPerfil(menu.value, perfil)
    const lance = jogarDecisao(jogada, modificadoresPara(jogada, contexto), menu.next)
    dado = lance.next
    const depois = applyDecisionResult(
      state,
      lance.value.resolucao.desfecho,
      lance.value.resolucao.notaDelta,
      lance.value.assistConvertida,
      SO_DECISOES,
    )
    passos.push({
      antes: state,
      depois,
      desfecho: lance.value.resolucao.desfecho,
      faixa: jogada.faixa,
      assistConvertida: lance.value.assistConvertida,
    })
    state = depois
  }
  return { state, passos, rng: dado }
}

describe('fluxo da decisão', () => {
  it('jogar à mão e simular produzem a MESMA partida com o mesmo dado', () => {
    // convergência por construção: os dois caminhos passam pelo mesmo jogarDecisao
    for (let seed = 0; seed < 100; seed++) {
      for (const perfil of PERFIS) {
        const dado = createRng(seed * 101 + 7)
        const manual = jogarAMao(seed, perfil, CONTEXTO, dado)
        const sim = simulateToEnd(
          startMatch(seed, SO_DECISOES),
          SO_DECISOES,
          { shotGoal: 0, defenseSave: 0 },
          { contexto: CONTEXTO, perfil },
          dado,
        )
        expect(sim.value.state, `seed ${seed} ${perfil}`).toEqual(manual.state)
        expect(sim.next, `seed ${seed} ${perfil}`).toEqual(manual.rng)
      }
    }
  })

  it('o placar só muda pelos desfechos que o design promete', () => {
    for (let seed = 0; seed < 300; seed++) {
      const { passos } = jogarAMao(seed, PERFIS[seed % PERFIS.length], CONTEXTO, createRng(seed))
      expect(passos.length, `seed ${seed}`).toBe(SO_DECISOES.playerDecisions)
      for (const { antes, depois, desfecho, assistConvertida } of passos) {
        const meu = depois.score.team - antes.score.team
        const deles = depois.score.opponent - antes.score.opponent
        const golDoTime = desfecho === 'chance' && assistConvertida
        expect(meu, `${desfecho} seed ${seed}`).toBe(desfecho === 'gol' || golDoTime ? 1 : 0)
        expect(deles, `${desfecho} seed ${seed}`).toBe(desfecho === 'contra' ? 1 : 0)
        // quem finalizou foi o companheiro: assistência sua, gol dele
        expect(depois.stats.goals - antes.stats.goals).toBe(desfecho === 'gol' ? 1 : 0)
        expect(depois.stats.assists - antes.stats.assists).toBe(golDoTime ? 1 : 0)
        expect(depois.stats.decisions - antes.stats.decisions).toBe(1)
        expect(depois.stats.decisionsGood - antes.stats.decisionsGood).toBe(
          desfecho === 'gol' || desfecho === 'chance' ? 1 : 0,
        )
        // fora da chance criada, o time nunca "converte" nada
        if (desfecho !== 'chance') expect(assistConvertida).toBe(false)
      }
    }
  })

  it('a nota sobe ou desce pela tabela da faixa, dentro do piso e do teto', () => {
    for (let seed = 0; seed < 200; seed++) {
      const { passos } = jogarAMao(seed, 'ousado', CONTEXTO, createRng(seed + 1000))
      for (const { antes, depois, desfecho, faixa } of passos) {
        const esperado = antes.rating + notaDe(faixa as never, desfecho as never)
        const aparado = Math.min(SO_DECISOES.maxRating, Math.max(SO_DECISOES.minRating, esperado))
        expect(depois.rating, `${faixa}.${desfecho} seed ${seed}`).toBeCloseTo(aparado, 12)
      }
    }
  })

  it('os cinco desfechos aparecem em partidas reais — nenhum é teórico', () => {
    const vistos = new Set<string>()
    let convertida = false
    for (let seed = 0; seed < 300 && (vistos.size < 5 || !convertida); seed++) {
      const { passos } = jogarAMao(seed, PERFIS[seed % PERFIS.length], CONTEXTO, createRng(seed * 3))
      for (const passo of passos) {
        vistos.add(passo.desfecho)
        if (passo.assistConvertida) convertida = true
      }
    }
    expect([...vistos].sort()).toEqual(['chance', 'contra', 'gol', 'nada', 'perdeu'])
    expect(convertida).toBe(true)
  })

  it('é determinístico de ponta a ponta: mesma semente, mesmo placar', () => {
    const a = jogarAMao(42, 'equilibrado', CONTEXTO, createRng(9))
    const b = jogarAMao(42, 'equilibrado', CONTEXTO, createRng(9))
    expect(a.state).toEqual(b.state)
    expect(a.passos.map((p) => p.desfecho)).toEqual(b.passos.map((p) => p.desfecho))
  })

  it('o dado do lance muda o resultado mesmo com o mesmo plano', () => {
    const placares = new Set<string>()
    for (let dado = 0; dado < 40; dado++) {
      const { state } = jogarAMao(42, 'ousado', CONTEXTO, createRng(dado))
      placares.add(`${state.score.team}x${state.score.opponent}`)
    }
    expect(placares.size).toBeGreaterThan(1)
  })

  it('a build do craque muda o placar: matador no nível 10 marca mais que no nível 1', () => {
    const golsCom = (finalizacao: number): number => {
      let total = 0
      const contexto = { ...CONTEXTO, attributes: { ...DEFAULT_ATTRIBUTES, finalizacao } }
      for (let seed = 0; seed < 400; seed++) {
        total += jogarAMao(seed, 'ousado', contexto, createRng(seed * 7 + 1)).state.stats.goals
      }
      return total
    }
    expect(golsCom(10)).toBeGreaterThan(golsCom(1) * 1.3)
  })

  it('recuar sofre menos contra-ataque que jogar no contra-ataque', () => {
    const sofridos = (tatica: ContextoDaJogada['tatica']): number => {
      let total = 0
      for (let seed = 0; seed < 400; seed++) {
        total += jogarAMao(seed, 'ousado', { ...CONTEXTO, tatica }, createRng(seed * 5 + 2)).state
          .score.opponent
      }
      return total
    }
    expect(sofridos('recuar')).toBeLessThan(sofridos('contra-ataque'))
  })
})
