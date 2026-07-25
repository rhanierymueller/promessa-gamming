import { describe, expect, test } from 'vitest'
import { CLUBS } from '../../data/clubs'
import { squadPlayersFor, USER_PLAYER_ID } from '../squad/players'
import { createSave, recordMatch, type MatchRecord, type PlayerSave } from '../../state/save'
import { matchQuotes, pickVariant } from './quotes'

const base = (): PlayerSave =>
  createSave({ playerName: 'Mueller', teamName: 'Galáticos FC', nationalityId: 'brasil' })!

const played = (save: PlayerSave, teamGoals: number, opponentGoals: number, rating = 7): PlayerSave =>
  recordMatch(save, {
    opponentId: CLUBS.find((club) => club.id !== save.clubId)!.id,
    teamGoals,
    opponentGoals,
    rating,
    playerGoals: 1,
    playedAt: 1_700_000_000,
    competition: 'liga',
  } satisfies MatchRecord)

describe('pickVariant', () => {
  test('a mesma semente devolve sempre a mesma fala', () => {
    const opcoes = ['a', 'b', 'c', 'd']
    expect(pickVariant(opcoes, 12345)).toBe(pickVariant(opcoes, 12345))
  })

  test('sementes diferentes espalham pelas opções', () => {
    const opcoes = ['a', 'b', 'c', 'd']
    const vistos = new Set(Array.from({ length: 60 }, (_, i) => pickVariant(opcoes, i * 7919)))
    expect(vistos.size).toBeGreaterThan(1)
  })

  test('lista vazia não quebra', () => {
    expect(pickVariant([], 1)).toBeNull()
  })
})

describe('declarações de pós-jogo', () => {
  test('sem partida disputada não há declaração', () => {
    expect(matchQuotes(base())).toHaveLength(0)
  })

  test('depois do jogo aparecem falas de gente de verdade dos elencos', () => {
    // Arrange
    const save = played(base(), 3, 1)

    // Act
    const quotes = matchQuotes(save)

    // Assert
    expect(quotes.length).toBeGreaterThan(0)
    for (const quote of quotes) {
      expect(quote.speaker.name.length).toBeGreaterThan(0)
      expect(quote.speaker.playerId.length).toBeGreaterThan(0)
      expect(quote.body.length).toBeGreaterThan(20)
    }
  })

  test('quem fala existe mesmo no elenco do clube citado', () => {
    // Arrange
    const save = played(base(), 2, 0)

    // Act
    const quotes = matchQuotes(save)

    // Assert
    for (const quote of quotes) {
      const club = CLUBS.find((entry) => entry.id === quote.speaker.clubId)!
      const nomes = squadPlayersFor(club, save.careerYear).map((player) => player.id)
      expect(nomes).toContain(quote.speaker.playerId)
    }
  })

  test('o SEU craque nunca é o entrevistado (a fala é sobre ele)', () => {
    for (const [gols, sofridos] of [[3, 0], [0, 3], [1, 1]] as const) {
      const save = played(base(), gols, sofridos)
      for (const quote of matchQuotes(save)) {
        expect(quote.speaker.playerId).not.toBe(USER_PLAYER_ID)
      }
    }
  })

  test('vitória, derrota e empate rendem falas diferentes', () => {
    const vitoria = matchQuotes(played(base(), 3, 0)).map((q) => q.body).join()
    const derrota = matchQuotes(played(base(), 0, 3)).map((q) => q.body).join()
    const empate = matchQuotes(played(base(), 1, 1)).map((q) => q.body).join()
    expect(new Set([vitoria, derrota, empate]).size).toBe(3)
  })

  test('é determinístico: reabrir a Home não troca a entrevista', () => {
    const save = played(base(), 2, 1)
    expect(matchQuotes(save)).toEqual(matchQuotes(save))
  })

  test('sempre há um lado do adversário falando também', () => {
    // Arrange
    const save = played(base(), 2, 1)

    // Act
    const clubes = new Set(matchQuotes(save).map((quote) => quote.speaker.clubId))

    // Assert: um do meu time e um do rival
    expect(clubes.size).toBe(2)
    expect(clubes).toContain(save.clubId)
  })
})
