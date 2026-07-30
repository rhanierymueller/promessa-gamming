import { describe, expect, test } from 'vitest'
import { DEFAULT_MATCH_CONFIG } from './config'

/*
 * Sem o lance de dados: estes testes percorrem o plano medindo chute, passe
 * e placar. O dado é um lance jogável que interrompe esse caminho e tem
 * cobertura própria em engine/dice/duel.test.ts.
 */
const CFG = {
  ...DEFAULT_MATCH_CONFIG,
  diceDuelChance: 0,
  // testes determinísticos de contagem mantêm a única vaga de falta presente
  playerFreeKickChance: 1,
}
import {
  advance,
  applyDecider,
  applyDefenseResult,
  applyDecisionResult,
  applyShotResult,
  currentMoment,
  isFinished,
  isPlayerMoment,
  needsDecider,
  startMatch,
} from './match'
import { displayRating } from './rating'
import type { MatchState } from './types'

/** Joga a partida inteira: gol em todo chute, decisão sempre bem resolvida. */
const playPerfectMatch = (state: MatchState): MatchState => {
  let current = state
  while (!isFinished(current)) {
    const moment = currentMoment(current)
    if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') {
      current = applyShotResult(current, 'goal', false, CFG)
    } else if (moment.kind === 'playerDecision') {
      current = applyDecisionResult(current, 'chance', 0.5, false, CFG)
    } else if (moment.kind === 'opponentFreeKick') {
      current = applyDefenseResult(current, true, CFG)
    } else {
      current = advance(current)
    }
  }
  return current
}

describe('startMatch', () => {
  test('gera a timeline entre o apito inicial e o final, em ordem de minuto', () => {
    // Arrange & Act
    const match = startMatch(42, CFG)

    // Assert
    expect(match.plan[0].kind).toBe('kickoff')
    expect(match.plan[match.plan.length - 1].kind).toBe('fulltime')
    const minutes = match.plan.map((m) => m.minute)
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes)
  })

  test('inclui exatamente os lances jogáveis configurados', () => {
    // Arrange & Act
    const match = startMatch(42, CFG)

    // Assert
    expect(match.plan.filter((m) => m.kind === 'playerShot')).toHaveLength(CFG.playerShots)
    expect(match.plan.filter((m) => m.kind === 'playerFreeKick')).toHaveLength(CFG.playerFreeKicks)
    expect(match.plan.filter((m) => m.kind === 'playerDecision')).toHaveLength(CFG.playerDecisions)
    expect(match.plan.filter((m) => m.kind === 'opponentFreeKick')).toHaveLength(CFG.opponentFreeKicks)
  })

  test('é determinística para a mesma seed', () => {
    // Act & Assert
    expect(startMatch(7, CFG)).toEqual(startMatch(7, CFG))
  })

  test('seeds diferentes geram partidas diferentes', () => {
    // Act & Assert
    expect(startMatch(1, CFG).plan).not.toEqual(startMatch(2, CFG).plan)
  })
})

describe('advance', () => {
  test('narração não mexe no placar', () => {
    // Arrange
    const match = startMatch(42, CFG)

    // Act
    const after = advance(match)

    // Assert
    expect(after.score).toEqual({ team: 0, opponent: 0 })
    expect(after.cursor).toBe(1)
  })

  test('gol do time e do adversário movem o placar', () => {
    // Arrange: percorre a partida errando todos os lances do jogador
    let state = startMatch(11, CFG)
    let expectedTeam = 0
    let expectedOpponent = 0

    // Act
    while (!isFinished(state)) {
      const moment = currentMoment(state)
      if (moment.kind === 'teamGoal') expectedTeam++
      if (moment.kind === 'opponentGoal') expectedOpponent++
      if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') state = applyShotResult(state, 'miss', false, CFG)
      else if (moment.kind === 'playerDecision') state = applyDecisionResult(state, 'perdeu', -0.4, false, CFG)
      else if (moment.kind === 'opponentFreeKick') state = applyDefenseResult(state, true, CFG)
      else state = advance(state)
    }

    // Assert
    expect(state.score.team).toBe(expectedTeam)
    expect(state.score.opponent).toBe(expectedOpponent)
  })

  test('recusa avançar por cima de um lance do jogador', () => {
    // Arrange: avança até o primeiro momento jogável
    let state = startMatch(42, CFG)
    while (!isPlayerMoment(currentMoment(state))) state = advance(state)

    // Act & Assert
    expect(() => advance(state)).toThrow(/mini-game/)
  })
})

describe('applyShotResult e applyDecisionResult', () => {
  const atFirstMoment = (kind: 'playerShot' | 'playerDecision', seed = 42): MatchState => {
    let state = startMatch(seed, CFG)
    while (currentMoment(state).kind !== kind) {
      const moment = currentMoment(state)
      if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') state = applyShotResult(state, 'save', false, CFG)
      else if (moment.kind === 'playerDecision') state = applyDecisionResult(state, 'nada', 0, false, CFG)
      else if (moment.kind === 'opponentFreeKick') state = applyDefenseResult(state, true, CFG)
      else state = advance(state)
    }
    return state
  }

  test('gol do jogador soma no placar, nas estatísticas e na nota', () => {
    // Arrange
    const before = atFirstMoment('playerShot')

    // Act
    const after = applyShotResult(before, 'goal', true, CFG)

    // Assert
    expect(after.score.team).toBe(before.score.team + 1)
    expect(after.stats.goals).toBe(before.stats.goals + 1)
    expect(after.stats.golacos).toBe(1)
    expect(after.rating).toBeGreaterThan(before.rating)
  })

  test('chute pra fora derruba a nota sem mexer no placar', () => {
    // Arrange
    const before = atFirstMoment('playerShot')

    // Act
    const after = applyShotResult(before, 'miss', false, CFG)

    // Assert
    expect(after.score).toEqual(before.score)
    expect(after.rating).toBeLessThan(before.rating)
  })

  test('decisão conta nas estatísticas e aplica o delta na nota', () => {
    // Arrange
    const before = atFirstMoment('playerDecision')

    // Act
    const after = applyDecisionResult(before, 'chance', 0.5, false, CFG)

    // Assert
    expect(after.stats.decisions).toBe(1)
    expect(after.stats.decisionsGood).toBe(1)
    expect(after.rating).toBeCloseTo(Math.min(CFG.maxRating, before.rating + 0.5))
  })

  test('gol de decisão soma no placar e nos gols do jogador', () => {
    // Arrange
    const before = atFirstMoment('playerDecision')

    // Act
    const after = applyDecisionResult(before, 'gol', 1.2, false, CFG)

    // Assert
    expect(after.score.team).toBe(before.score.team + 1)
    expect(after.stats.goals).toBe(before.stats.goals + 1)
    expect(after.stats.assists).toBe(0)
  })

  test('chance convertida é assistência, não gol do jogador', () => {
    // Arrange
    const before = atFirstMoment('playerDecision')

    // Act
    const after = applyDecisionResult(before, 'chance', 0.5, true, CFG)

    // Assert
    expect(after.score.team).toBe(before.score.team + 1)
    expect(after.stats.goals).toBe(before.stats.goals)
    expect(after.stats.assists).toBe(1)
  })

  test('criar a chance conta como decisão boa mesmo se o time desperdiça', () => {
    // Arrange
    const before = atFirstMoment('playerDecision')

    // Act
    const after = applyDecisionResult(before, 'chance', 0.5, false, CFG)

    // Assert: o erro do companheiro não é falha de quem inventou a jogada
    expect(after.stats.decisionsGood).toBe(1)
    expect(after.score).toEqual(before.score)
    expect(after.stats.assists).toBe(0)
  })

  test('contra-ataque sofrido soma para o adversário', () => {
    // Arrange
    const before = atFirstMoment('playerDecision')

    // Act
    const after = applyDecisionResult(before, 'contra', -1, false, CFG)

    // Assert
    expect(after.score.opponent).toBe(before.score.opponent + 1)
    expect(after.score.team).toBe(before.score.team)
    expect(after.stats.decisionsGood).toBe(0)
  })

  test('perder a bola custa nota e não mexe no placar', () => {
    // Arrange
    const before = atFirstMoment('playerDecision')

    // Act
    const after = applyDecisionResult(before, 'perdeu', -0.6, false, CFG)

    // Assert
    expect(after.score).toEqual(before.score)
    expect(after.rating).toBeLessThan(before.rating)
    expect(after.stats.decisions).toBe(1)
  })

  test('aplicar decisão fora do momento de decisão é erro de programação', () => {
    // Arrange
    const state = atFirstMoment('playerShot')

    // Act & Assert
    expect(() => applyDecisionResult(state, 'gol', 1, false, CFG)).toThrow(/fora de hora/)
  })

  test('aplicar resultado de chute num momento de passe é erro de programação', () => {
    // Arrange
    const state = atFirstMoment('playerDecision')

    // Act & Assert
    expect(() => applyShotResult(state, 'goal', false, CFG)).toThrow(/fora de hora/)
  })
})

describe('applyDefenseResult', () => {
  const atDefenseMoment = (seed = 42): MatchState => {
    let state = startMatch(seed, CFG)
    while (currentMoment(state).kind !== 'opponentFreeKick') {
      const moment = currentMoment(state)
      if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') state = applyShotResult(state, 'save', false, CFG)
      else if (moment.kind === 'playerDecision') state = applyDecisionResult(state, 'nada', 0, false, CFG)
      else state = advance(state)
    }
    return state
  }

  test('defesa sobe a nota sem mexer no placar', () => {
    // Arrange
    const before = atDefenseMoment()

    // Act
    const after = applyDefenseResult(before, true, CFG)

    // Assert
    expect(after.score).toEqual(before.score)
    expect(after.rating).toBeGreaterThan(before.rating)
  })

  test('gol sofrido soma no placar deles e desconta na nota', () => {
    // Arrange
    const before = atDefenseMoment()

    // Act
    const after = applyDefenseResult(before, false, CFG)

    // Assert
    expect(after.score.opponent).toBe(before.score.opponent + 1)
    expect(after.rating).toBeLessThan(before.rating)
  })
})

describe('partida completa', () => {
  test('flui do início ao fim com placar e nota coerentes', () => {
    // Arrange & Act
    const finished = playPerfectMatch(startMatch(99, CFG))

    // Assert
    expect(isFinished(finished)).toBe(true)
    const finishes = CFG.playerShots + CFG.playerFreeKicks
    expect(finished.stats.shots).toBe(finishes)
    expect(finished.stats.goals).toBe(finishes)
    expect(finished.score.team).toBeGreaterThanOrEqual(finishes)
    expect(finished.rating).toBeLessThanOrEqual(CFG.maxRating)
    expect(finished.rating).toBeGreaterThan(CFG.baseRating)
  })

  test('a nota nunca estoura os limites', () => {
    // Arrange: partida perfeita (teto) e depois desastre (piso)
    const perfect = playPerfectMatch(startMatch(5, CFG))

    let disaster = startMatch(5, CFG)
    while (!isFinished(disaster)) {
      const moment = currentMoment(disaster)
      if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') disaster = applyShotResult(disaster, 'miss', false, CFG)
      else if (moment.kind === 'playerDecision') disaster = applyDecisionResult(disaster, 'perdeu', -2, false, CFG)
      else if (moment.kind === 'opponentFreeKick') disaster = applyDefenseResult(disaster, false, CFG)
      else disaster = advance(disaster)
    }

    // Assert
    expect(perfect.rating).toBeLessThanOrEqual(CFG.maxRating)
    expect(disaster.rating).toBeGreaterThanOrEqual(CFG.minRating)
  })
})

describe('displayRating', () => {
  test('arredonda para uma casa decimal', () => {
    expect(displayRating(7.6499999)).toBe(7.6)
    expect(displayRating(6.85)).toBe(6.9)
  })
})

describe('lance de dados na partida', () => {
  /** Em quantas partidas de 400 o dado apareceu. */
  const frequenciaDoDado = (): number => {
    let comDado = 0
    for (let seed = 0; seed < 400; seed++) {
      const match = startMatch(seed, DEFAULT_MATCH_CONFIG)
      if (match.plan.some((m) => m.kind === 'diceDuel')) comDado++
    }
    return comDado / 400
  }

  test('aparece às vezes, não em toda partida', () => {
    // O fallback de variedade aumenta a frequência-base de 30%, sem garantir
    // que seja sempre o dado: às vezes o especial escolhido é a falta.
    const freq = frequenciaDoDado()
    expect(freq).toBeGreaterThan(0.35)
    expect(freq).toBeLessThan(0.6)
  })

  test('nunca cai mais de um lance de dados na mesma partida', () => {
    for (let seed = 0; seed < 200; seed++) {
      const match = startMatch(seed, DEFAULT_MATCH_CONFIG)
      expect(match.plan.filter((m) => m.kind === 'diceDuel').length).toBeLessThanOrEqual(1)
    }
  })

  test('com chance 0 o dado nunca aparece', () => {
    const semDado = { ...DEFAULT_MATCH_CONFIG, diceDuelChance: 0 }
    for (let seed = 0; seed < 50; seed++) {
      expect(startMatch(seed, semDado).plan.some((m) => m.kind === 'diceDuel')).toBe(false)
    }
  })
})

describe('falta a favor na partida', () => {
  /** Em quantas partidas de 800 a falta perigosa apareceu. */
  const frequenciaDaFalta = (): number => {
    let comFalta = 0
    for (let seed = 0; seed < 800; seed++) {
      const match = startMatch(seed, DEFAULT_MATCH_CONFIG)
      if (match.plan.some((moment) => moment.kind === 'playerFreeKick')) comFalta++
    }
    return comFalta / 800
  }

  test('aparece às vezes, sem ser garantida em toda rodada', () => {
    const frequency = frequenciaDaFalta()
    expect(frequency).toBeGreaterThan(0.55)
    expect(frequency).toBeLessThan(0.8)
  })

  test('com chance zero não inclui falta a favor', () => {
    const semFalta = { ...DEFAULT_MATCH_CONFIG, playerFreeKickChance: 0 }
    for (let seed = 0; seed < 100; seed++) {
      expect(startMatch(seed, semFalta).plan.some((moment) => moment.kind === 'playerFreeKick')).toBe(false)
    }
  })
})

describe('variedade mínima de minigames', () => {
  test('toda partida tem falta a favor ou duelo de dados', () => {
    for (let seed = 0; seed < 800; seed++) {
      const plan = startMatch(seed, DEFAULT_MATCH_CONFIG).plan
      const hasFreeKick = plan.some((moment) => moment.kind === 'playerFreeKick')
      const hasDice = plan.some((moment) => moment.kind === 'diceDuel')
      expect(hasFreeKick || hasDice).toBe(true)
    }
  })

  test('falta e dados continuam aparecendo juntos em algumas partidas', () => {
    let withBoth = 0
    for (let seed = 0; seed < 800; seed++) {
      const plan = startMatch(seed, DEFAULT_MATCH_CONFIG).plan
      if (
        plan.some((moment) => moment.kind === 'playerFreeKick') &&
        plan.some((moment) => moment.kind === 'diceDuel')
      ) {
        withBoth++
      }
    }
    expect(withBoth).toBeGreaterThan(50)
  })
})

describe('desempate no lance dos dados', () => {
  /** Leva a partida até o fim com o placar que o teste pedir. */
  const finishedTied = (): MatchState => {
    let state = startMatch(11, CFG)
    while (!isFinished(state)) {
      const moment = currentMoment(state)
      if (moment.kind === 'playerShot' || moment.kind === 'playerFreeKick') {
        state = applyShotResult(state, 'miss', false, CFG)
      } else if (moment.kind === 'playerDecision') {
        state = applyDecisionResult(state, 'nada', 0, false, CFG)
      } else if (moment.kind === 'opponentFreeKick') {
        state = applyDefenseResult(state, true, CFG)
      } else {
        state = advance(state)
      }
    }
    return { ...state, score: { team: 1, opponent: 1 } }
  }

  test('só pede desempate em jogo eliminatório empatado e encerrado', () => {
    // Arrange
    const empatado = finishedTied()

    // Assert
    expect(needsDecider(empatado, true)).toBe(true)
    expect(needsDecider(empatado, false)).toBe(false)
    expect(needsDecider({ ...empatado, score: { team: 2, opponent: 1 } }, true)).toBe(false)
    expect(needsDecider(startMatch(11, CFG), true)).toBe(false)
  })

  test('ganhar nos dados desempata a seu favor', () => {
    const decidido = applyDecider(finishedTied(), true)
    expect(decidido.score).toEqual({ team: 2, opponent: 1 })
  })

  test('perder nos dados dá a vaga ao adversário', () => {
    const decidido = applyDecider(finishedTied(), false)
    expect(decidido.score).toEqual({ team: 1, opponent: 2 })
  })

  test('o desempate não mexe na sua nota nem nas suas estatísticas', () => {
    // o gol é da decisão, não uma atuação sua — inflar a nota seria injusto
    const antes = finishedTied()
    const depois = applyDecider(antes, true)
    expect(depois.rating).toBe(antes.rating)
    expect(depois.stats).toEqual(antes.stats)
  })

  test('depois do desempate o jogo nunca mais está empatado', () => {
    for (const won of [true, false]) {
      const decidido = applyDecider(finishedTied(), won)
      expect(decidido.score.team).not.toBe(decidido.score.opponent)
      expect(needsDecider(decidido, true)).toBe(false)
    }
  })
})
