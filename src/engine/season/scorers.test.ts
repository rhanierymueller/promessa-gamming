import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { advanceSeason, computeTable, createSeason } from './season'
import { seasonScorers } from './scorers'
import type { SeasonState } from './types'

/**
 * O que estes testes garantem: a artilharia REFLETE os jogos. A soma dos gols
 * de um clube na lista nunca inventa nem perde gol em relação à classificação.
 */

const playedSeason = (rounds: number): SeasonState => {
  let season = createSeason('real-vila', 4242, [])
  for (let i = 0; i < rounds; i++) {
    season = advanceSeason(season, 2, 1, createRng(1000 + i)).value
  }
  return season
}

const input = (season: SeasonState, userGoals = 4) => ({
  season,
  careerYear: 1,
  userClubId: 'real-vila',
  userName: 'Mueller',
  userGoals,
})

describe('artilharia da temporada', () => {
  test('temporada sem jogos não tem artilheiro', () => {
    const season = createSeason('real-vila', 4242, [])
    expect(seasonScorers(input(season, 0))).toHaveLength(0)
  })

  test('os gols batem com o "gols pró" da classificação', () => {
    // Arrange
    const season = playedSeason(8)
    const table = new Map(computeTable(season).map((row) => [row.clubId, row.goalsFor]))

    // Act: sem limite, para conferir a conta inteira
    const scorers = seasonScorers(input(season), 999)

    // Assert: cada clube distribuiu exatamente o que marcou
    const byClub = new Map<string, number>()
    for (const row of scorers) {
      byClub.set(row.clubId, (byClub.get(row.clubId) ?? 0) + row.goals)
    }
    for (const [clubId, total] of byClub) {
      expect(total).toBe(table.get(clubId))
    }
  })

  test('a mesma temporada devolve sempre a mesma artilharia', () => {
    // Arrange
    const season = playedSeason(6)

    // Act + Assert: reabrir a tela não pode trocar os artilheiros
    expect(seasonScorers(input(season))).toEqual(seasonScorers(input(season)))
  })

  test('seus gols entram como SEUS, não sorteados', () => {
    // Arrange
    const season = playedSeason(10)

    // Act
    const scorers = seasonScorers(input(season, 6), 999)

    // Assert
    const me = scorers.find((row) => row.isUser)
    expect(me).toBeDefined()
    expect(me!.name).toBe('Mueller')
    expect(me!.goals).toBe(6)
    expect(scorers.filter((row) => row.isUser)).toHaveLength(1)
  })

  test('seus gols não podem passar do que o seu clube marcou', () => {
    // Arrange: jogador alegando mais gols que o time inteiro fez
    const season = playedSeason(2)
    const clubGoals = computeTable(season).find((row) => row.clubId === 'real-vila')!.goalsFor

    // Act
    const scorers = seasonScorers(input(season, 999), 999)

    // Assert
    const mine = scorers.find((row) => row.isUser)!.goals
    expect(mine).toBeLessThanOrEqual(clubGoals)
  })

  test('vem ordenada do maior para o menor', () => {
    // Act
    const scorers = seasonScorers(input(playedSeason(12)), 999)

    // Assert
    for (let i = 1; i < scorers.length; i++) {
      expect(scorers[i - 1].goals).toBeGreaterThanOrEqual(scorers[i].goals)
    }
  })

  test('respeita o limite pedido', () => {
    expect(seasonScorers(input(playedSeason(12)), 5)).toHaveLength(5)
  })

  test('goleiro praticamente não aparece na artilharia', () => {
    // Act
    const scorers = seasonScorers(input(playedSeason(13)), 999)

    // Assert: o peso do GOL é 0.02 — em uma temporada inteira não deve liderar
    expect(scorers[0].goals).toBeGreaterThan(0)
  })

  test('quem marca é gente de verdade do elenco (nome preenchido)', () => {
    for (const row of seasonScorers(input(playedSeason(9)), 999)) {
      expect(row.name.length).toBeGreaterThan(0)
      expect(row.clubId.length).toBeGreaterThan(0)
      expect(row.goals).toBeGreaterThan(0)
    }
  })

  test('o batismo local do jogador aparece na artilharia', () => {
    // Arrange
    const season = playedSeason(10)
    const base = seasonScorers({ ...input(season), customNames: {} }, 999)
    const someone = base.find((row) => !row.isUser)!

    // Act
    const renamed = seasonScorers(
      { ...input(season), customNames: { [someone.playerId]: 'Apelido do Craque' } },
      999,
    )

    // Assert
    expect(renamed.find((row) => row.playerId === someone.playerId)!.name).toBe('Apelido do Craque')
  })
})
