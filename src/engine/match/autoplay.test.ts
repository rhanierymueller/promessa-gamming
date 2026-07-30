import { describe, expect, test } from 'vitest'
import { DEFAULT_ATTRIBUTES } from '../career/attributes'
import type { ContextoDaJogada } from '../decision/context'
import { createRng } from '../rng'
import { simulateToEnd, type AutoPlayDecision, type AutoPlayProbs } from './autoplay'
import { DEFAULT_MATCH_CONFIG } from './config'
import { isFinished, startMatch } from './match'

const ALWAYS: AutoPlayProbs = { shotGoal: 1, defenseSave: 1 }
const NEVER: AutoPlayProbs = { shotGoal: 0, defenseSave: 0 }

const CONTEXTO: ContextoDaJogada = {
  attributes: DEFAULT_ATTRIBUTES,
  perks: [],
  tatica: 'equilibrado',
  momentum: 0,
  edges: { attack: 0, defense: 0, midfield: 0 },
  travamento: 0,
}

const DECIDE: AutoPlayDecision = { contexto: CONTEXTO, perfil: 'equilibrado' }

/*
 * Sem o lance de dados: ele é moeda ao ar e somaria um gol imprevisível ao
 * placar, embaralhando os testes que medem o efeito do CHUTE. O lance tem
 * cobertura própria em engine/dice/duel.test.ts.
 */
const NO_DICE = { ...DEFAULT_MATCH_CONFIG, diceDuelChance: 0 }

/*
 * E sem as decisões, pelo mesmo motivo: a decisão resolve numa distribuição de
 * cinco desfechos e pode marcar para os dois lados. Nenhuma probabilidade a
 * força — é de propósito, nada é garantido nem impossível. Os testes que medem
 * chute e plano isolam a variável; a decisão tem bloco próprio abaixo.
 */
const SO_CHUTE = { ...NO_DICE, playerDecisions: 0 }

describe('simulateToEnd', () => {
  test('consome o plano inteiro e termina a partida', () => {
    // Arrange
    const match = startMatch(42, NO_DICE)

    // Act
    const { value } = simulateToEnd(match, NO_DICE, ALWAYS, DECIDE, createRng(7))

    // Assert
    expect(isFinished(value.state)).toBe(true)
  })

  test('com probabilidade 1, todo chute do jogador vira gol', () => {
    // Arrange
    const match = startMatch(42, SO_CHUTE)
    const playerShots = match.plan.filter(
      (m) => m.kind === 'playerShot' || m.kind === 'playerFreeKick',
    ).length

    // Act
    const { value } = simulateToEnd(match, SO_CHUTE, ALWAYS, DECIDE, createRng(7))

    // Assert
    expect(value.state.stats.goals).toBe(playerShots)
    expect(value.state.stats.shots).toBe(playerShots)
  })

  test('com probabilidade 0, nenhum chute entra e a nota cai', () => {
    // Arrange
    const match = startMatch(42, SO_CHUTE)

    // Act
    const { value } = simulateToEnd(match, SO_CHUTE, NEVER, DECIDE, createRng(7))

    // Assert
    expect(value.state.stats.goals).toBe(0)
    expect(value.state.rating).toBeLessThan(SO_CHUTE.baseRating)
  })

  test('gols do plano continuam valendo no placar', () => {
    // Arrange: seed com pelo menos um gol de plano de cada lado
    const match = startMatch(1234, SO_CHUTE)
    const planTeamGoals = match.plan.filter((m) => m.kind === 'teamGoal').length
    const planOppGoals = match.plan.filter((m) => m.kind === 'opponentGoal').length

    // Act
    const { value } = simulateToEnd(match, SO_CHUTE, NEVER, DECIDE, createRng(7))

    // Assert: prob 0 → só os gols do plano entram (defesa nunca pega a falta deles)
    const oppFreeKicks = match.plan.filter((m) => m.kind === 'opponentFreeKick').length
    expect(value.state.score.team).toBe(planTeamGoals)
    expect(value.state.score.opponent).toBe(planOppGoals + oppFreeKicks)
  })

  test('emite um evento por lance e gol, com minuto dentro da partida', () => {
    // Arrange
    const match = startMatch(42, NO_DICE)

    // Act
    const { value } = simulateToEnd(match, NO_DICE, ALWAYS, DECIDE, createRng(7))

    // Assert
    const narrados = match.plan.filter(
      (m) => m.kind !== 'kickoff' && m.kind !== 'fulltime' && m.kind !== 'commentary',
    ).length
    expect(value.events).toHaveLength(narrados)
    for (const event of value.events) {
      expect(event.minute).toBeGreaterThanOrEqual(1)
      expect(event.minute).toBeLessThanOrEqual(90)
    }
  })

  test('com probabilidade 1, todo lance NÃO-decisão dá certo', () => {
    // Arrange
    const match = startMatch(42, SO_CHUTE)

    // Act
    const { value } = simulateToEnd(match, SO_CHUTE, ALWAYS, DECIDE, createRng(7))

    // Assert
    expect(value.events.every((event) => event.success)).toBe(true)
  })

  test('é determinístico para o mesmo rng', () => {
    // Arrange
    const match = startMatch(99, NO_DICE)
    const probs: AutoPlayProbs = { shotGoal: 0.5, defenseSave: 0.4 }

    // Act & Assert
    expect(simulateToEnd(match, NO_DICE, probs, DECIDE, createRng(5))).toEqual(
      simulateToEnd(match, NO_DICE, probs, DECIDE, createRng(5)),
    )
  })

  test('partida já terminada devolve estado intacto e zero eventos', () => {
    // Arrange
    const match = startMatch(42, NO_DICE)
    const done = simulateToEnd(match, NO_DICE, ALWAYS, DECIDE, createRng(7)).value.state

    // Act
    const again = simulateToEnd(done, NO_DICE, ALWAYS, DECIDE, createRng(8))

    // Assert
    expect(again.value.state).toEqual(done)
    expect(again.value.events).toHaveLength(0)
  })
})

describe('simulateToEnd: as decisões', () => {
  test('resolve toda decisão do plano e reporta o desfecho', () => {
    // Arrange
    const match = startMatch(42, NO_DICE)
    const decisoes = match.plan.filter((m) => m.kind === 'playerDecision').length

    // Act
    const { value } = simulateToEnd(match, NO_DICE, ALWAYS, DECIDE, createRng(7))

    // Assert
    expect(value.state.stats.decisions).toBe(decisoes)
    const eventos = value.events.filter((event) => event.kind === 'playerDecision')
    expect(eventos).toHaveLength(decisoes)
    for (const evento of eventos) {
      expect(evento.desfecho).toBeDefined()
    }
  })

  test('o perfil ousado marca e sofre mais que o cauteloso', () => {
    // Arrange: muitas partidas, porque cada decisão é um sorteio
    const config = { ...NO_DICE, playerDecisions: 3 }
    const medir = (perfil: AutoPlayDecision['perfil']) => {
      let meus = 0
      let deles = 0
      for (let seed = 0; seed < 400; seed++) {
        const { value } = simulateToEnd(
          startMatch(seed, config),
          config,
          NEVER,
          { contexto: CONTEXTO, perfil },
          createRng(seed * 31 + 1),
        )
        meus += value.state.stats.goals
        deles += value.state.score.opponent
      }
      return { meus, deles }
    }

    // Act
    const ousado = medir('ousado')
    const cauteloso = medir('cauteloso')

    // Assert: ousadia compra os dois lados do placar
    expect(ousado.meus).toBeGreaterThan(cauteloso.meus)
    expect(ousado.deles).toBeGreaterThan(cauteloso.deles)
  })

  test('a decisão mexe no placar — não é mais decorativa', () => {
    // Arrange: com chute e defesa zerados, todo gol MEU vem da decisão
    const config = { ...NO_DICE, playerDecisions: 4, playerShots: 0, playerFreeKicks: 0 }
    let comGol = 0

    // Act
    for (let seed = 0; seed < 200; seed++) {
      const { value } = simulateToEnd(
        startMatch(seed, config),
        config,
        NEVER,
        { contexto: CONTEXTO, perfil: 'ousado' },
        createRng(seed * 17 + 3),
      )
      if (value.state.stats.goals > 0) comGol++
    }

    // Assert
    expect(comGol).toBeGreaterThan(0)
  })

  test('elenco de ataque melhor converte mais as chances criadas', () => {
    // Arrange
    const config = { ...NO_DICE, playerDecisions: 4 }
    const assistencias = (attack: number): number => {
      let total = 0
      for (let seed = 0; seed < 300; seed++) {
        const { value } = simulateToEnd(
          startMatch(seed, config),
          config,
          NEVER,
          {
            contexto: { ...CONTEXTO, edges: { attack, defense: 0, midfield: 0 } },
            perfil: 'cauteloso',
          },
          createRng(seed * 13 + 5),
        )
        total += value.state.stats.assists
      }
      return total
    }

    // Act & Assert
    expect(assistencias(0.8)).toBeGreaterThan(assistencias(-0.8))
  })
})
