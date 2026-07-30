import { describe, expect, it } from 'vitest'
import { DEFAULT_MATCH_CONFIG } from './config'
import {
  advance,
  advanceAuto,
  applyDecisionResult,
  applyDefenseResult,
  applyDiceResult,
  applyExtraGoal,
  applyShotResult,
  currentMoment,
  isFinished,
  isPlayerMoment,
  startMatch,
} from './match'
import type { MatchMoment, MatchState } from './types'

/*
 * Estas funções somam gol FORA do chute — são a base do gol de decisão — e
 * estavam sem nenhuma cobertura. Cobrir aqui antes de derivar delas.
 */

const CFG = DEFAULT_MATCH_CONFIG

/** Empurra a partida até o momento pedido, resolvendo os lances no caminho. */
const avancarAte = (state: MatchState, kind: MatchMoment['kind']): MatchState => {
  let atual = state
  while (!isFinished(atual) && currentMoment(atual).kind !== kind) {
    const moment = currentMoment(atual)
    if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') {
      atual = applyShotResult(atual, 'save', false, CFG)
    } else if (moment.kind === 'playerDecision') {
      atual = applyDecisionResult(atual, 'nada', 0, false, CFG)
    } else if (moment.kind === 'opponentFreeKick') {
      atual = applyDefenseResult(atual, true, CFG)
    } else if (moment.kind === 'diceDuel') {
      atual = applyDiceResult(atual, true, CFG)
    } else {
      atual = advance(atual)
    }
  }
  return atual
}

const acharSeed = (kind: MatchMoment['kind'], config = CFG): MatchState => {
  for (let seed = 0; seed < 400; seed++) {
    const state = startMatch(seed, config)
    if (state.plan.some((moment) => moment.kind === kind)) return state
  }
  throw new Error(`nenhuma semente produziu ${kind}`)
}

describe('applyExtraGoal', () => {
  it('soma para o time sem mexer no cursor nem na nota', () => {
    const state = startMatch(1, CFG)
    const depois = applyExtraGoal(state, 'team')
    expect(depois.score).toEqual({ team: 1, opponent: 0 })
    expect(depois.cursor).toBe(state.cursor)
    expect(depois.rating).toBe(state.rating)
  })

  it('soma para o adversário', () => {
    const depois = applyExtraGoal(startMatch(1, CFG), 'opponent')
    expect(depois.score).toEqual({ team: 0, opponent: 1 })
  })

  it('não muta o estado recebido', () => {
    const state = startMatch(1, CFG)
    applyExtraGoal(state, 'team')
    expect(state.score).toEqual({ team: 0, opponent: 0 })
  })

  it('acumula em chamadas seguidas', () => {
    const state = startMatch(1, CFG)
    const depois = applyExtraGoal(applyExtraGoal(state, 'team'), 'team')
    expect(depois.score.team).toBe(2)
  })
})

describe('applyDiceResult', () => {
  const comDado = { ...CFG, diceDuelChance: 1 }

  it('ganhar a dividida marca para o time, conta gol e sobe a nota', () => {
    const state = avancarAte(acharSeed('diceDuel', comDado), 'diceDuel')
    const depois = applyDiceResult(state, true, comDado)
    expect(depois.score.team).toBe(state.score.team + 1)
    expect(depois.stats.goals).toBe(state.stats.goals + 1)
    expect(depois.rating).toBeGreaterThan(state.rating)
    expect(depois.cursor).toBe(state.cursor + 1)
  })

  it('perder a dividida marca para o adversário e cobra a nota', () => {
    const state = avancarAte(acharSeed('diceDuel', comDado), 'diceDuel')
    const depois = applyDiceResult(state, false, comDado)
    expect(depois.score.opponent).toBe(state.score.opponent + 1)
    expect(depois.stats.goals).toBe(state.stats.goals)
    expect(depois.rating).toBeLessThan(state.rating)
  })

  it('recusa ser chamada fora do momento do dado', () => {
    const state = startMatch(1, CFG)
    expect(() => applyDiceResult(state, true, CFG)).toThrow(/fora de hora/)
  })
})

describe('advanceAuto', () => {
  it('mantendo o efeito, o gol planejado entra no placar', () => {
    const state = avancarAte(acharSeed('teamGoal'), 'teamGoal')
    const depois = advanceAuto(state, true)
    expect(depois.score.team).toBe(state.score.team + 1)
    expect(depois.cursor).toBe(state.cursor + 1)
  })

  it('anulando o efeito, o gol planejado é desperdiçado mas o lance passa', () => {
    const state = avancarAte(acharSeed('teamGoal'), 'teamGoal')
    const depois = advanceAuto(state, false)
    expect(depois.score).toEqual(state.score)
    expect(depois.cursor).toBe(state.cursor + 1)
  })

  it('anula gol do adversário quando a tática segura', () => {
    const state = avancarAte(acharSeed('opponentGoal'), 'opponentGoal')
    const depois = advanceAuto(state, false)
    expect(depois.score.opponent).toBe(state.score.opponent)
  })

  it('recusa avançar automaticamente um lance jogável', () => {
    const state = avancarAte(startMatch(1, CFG), 'playerShot')
    expect(() => advanceAuto(state, true)).toThrow(/exige resultado do mini-game/)
  })

  it('em partida encerrada devolve o mesmo estado', () => {
    let state = startMatch(1, CFG)
    while (!isFinished(state)) {
      const moment = currentMoment(state)
      state = isPlayerMoment(moment)
        ? moment.kind === 'playerShot' || moment.kind === 'playerFreeKick'
          ? applyShotResult(state, 'save', false, CFG)
          : moment.kind === 'playerDecision'
            ? applyDecisionResult(state, 'nada', 0, false, CFG)
            : moment.kind === 'opponentFreeKick'
              ? applyDefenseResult(state, true, CFG)
              : applyDiceResult(state, true, CFG)
        : advance(state)
    }
    expect(advanceAuto(state, true)).toBe(state)
  })
})

describe('guardas dos lances jogáveis', () => {
  it('applyDecisionResult recusa momento que não é de decisão', () => {
    const state = avancarAte(startMatch(1, CFG), 'playerShot')
    expect(() => applyDecisionResult(state, 'nada', 0, false, CFG)).toThrow(/fora de hora/)
  })

  it('applyDefenseResult recusa momento que não é falta do adversário', () => {
    const state = avancarAte(startMatch(1, CFG), 'playerShot')
    expect(() => applyDefenseResult(state, true, CFG)).toThrow(/fora de hora/)
  })

  it('advance recusa qualquer lance jogável', () => {
    const state = avancarAte(startMatch(1, CFG), 'playerShot')
    expect(() => advance(state)).toThrow(/exige resultado do mini-game/)
  })
})
