import { describe, expect, test } from 'vitest'
import { PERFECT_GAMES_FOR_PERK, PERFECT_RATING } from '../engine/career/perks'
import { choosePerk, createSave, recordMatch, type MatchRecord, type PlayerSave } from './save'

/**
 * A habilidade é a recompensa mais rara do jogo: só sai depois de CINCO
 * atuações nota 10. Escolher zera a contagem e o ciclo recomeça.
 */

const base = (): PlayerSave =>
  createSave({ playerName: 'Craque', teamName: 'Galáticos FC', nationalityId: 'brasil' })!

const match = (rating: number): MatchRecord => ({
  opponentId: 'leoes-capital',
  teamGoals: 1,
  opponentGoals: 0,
  rating,
  playerGoals: 1,
  playedAt: 0,
  competition: 'liga',
})

const playRatings = (save: PlayerSave, ratings: readonly number[]): PlayerSave =>
  ratings.reduce((acc, rating) => recordMatch(acc, match(rating)), save)

describe('oferta de habilidade', () => {
  test('nota alta sozinha NÃO oferece habilidade (antes bastava 8)', () => {
    // Arrange + Act
    const after = playRatings(base(), [8, 8, 9, 9.5, 9.9])

    // Assert
    expect(after.perkOffer).toBeNull()
    expect(after.perks).toHaveLength(0)
  })

  test(`só na ${PERFECT_GAMES_FOR_PERK}ª nota ${PERFECT_RATING} a oferta aparece`, () => {
    // Arrange
    let save = base()

    // Act + Assert: as quatro primeiras não abrem nada
    for (let i = 1; i < PERFECT_GAMES_FOR_PERK; i++) {
      save = recordMatch(save, match(PERFECT_RATING))
      expect(save.perkOffer).toBeNull()
    }
    save = recordMatch(save, match(PERFECT_RATING))
    expect(save.perkOffer).not.toBeNull()
    expect(save.perkOffer!.options.length).toBeGreaterThan(0)
  })

  test('notas 10 intercaladas com jogos ruins ainda contam', () => {
    // Arrange: o contador é de atuações perfeitas, não de sequência
    const ratings = [PERFECT_RATING, 4, PERFECT_RATING, 3, PERFECT_RATING, 6, PERFECT_RATING, 5, PERFECT_RATING]

    // Act
    const after = playRatings(base(), ratings)

    // Assert
    expect(after.perkOffer).not.toBeNull()
  })

  test('escolher a habilidade ZERA a contagem — o próximo ciclo recomeça do zero', () => {
    // Arrange
    let save = playRatings(base(), Array(PERFECT_GAMES_FOR_PERK).fill(PERFECT_RATING))
    const offered = save.perkOffer!.options[0]

    // Act
    save = choosePerk(save, offered)

    // Assert
    expect(save.perks).toContain(offered)
    expect(save.perkOffer).toBeNull()

    // e quatro notas 10 novas não bastam para a próxima
    save = playRatings(save, Array(PERFECT_GAMES_FOR_PERK - 1).fill(PERFECT_RATING))
    expect(save.perkOffer).toBeNull()
    save = recordMatch(save, match(PERFECT_RATING))
    expect(save.perkOffer).not.toBeNull()
  })

  test('com oferta aberta, novas notas 10 não empilham ofertas', () => {
    // Arrange
    let save = playRatings(base(), Array(PERFECT_GAMES_FOR_PERK).fill(PERFECT_RATING))
    const first = save.perkOffer

    // Act
    save = playRatings(save, [PERFECT_RATING, PERFECT_RATING])

    // Assert
    expect(save.perkOffer).toEqual(first)
  })

  test('a oferta nunca repete uma habilidade já conquistada', () => {
    // Arrange
    let save = playRatings(base(), Array(PERFECT_GAMES_FOR_PERK).fill(PERFECT_RATING))
    const taken = save.perkOffer!.options[0]
    save = choosePerk(save, taken)

    // Act
    save = playRatings(save, Array(PERFECT_GAMES_FOR_PERK).fill(PERFECT_RATING))

    // Assert
    expect(save.perkOffer!.options).not.toContain(taken)
  })

  test('título e acesso NÃO abrem escolha de habilidade por conta própria', () => {
    // Arrange: campeão e promovido eram marcos que ofereciam perk
    const after = playRatings(base(), [9, 9, 9])

    // Assert
    expect(after.perkOffer).toBeNull()
  })
})
