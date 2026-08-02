import { describe, expect, test } from 'vitest'
import {
  advanceLibertados,
  createLibertados,
  libertadosAggregateLeadBeforeMatch,
  simulateEdition,
} from './libertados'
import { playerFixture, playerOpponentId } from './fixtures'
import { createRng } from '../rng'
import { GROUP_COUNT, GROUP_ROUNDS, GROUP_SIZE, isLibertadosRunning, type LibertadosState } from './types'

const BRASILEIROS = ['leoes-capital', 'mare-rubra', 'imperial', 'atlantico']

const nova = (seed = 42, playerClubId: string | null = BRASILEIROS[0]): LibertadosState =>
  createLibertados(seed, 6, playerClubId, BRASILEIROS)

/** Joga a edição inteira com o jogador vencendo por 2x0 sempre. */
const vencerTudo = (state: LibertadosState): LibertadosState => {
  let current = state
  let rng = createRng(1234)
  let guard = 0
  while (isLibertadosRunning(current.stage) && guard++ < 40) {
    const advanced = advanceLibertados(current, 2, 0, rng)
    current = advanced.value.state
    rng = advanced.next
  }
  return current
}

describe('edição da Copa Libertados', () => {
  test('nasce com 32 clubes em 8 grupos, o jogador na frente do grupo A', () => {
    const state = nova()
    expect(state.groups).toHaveLength(GROUP_COUNT)
    expect(state.groups.flat()).toHaveLength(GROUP_COUNT * GROUP_SIZE)
    expect(state.groups[0][0]).toBe(BRASILEIROS[0])
    expect(state.stage).toBe('groups')
    expect(state.championId).toBeNull()
  })

  test('os quatro brasileiros classificados estão na chave', () => {
    const todos = nova().groups.flat()
    for (const id of BRASILEIROS) expect(todos).toContain(id)
  })

  test('mesma seed, mesma edição', () => {
    expect(nova(88)).toEqual(nova(88))
  })

  test('cada rodada de grupo registra os 16 jogos da data', () => {
    const { value } = advanceLibertados(nova(), 1, 0, createRng(5))
    expect(value.state.results).toHaveLength(GROUP_COUNT * (GROUP_SIZE / 2))
    expect(value.state.round).toBe(1)
    expect(value.state.stage).toBe('groups')
  })

  test('vencendo tudo, o jogador passa dos grupos ao mata-mata', () => {
    let state = nova()
    let rng = createRng(3)
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceLibertados(state, 3, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    expect(state.stage).toBe('r16')
    expect(state.round).toBe(0)
  })

  test('perdendo todos os jogos de grupo, o jogador é eliminado e o torneio ainda tem campeão', () => {
    let state = nova()
    let rng = createRng(4)
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceLibertados(state, 0, 4, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    expect(state.stage).toBe('eliminated')
    expect(state.championId).not.toBeNull()
    expect(state.championId).not.toBe(BRASILEIROS[0])
  })

  test('o mata-mata é ida e volta: só depois da volta a fase vira', () => {
    let state = nova()
    let rng = createRng(3)
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceLibertados(state, 3, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    const ida = advanceLibertados(state, 1, 0, rng)
    expect(ida.value.state.stage).toBe('r16')
    expect(ida.value.state.round).toBe(1)
    const volta = advanceLibertados(ida.value.state, 1, 0, ida.next)
    expect(volta.value.state.stage).toBe('quarter')
    expect(volta.value.state.round).toBe(0)
  })

  test('a volta carrega o saldo da ida para decidir o agregado', () => {
    let state = nova()
    let rng = createRng(3)
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceLibertados(state, 3, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }

    const ida = advanceLibertados(state, 0, 2, rng).value.state

    expect(libertadosAggregateLeadBeforeMatch(ida)).toBe(-2)
  })

  test('agregado empatado no mata-mata vai aos pênaltis', () => {
    let state = nova()
    let rng = createRng(3)
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceLibertados(state, 3, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    const ida = advanceLibertados(state, 0, 1, rng)
    const volta = advanceLibertados(ida.value.state, 1, 0, ida.next, true)
    expect(volta.value.playerPenaltyWon).toBe(true)
    expect(volta.value.state.stage).toBe('quarter')
  })

  test('vencer a final dá o título ao jogador', () => {
    const final = vencerTudo(nova())
    expect(final.stage).toBe('champion')
    expect(final.championId).toBe(BRASILEIROS[0])
  })

  test('perder a final dá a taça ao adversário, não deixa a edição sem campeão', () => {
    // Arrange: vence tudo até a volta da final
    let state = nova()
    let rng = createRng(1234)
    let guard = 0
    while (!(state.stage === 'final' && state.round === 1) && guard++ < 40) {
      const advanced = advanceLibertados(state, 2, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    const adversario = playerOpponentId(state)

    // Act: leva 0x4 na volta, revertendo o agregado
    const { value } = advanceLibertados(state, 0, 4, rng)

    // Assert
    expect(value.state.stage).toBe('eliminated')
    expect(value.state.championId).toBe(adversario)
  })

  test('eliminado na semifinal, a edição segue e entrega a taça a outro', () => {
    let state = nova()
    let rng = createRng(1234)
    let guard = 0
    while (state.stage !== 'semi' && guard++ < 40) {
      const advanced = advanceLibertados(state, 2, 0, rng)
      state = advanced.value.state
      rng = advanced.next
    }
    const ida = advanceLibertados(state, 0, 3, rng)
    const volta = advanceLibertados(ida.value.state, 0, 3, ida.next)

    expect(volta.value.state.stage).toBe('eliminated')
    expect(volta.value.state.championId).not.toBeNull()
    expect(volta.value.state.championId).not.toBe(BRASILEIROS[0])
  })

  test('o jogo do jogador sempre tem adversário enquanto o torneio roda', () => {
    let state = nova()
    let rng = createRng(9)
    let guard = 0
    while (isLibertadosRunning(state.stage) && guard++ < 40) {
      expect(playerFixture(state)).not.toBeNull()
      expect(playerOpponentId(state)).not.toBe(BRASILEIROS[0])
      const advanced = advanceLibertados(state, 2, 1, rng)
      state = advanced.value.state
      rng = advanced.next
    }
  })

  test('edição sem jogador roda sozinha e produz um campeão', () => {
    const { value } = simulateEdition(nova(21, null), createRng(77))
    expect(value.stage).toBe('champion')
    expect(value.championId).not.toBeNull()
    expect(value.groups.flat()).toContain(value.championId!)
  })

  test('simulação é determinística', () => {
    const a = simulateEdition(nova(21, null), createRng(77)).value
    const b = simulateEdition(nova(21, null), createRng(77)).value
    expect(a.championId).toBe(b.championId)
  })
})
