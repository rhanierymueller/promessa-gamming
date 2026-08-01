import { describe, expect, test } from 'vitest'
import { groupFixtures, knockoutPairs, playerFixture, tieFixture, tieWinner } from './fixtures'
import { GROUP_ROUNDS, type LibertadosMatch, type LibertadosState } from './types'

const GRUPO = ['a', 'b', 'c', 'd']

const estado = (over: Partial<LibertadosState> = {}): LibertadosState => ({
  seed: 1,
  year: 5,
  playerClubId: 'a',
  groups: [GRUPO, ['e', 'f', 'g', 'h'], ['i', 'j', 'k', 'l'], ['m', 'n', 'o', 'p'],
           ['q', 'r', 's', 't'], ['u', 'v', 'w', 'x'], ['y', 'z', 'a1', 'b1'], ['c1', 'd1', 'e1', 'f1']],
  stage: 'groups',
  round: 0,
  results: [],
  championId: null,
  ...over,
})

const jogo = (over: Partial<LibertadosMatch>): LibertadosMatch => ({
  stage: 'r16', round: 0, homeId: 'x', awayId: 'y', homeGoals: 0, awayGoals: 0, ...over,
})

describe('confrontos da Copa Libertados', () => {
  test('a fase de grupos tem seis rodadas: returno é o turno com mando trocado', () => {
    expect(GROUP_ROUNDS).toBe(6)
    for (let round = 0; round < 3; round++) {
      const ida = groupFixtures(GRUPO, round)
      const volta = groupFixtures(GRUPO, round + 3)
      expect(volta).toEqual(ida.map((f) => ({ homeId: f.awayId, awayId: f.homeId })))
    }
  })

  test('todo clube joga contra todos os outros duas vezes, uma em casa', () => {
    const jogos = Array.from({ length: GROUP_ROUNDS }, (_, r) => groupFixtures(GRUPO, r)).flat()
    expect(jogos).toHaveLength(12)
    for (const time of GRUPO) {
      expect(jogos.filter((f) => f.homeId === time)).toHaveLength(3)
      expect(jogos.filter((f) => f.awayId === time)).toHaveLength(3)
    }
  })

  test('o cabeça da chave decide em casa: ida fora, volta em casa', () => {
    expect(tieFixture(['cabeca', 'desafiante'], 0)).toEqual({ homeId: 'desafiante', awayId: 'cabeca' })
    expect(tieFixture(['cabeca', 'desafiante'], 1)).toEqual({ homeId: 'cabeca', awayId: 'desafiante' })
  })

  test('quem passa é o agregado dos dois jogos', () => {
    // cabeça perde por 1 fora e ganha por 3 em casa: 3x1 no agregado
    const state = estado({
      stage: 'r16',
      results: [
        jogo({ round: 0, homeId: 'desafiante', awayId: 'cabeca', homeGoals: 1, awayGoals: 0 }),
        jogo({ round: 1, homeId: 'cabeca', awayId: 'desafiante', homeGoals: 3, awayGoals: 0 }),
      ],
    })
    expect(tieWinner(state, 'r16', ['cabeca', 'desafiante'])).toBe('cabeca')
  })

  test('gol fora não vale nada: 1x0 fora e 0x1 em casa vai aos pênaltis', () => {
    const state = estado({
      stage: 'r16',
      results: [
        jogo({ round: 0, homeId: 'desafiante', awayId: 'cabeca', homeGoals: 0, awayGoals: 1 }),
        jogo({ round: 1, homeId: 'cabeca', awayId: 'desafiante', homeGoals: 0, awayGoals: 1, penaltyWinnerId: 'desafiante' }),
      ],
    })
    expect(tieWinner(state, 'r16', ['cabeca', 'desafiante'])).toBe('desafiante')
  })

  test('confronto sem os dois jogos ainda não tem vencedor', () => {
    const state = estado({
      stage: 'r16',
      results: [jogo({ round: 0, homeId: 'desafiante', awayId: 'cabeca', homeGoals: 2, awayGoals: 0 })],
    })
    expect(tieWinner(state, 'r16', ['cabeca', 'desafiante'])).toBeNull()
  })

  test('agregado empatado sem pênaltis registrados não elege ninguém', () => {
    // Arrange: 1x1 nos dois jogos e nenhum desempate gravado — estado que só
    // existe por defeito de quem gravou o resultado. Devolver o cabeça por
    // padrão inventaria um classificado que não venceu nada.
    const state = estado({
      stage: 'r16',
      results: [
        jogo({ round: 0, homeId: 'desafiante', awayId: 'cabeca', homeGoals: 1, awayGoals: 1 }),
        jogo({ round: 1, homeId: 'cabeca', awayId: 'desafiante', homeGoals: 1, awayGoals: 1 }),
      ],
    })

    // Act & Assert
    expect(tieWinner(state, 'r16', ['cabeca', 'desafiante'])).toBeNull()
  })

  test('fase seguinte só tem chave quando a anterior inteira terminou', () => {
    /*
     * Arrange: oitavas com um único confronto decidido. Se as quartas
     * montassem a chave com a lista encurtada, os pares sairiam desalinhados e
     * cruzariam clubes de metades diferentes da chave.
     */
    const state = estado({
      stage: 'quarter',
      results: [
        jogo({ stage: 'r16', round: 0, homeId: 'f', awayId: 'a', homeGoals: 0, awayGoals: 2 }),
        jogo({ stage: 'r16', round: 1, homeId: 'a', awayId: 'f', homeGoals: 3, awayGoals: 0 }),
      ],
    })

    // Act & Assert
    expect(knockoutPairs(state, 'quarter')).toEqual([])
  })

  test('as oitavas cruzam 1º de um grupo com 2º do vizinho', () => {
    // grupos vazios: computeStandings devolve a ordem de entrada, então o 1º do
    // grupo A é 'a' e o 2º do grupo B é 'f'
    const pares = knockoutPairs(estado({ stage: 'r16' }), 'r16')
    expect(pares).toHaveLength(8)
    expect(pares[0]).toEqual(['a', 'f'])
    expect(new Set(pares.flat()).size).toBe(16)
  })

  test('o jogo do jogador sai do grupo dele na rodada atual', () => {
    const fixture = playerFixture(estado({ stage: 'groups', round: 0 }))
    expect(fixture).not.toBeNull()
    expect([fixture!.homeId, fixture!.awayId]).toContain('a')
  })

  test('torneio encerrado não tem jogo do jogador', () => {
    expect(playerFixture(estado({ stage: 'eliminated' }))).toBeNull()
    expect(playerFixture(estado({ stage: 'champion' }))).toBeNull()
  })
})
