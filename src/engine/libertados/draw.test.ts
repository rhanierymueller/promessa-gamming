import { describe, expect, test } from 'vitest'
import { buildPots, drawGroups, nationOf, pickContinentalClubs } from './draw'
import { CONTINENTAL_CLUBS } from '../../data/continentalClubs'
import { createRng } from '../rng'
import { CONTINENTAL_SPOTS, GROUP_COUNT, GROUP_SIZE, POT_COUNT } from './types'

const BRASILEIROS = ['leoes-capital', 'mare-rubra', 'imperial', 'atlantico']

const edicao = (seed: number) => {
  const sorteados = pickContinentalClubs(CONTINENTAL_SPOTS, createRng(seed))
  return drawGroups([...BRASILEIROS, ...sorteados.value], BRASILEIROS[0], sorteados.next)
}

describe('sorteio da Copa Libertados', () => {
  test('nationOf devolve o país do clube continental e brasil para a pirâmide', () => {
    expect(nationOf('sa-charrua')).toBe('uruguai')
    expect(nationOf('leoes-capital')).toBe('brasil')
  })

  test('sorteia 28 clubes continentais distintos', () => {
    const { value } = pickContinentalClubs(CONTINENTAL_SPOTS, createRng(7))
    expect(value).toHaveLength(CONTINENTAL_SPOTS)
    expect(new Set(value).size).toBe(CONTINENTAL_SPOTS)
    for (const id of value) {
      expect(CONTINENTAL_CLUBS.some((club) => club.id === id)).toBe(true)
    }
  })

  test('os potes têm oito clubes cada, do mais forte para o mais fraco', () => {
    const { value } = edicao(3)
    const potes = buildPots(value.flat())
    expect(potes).toHaveLength(POT_COUNT)
    for (const pote of potes) expect(pote).toHaveLength(GROUP_SIZE * 2)
  })

  test('o sorteio monta 8 grupos de 4 sem repetir clube', () => {
    const { value: grupos } = edicao(11)
    expect(grupos).toHaveLength(GROUP_COUNT)
    for (const grupo of grupos) expect(grupo).toHaveLength(GROUP_SIZE)
    const todos = grupos.flat()
    expect(new Set(todos).size).toBe(GROUP_COUNT * GROUP_SIZE)
  })

  test('cada grupo recebe um clube de cada pote', () => {
    const { value: grupos } = edicao(23)
    const potes = buildPots(grupos.flat())
    for (const grupo of grupos) {
      const origem = grupo.map((id) => potes.findIndex((pote) => pote.includes(id)))
      expect([...origem].sort()).toEqual([0, 1, 2, 3])
    }
  })

  test('nenhum grupo tem dois clubes do mesmo país', () => {
    for (const seed of [1, 42, 99, 256, 1024]) {
      for (const grupo of edicao(seed).value) {
        const paises = grupo.map(nationOf)
        expect(new Set(paises).size).toBe(GROUP_SIZE)
      }
    }
  })

  test('a restrição de país vale em toda seed, não só nas escolhidas', () => {
    // Arrange: o algoritmo guloso original só falhava em algumas sementes e
    // sempre no último grupo da fila — uma varredura pega esse viés
    const violacoes: number[] = []

    // Act
    for (let seed = 0; seed < 60; seed++) {
      edicao(seed).value.forEach((grupo, indice) => {
        if (new Set(grupo.map(nationOf)).size !== GROUP_SIZE) violacoes.push(indice)
      })
    }

    // Assert
    expect(violacoes).toEqual([])
  })

  test('o clube do jogador abre o grupo A', () => {
    const { value: grupos } = edicao(5)
    expect(grupos[0][0]).toBe(BRASILEIROS[0])
  })

  test('mesma seed, mesmo sorteio', () => {
    expect(edicao(77).value).toEqual(edicao(77).value)
  })

  test('sem jogador, o sorteio funciona igual', () => {
    const sorteados = pickContinentalClubs(CONTINENTAL_SPOTS, createRng(9))
    const { value: grupos } = drawGroups([...BRASILEIROS, ...sorteados.value], null, sorteados.next)
    expect(grupos.flat()).toHaveLength(GROUP_COUNT * GROUP_SIZE)
  })

  test('jogador fora do pote mais forte não some do sorteio nem deixa vaga vazia', () => {
    /*
     * Arrange: 'aurora-paulista' tem força 3 e cai num pote baixo. Inferir o
     * pote do jogador pelo tamanho do grupo dava certo só quando ele estava no
     * pote 1 — nos outros casos um clube sumia e um `undefined` entrava no
     * lugar. Os quatro brasileiros do fixture padrão são todos força 5, então
     * nenhum outro teste alcança este caminho.
     */
    const classificados = ['leoes-capital', 'mare-rubra', 'imperial', 'aurora-paulista']
    const sorteados = pickContinentalClubs(CONTINENTAL_SPOTS, createRng(31))

    // Act
    const { value: grupos } = drawGroups(
      [...classificados, ...sorteados.value],
      'aurora-paulista',
      sorteados.next,
    )

    // Assert
    const todos = grupos.flat()
    expect(todos).toHaveLength(GROUP_COUNT * GROUP_SIZE)
    expect(todos.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(todos).size).toBe(GROUP_COUNT * GROUP_SIZE)
    expect(grupos[0][0]).toBe('aurora-paulista')
    for (const grupo of grupos) expect(grupo).toHaveLength(GROUP_SIZE)
  })
})
