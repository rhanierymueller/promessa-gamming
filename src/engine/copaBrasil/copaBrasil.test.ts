import { describe, expect, test } from 'vitest'
import { initialDivisions } from '../pyramid/pyramid'
import { createRng } from '../rng'
import {
  advanceCopaBrasil,
  copaBrasilAggregateLeadBeforeMatch,
  copaBrasilOpponentId,
  copaBrasilPlayerFixture,
  createCopaBrasil,
  simulateCopaBrasilEdition,
  stagePairs,
} from './copaBrasil'
import {
  COPA_BRASIL_TEAMS,
  isCopaBrasilRunning,
  KNOCKOUT_ORDER,
  MATCHES_PER_EDITION,
  copaBrasilMatchIndex,
  teamsInStage,
  type CopaBrasilState,
} from './types'

const divisions = initialDivisions()
const MEU = 'leoes-capital'

const edicao = (seed = 7, playerClubId: string | null = MEU): CopaBrasilState =>
  createCopaBrasil(seed, 1, playerClubId, divisions)

/** Joga a edição inteira pelo lado do jogador, sempre vencendo por 3×0. */
const vencerTudo = (state: CopaBrasilState): CopaBrasilState => {
  let current = state
  let rng = createRng(1)
  let guard = 0
  while (isCopaBrasilRunning(current.stage) && guard++ < 40) {
    const advanced = advanceCopaBrasil(current, 3, 0, rng, true)
    rng = advanced.next
    current = advanced.value.state
  }
  return current
}

describe('Copa do Brasil', () => {
  test('abre nos 16 avos com 32 clubes na chave', () => {
    const state = edicao()
    expect(state.stage).toBe('r32')
    expect(state.bracket).toHaveLength(COPA_BRASIL_TEAMS)
    expect(stagePairs(state, 'r32')).toHaveLength(16)
  })

  test('cada fase tem metade dos confrontos da anterior', () => {
    const state = edicao()
    expect(teamsInStage('r32')).toBe(32)
    expect(teamsInStage('r16')).toBe(16)
    expect(teamsInStage('quarter')).toBe(8)
    expect(teamsInStage('semi')).toBe(4)
    expect(teamsInStage('final')).toBe(2)
    expect(stagePairs(state, 'final')).toHaveLength(1)
  })

  test('o clube do jogador tem confronto na abertura', () => {
    const state = edicao()
    expect(copaBrasilPlayerFixture(state)).not.toBeNull()
    expect(copaBrasilOpponentId(state)).not.toBe(MEU)
  })

  test('ida e volta: o mando inverte no segundo jogo', () => {
    // Arrange
    const state = edicao()
    const ida = copaBrasilPlayerFixture(state)!

    // Act
    const volta = copaBrasilPlayerFixture({ ...state, round: 1 })!

    // Assert
    expect(volta.homeId).toBe(ida.awayId)
    expect(volta.awayId).toBe(ida.homeId)
  })

  test('vencer a ida não passa de fase: a volta ainda existe', () => {
    // Act
    const depois = advanceCopaBrasil(edicao(), 3, 0, createRng(2), true).value.state

    // Assert
    expect(depois.stage).toBe('r32')
    expect(depois.round).toBe(1)
  })

  test('a volta carrega o saldo da ida para decidir o agregado', () => {
    const depoisDaDerrota = advanceCopaBrasil(
      edicao(),
      0,
      1,
      createRng(2),
      false,
    ).value.state
    const depoisDaVitoria = advanceCopaBrasil(
      edicao(),
      2,
      0,
      createRng(2),
      true,
    ).value.state

    expect(copaBrasilAggregateLeadBeforeMatch(depoisDaDerrota)).toBe(-1)
    expect(copaBrasilAggregateLeadBeforeMatch(depoisDaVitoria)).toBe(2)
  })

  test('ganhar os dois jogos leva às oitavas', () => {
    // Arrange
    let state = edicao()

    // Act: ida e volta
    state = advanceCopaBrasil(state, 3, 0, createRng(2), true).value.state
    state = advanceCopaBrasil(state, 2, 0, createRng(3), true).value.state

    // Assert
    expect(state.stage).toBe('r16')
    expect(state.round).toBe(0)
  })

  test('perder o agregado elimina o jogador', () => {
    // Arrange
    let state = edicao()

    // Act: leva 0×3 nos dois jogos
    state = advanceCopaBrasil(state, 0, 3, createRng(2), false).value.state
    state = advanceCopaBrasil(state, 0, 3, createRng(3), false).value.state

    // Assert
    expect(state.stage).toBe('eliminated')
  })

  test('agregado empatado vai aos pênaltis, e quem ganha avança', () => {
    // Arrange
    let state = edicao()

    // Act: 1×1 nos dois jogos, pênaltis para o jogador
    state = advanceCopaBrasil(state, 1, 1, createRng(2), true).value.state
    state = advanceCopaBrasil(state, 1, 1, createRng(3), true).value.state

    // Assert
    expect(state.stage).toBe('r16')
  })

  test('ganhando tudo, o jogador é o campeão', () => {
    // Act
    const fim = vencerTudo(edicao())

    // Assert
    expect(fim.stage).toBe('champion')
    expect(fim.championId).toBe(MEU)
  })

  test('a campanha inteira tem dez jogos: cinco fases de ida e volta', () => {
    // Act
    const fim = vencerTudo(edicao())
    const meus = fim.results.filter(
      (match) => match.homeId === MEU || match.awayId === MEU,
    )

    // Assert
    expect(MATCHES_PER_EDITION).toBe(10)
    expect(meus).toHaveLength(10)
  })

  test('cada jogo tem um índice próprio no calendário, sem repetir', () => {
    const indices = KNOCKOUT_ORDER.flatMap((stage) => [
      copaBrasilMatchIndex(stage, 0),
      copaBrasilMatchIndex(stage, 1),
    ])
    expect(new Set(indices).size).toBe(MATCHES_PER_EDITION)
    expect(Math.max(...indices)).toBe(MATCHES_PER_EDITION - 1)
  })

  test('edição sem o jogador roda sozinha e acha um campeão', () => {
    // Act
    const fim = simulateCopaBrasilEdition(edicao(3, null), createRng(9)).value

    // Assert
    expect(fim.stage).toBe('champion')
    expect(fim.championId).not.toBeNull()
    expect(fim.bracket).toContain(fim.championId)
  })

  test('é determinística: mesma semente, mesma edição', () => {
    const a = simulateCopaBrasilEdition(edicao(4, null), createRng(5)).value
    const b = simulateCopaBrasilEdition(edicao(4, null), createRng(5)).value
    expect(a.championId).toBe(b.championId)
    expect(a.results).toEqual(b.results)
  })

  test('os rivais também avançam: a chave não fica com buraco', () => {
    // Act
    const fim = simulateCopaBrasilEdition(edicao(6, null), createRng(8)).value

    // Assert: a final teve dois times de verdade
    const finais = fim.results.filter((match) => match.stage === 'final')
    expect(finais).toHaveLength(2)
    expect(finais[0].homeId).not.toBe(finais[0].awayId)
  })
})
