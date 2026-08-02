import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { advanceLibertados, createLibertados } from './libertados'
import { libertadosScorers } from './scorers'

const BRASILEIROS = ['leoes-capital', 'mare-rubra', 'imperial', 'atlantico']

/** Joga algumas rodadas de grupo para haver gols na edição. */
const comGols = () => {
  let state = createLibertados(42, 6, BRASILEIROS[0], BRASILEIROS)
  let rng = createRng(3)
  for (let i = 0; i < 3; i++) {
    const step = advanceLibertados(state, 3, 1, rng)
    state = step.value.state
    rng = step.next
  }
  return state
}

describe('artilharia da Copa Libertados', () => {
  const state = comGols()
  const base = { state, careerYear: 4, playerName: 'Mueller', userGoals: 5 }

  test('lista sai ordenada do maior para o menor', () => {
    // Arrange: edição com gols já registrados (base)

    // Act
    const rows = libertadosScorers(base)

    // Assert
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].goals).toBeGreaterThanOrEqual(rows[i].goals)
    }
  })

  test('os SEUS gols entram inteiros — são fato, não sorteio', () => {
    // Arrange/Act
    const eu = libertadosScorers(base).find((row) => row.isUser)

    // Assert
    expect(eu?.goals).toBe(5)
    expect(eu?.name).toBe('Mueller')
  })

  test('ninguém aparece com zero gol', () => {
    // Act
    const rows = libertadosScorers(base)

    // Assert
    for (const row of rows) expect(row.goals).toBeGreaterThan(0)
  })

  test('a soma dos gols distribuídos de um clube bate com os gols que ele fez', () => {
    // Arrange: um clube que NÃO é o do jogador — sem gol "fato" misturado
    const rival = state.groups[1][0]
    const totalDoRival = state.results
      .filter((match) => match.homeId === rival || match.awayId === rival)
      .reduce((sum, match) => sum + (match.homeId === rival ? match.homeGoals : match.awayGoals), 0)

    // Act
    const golsDoRival = libertadosScorers(base, 99)
      .filter((row) => row.clubId === rival)
      .reduce((sum, row) => sum + row.goals, 0)

    // Assert
    expect(golsDoRival).toBe(totalDoRival)
  })

  test('os gols repartidos do seu clube não passam do que ele marcou', () => {
    // Arrange
    const meuClube = BRASILEIROS[0]
    const totalDoMeu = state.results
      .filter((match) => match.homeId === meuClube || match.awayId === meuClube)
      .reduce((sum, match) => sum + (match.homeId === meuClube ? match.homeGoals : match.awayGoals), 0)

    // Act
    const golsDoMeu = libertadosScorers(base, 99)
      .filter((row) => row.clubId === meuClube)
      .reduce((sum, row) => sum + row.goals, 0)

    // Assert
    expect(golsDoMeu).toBeLessThanOrEqual(totalDoMeu)
  })

  test('é determinístico: mesma edição, mesma artilharia', () => {
    // Act
    const primeira = libertadosScorers(base)
    const segunda = libertadosScorers(base)

    // Assert
    expect(primeira).toEqual(segunda)
  })

  test('a lista respeita o limite pedido', () => {
    // Act
    const rows = libertadosScorers(base, 3)

    // Assert
    expect(rows.length).toBeLessThanOrEqual(3)
  })

  test('edição sem jogo ainda não tem artilheiro', () => {
    // Arrange
    const nova = createLibertados(42, 6, BRASILEIROS[0], BRASILEIROS)

    // Act
    const rows = libertadosScorers({ ...base, state: nova, userGoals: 0 })

    // Assert
    expect(rows).toEqual([])
  })
})
