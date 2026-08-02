import { describe, expect, test } from 'vitest'
import { initialDivisions } from '../pyramid/pyramid'
import { createRng } from '../rng'
import { copaBrasilBracket } from './bracket'
import { advanceCopaBrasil, createCopaBrasil, simulateCopaBrasilEdition } from './copaBrasil'
import { isCopaBrasilRunning, KNOCKOUT_ORDER, type CopaBrasilState } from './types'

const divisions = initialDivisions()
const MEU = 'leoes-capital'

const edicao = (seed = 7, playerClubId: string | null = MEU): CopaBrasilState =>
  createCopaBrasil(seed, 1, playerClubId, divisions)

describe('chaveamento da Copa do Brasil', () => {
  test('tem uma fase para cada etapa do mata-mata', () => {
    const bracket = copaBrasilBracket(edicao())
    expect(bracket).toHaveLength(KNOCKOUT_ORDER.length)
    expect(bracket[0].ties).toHaveLength(16)
    expect(bracket[bracket.length - 1].ties).toHaveLength(1)
  })

  test('confronto não disputado não mostra placar nem vencedor', () => {
    const primeiro = copaBrasilBracket(edicao())[0].ties[0]
    expect(primeiro.homeGoals).toBeUndefined()
    expect(primeiro.winnerId).toBeUndefined()
  })

  test('a ida sozinha ainda não decide — o agregado precisa dos dois jogos', () => {
    // Arrange + Act: só a ida
    const state = advanceCopaBrasil(edicao(), 3, 0, createRng(2), true).value.state
    const meu = copaBrasilBracket(state)[0].ties.find(
      (tie) => tie.homeId === MEU || tie.awayId === MEU,
    )!

    // Assert
    expect(meu.winnerId).toBeUndefined()
  })

  test('com ida e volta, o agregado aparece e o vencedor está marcado', () => {
    // Arrange
    let state = edicao()
    state = advanceCopaBrasil(state, 3, 0, createRng(2), true).value.state
    state = advanceCopaBrasil(state, 1, 0, createRng(3), true).value.state

    // Act
    const meu = copaBrasilBracket(state)[0].ties.find(
      (tie) => tie.homeId === MEU || tie.awayId === MEU,
    )!

    // Assert: 4×0 no agregado, e quem passou fui eu
    expect(meu.winnerId).toBe(MEU)
    const meusGols = meu.homeId === MEU ? meu.homeGoals : meu.awayGoals
    expect(meusGols).toBe(4)
  })

  test('decisão nos pênaltis fica registrada — o agregado sozinho mentiria', () => {
    // Arrange: 1×1 nos dois jogos
    let state = edicao()
    state = advanceCopaBrasil(state, 1, 1, createRng(2), true).value.state
    state = advanceCopaBrasil(state, 1, 1, createRng(3), true).value.state

    // Act
    const meu = copaBrasilBracket(state)[0].ties.find(
      (tie) => tie.homeId === MEU || tie.awayId === MEU,
    )!

    // Assert
    expect(meu.onPenalties).toBe(true)
    expect(meu.winnerId).toBe(MEU)
  })

  test('edição inteira: toda fase fecha com vencedor definido', () => {
    // Act
    const fim = simulateCopaBrasilEdition(edicao(4, null), createRng(9)).value
    expect(isCopaBrasilRunning(fim.stage)).toBe(false)

    // Assert
    for (const stage of copaBrasilBracket(fim)) {
      for (const tie of stage.ties) {
        expect(tie.winnerId).toBeDefined()
      }
    }
  })

  test('o campeão é quem venceu a final', () => {
    const fim = simulateCopaBrasilEdition(edicao(6, null), createRng(8)).value
    const bracket = copaBrasilBracket(fim)
    expect(bracket[bracket.length - 1].ties[0].winnerId).toBe(fim.championId)
  })
})
