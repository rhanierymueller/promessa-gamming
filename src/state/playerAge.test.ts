import { describe, expect, test } from 'vitest'
import { userAsSquadPlayer, squadPlayersFor, USER_SQUAD_INDEX } from '../engine/squad/players'
import { CLUBS } from '../data/clubs'
import { createSave, currentPlayerAge } from './save'

/**
 * Uma idade só. O Perfil mostrava a idade da CRIAÇÃO (nunca envelhecia) e o
 * elenco mostrava a idade do jogador gerado no slot 9 — dois números que
 * discordavam na mesma carreira.
 */

const base = (playerAge: number) =>
  createSave({ playerName: 'Craque', teamName: 'Galáticos FC', nationalityId: 'brasil', playerAge })!

describe('currentPlayerAge', () => {
  test('na primeira temporada é a idade da criação', () => {
    expect(currentPlayerAge(base(20))).toBe(20)
  })

  test('envelhece uma vez por temporada', () => {
    // Arrange
    const save = base(18)

    // Act + Assert
    expect(currentPlayerAge({ ...save, careerYear: 2 })).toBe(19)
    expect(currentPlayerAge({ ...save, careerYear: 5 })).toBe(22)
    expect(currentPlayerAge({ ...save, careerYear: 15 })).toBe(32)
  })
})

describe('a idade do craque no elenco bate com o Perfil', () => {
  test('o elenco usa a MINHA idade, não a do jogador gerado no slot', () => {
    // Arrange: o jogador gerado nesse slot tem idade própria, que não é a minha
    const save = { ...base(20), careerYear: 3 }
    const gerado = squadPlayersFor(CLUBS[0], save.careerYear)[USER_SQUAD_INDEX]

    // Act
    const eu = userAsSquadPlayer(
      gerado,
      save.playerName,
      save.attributes,
      save.playerPosition,
      currentPlayerAge(save),
    )

    // Assert
    expect(eu.age).toBe(currentPlayerAge(save))
    expect(eu.age).toBe(22)
  })

  test('sem idade informada, mantém a do jogador base (compatibilidade)', () => {
    const gerado = squadPlayersFor(CLUBS[0])[USER_SQUAD_INDEX]
    const eu = userAsSquadPlayer(gerado, 'X', { finalizacao: 5, passe: 5, cobranca: 5, defesa: 5 })
    expect(eu.age).toBe(gerado.age)
  })
})
