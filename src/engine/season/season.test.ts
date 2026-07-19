import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import {
  advanceSeason,
  computeTable,
  createSeason,
  fixturesForRound,
  isSeasonOver,
  playerFixture,
  recentForm,
  playerOpponentId,
  tablePosition,
} from './season'
import { SEASON_ROUNDS, SEASON_TEAMS, type SeasonState } from './types'

const PLAYER = 'real-vila'

const playFullSeason = (season: SeasonState): SeasonState => {
  let state = season
  let rng = createRng(999)
  while (!isSeasonOver(state)) {
    const advanced = advanceSeason(state, 2, 1, rng) // jogador sempre vence de 2x1
    state = advanced.value
    rng = advanced.next
  }
  return state
}

describe('createSeason', () => {
  test('monta liga de 10 com o clube do jogador e sorteio determinístico', () => {
    // Act
    const season = createSeason(PLAYER, 42)

    // Assert
    expect(season.participants).toHaveLength(SEASON_TEAMS)
    expect(season.participants[0]).toBe(PLAYER)
    expect(new Set(season.participants).size).toBe(SEASON_TEAMS)
    expect(createSeason(PLAYER, 42)).toEqual(season)
    expect(createSeason(PLAYER, 43).participants).not.toEqual(season.participants)
  })
})

describe('round-robin', () => {
  test('todo time joga exatamente uma vez contra cada adversário', () => {
    // Arrange
    const season = createSeason(PLAYER, 42)
    const meetings = new Map<string, number>()

    // Act
    for (let round = 0; round < SEASON_ROUNDS; round++) {
      const fixtures = fixturesForRound(season, round)
      expect(fixtures).toHaveLength(SEASON_TEAMS / 2)
      for (const f of fixtures) {
        const key = [f.homeId, f.awayId].sort().join('|')
        meetings.set(key, (meetings.get(key) ?? 0) + 1)
      }
    }

    // Assert: 45 confrontos únicos, cada um uma única vez
    expect(meetings.size).toBe((SEASON_TEAMS * (SEASON_TEAMS - 1)) / 2)
    for (const count of meetings.values()) expect(count).toBe(1)
  })

  test('o jogador tem exatamente um jogo por rodada', () => {
    // Arrange
    const season = createSeason(PLAYER, 42)

    // Act & Assert
    for (let round = 0; round < SEASON_ROUNDS; round++) {
      const fixture = playerFixture(season, round)
      expect([fixture.homeId, fixture.awayId]).toContain(PLAYER)
    }
  })
})

describe('advanceSeason', () => {
  test('registra o placar real do jogador e simula os outros quatro jogos', () => {
    // Arrange
    const season = createSeason(PLAYER, 42)
    const opponent = playerOpponentId(season)

    // Act
    const { value: after } = advanceSeason(season, 3, 1, createRng(7))

    // Assert
    expect(after.currentRound).toBe(1)
    expect(after.results).toHaveLength(SEASON_TEAMS / 2)
    const playerGame = after.results.find(
      (r) => r.homeId === PLAYER || r.awayId === PLAYER,
    )!
    const playerGoals = playerGame.homeId === PLAYER ? playerGame.homeGoals : playerGame.awayGoals
    const oppGoals = playerGame.homeId === PLAYER ? playerGame.awayGoals : playerGame.homeGoals
    expect(playerGoals).toBe(3)
    expect(oppGoals).toBe(1)
    expect([playerGame.homeId, playerGame.awayId]).toContain(opponent)
  })

  test('é determinístico para o mesmo RNG', () => {
    // Arrange
    const season = createSeason(PLAYER, 42)

    // Act & Assert
    expect(advanceSeason(season, 1, 1, createRng(5))).toEqual(advanceSeason(season, 1, 1, createRng(5)))
  })
})

describe('computeTable', () => {
  test('vitória vale 3, empate 1, derrota 0, com gols pró e contra', () => {
    // Arrange: temporada completa com o jogador vencendo tudo de 2x1
    const finished = playFullSeason(createSeason(PLAYER, 42))
    const table = computeTable(finished)
    const playerRow = table.find((row) => row.clubId === PLAYER)!

    // Assert
    expect(playerRow.played).toBe(SEASON_ROUNDS)
    expect(playerRow.wins).toBe(SEASON_ROUNDS)
    expect(playerRow.points).toBe(SEASON_ROUNDS * 3)
    expect(playerRow.goalsFor).toBe(SEASON_ROUNDS * 2)
    expect(playerRow.goalsAgainst).toBe(SEASON_ROUNDS)
  })

  test('ordena por pontos e o invicto de 27 pontos é o campeão', () => {
    // Arrange
    const finished = playFullSeason(createSeason(PLAYER, 42))

    // Act
    const table = computeTable(finished)

    // Assert
    expect(table[0].clubId).toBe(PLAYER)
    expect(tablePosition(finished, PLAYER)).toBe(1)
    for (let i = 1; i < table.length; i++) {
      expect(table[i - 1].points).toBeGreaterThanOrEqual(table[i].points)
    }
  })

  test('todos os times terminam a temporada com 9 jogos', () => {
    // Arrange
    const finished = playFullSeason(createSeason(PLAYER, 42))

    // Act & Assert
    expect(isSeasonOver(finished)).toBe(true)
    for (const row of computeTable(finished)) {
      expect(row.played).toBe(SEASON_ROUNDS)
    }
  })
})

describe('recentForm', () => {
  test('devolve as últimas partidas do clube em V/E/D, da mais antiga à mais recente', () => {
    // Arrange: joga 7 rodadas
    const created = createSeason('real-vila', 42)
    let state = created
    let rng = createRng(9)
    for (let round = 0; round < 7; round++) {
      const advanced = advanceSeason(state, 2, 1, rng)
      state = advanced.value
      rng = advanced.next
    }

    // Act
    const form = recentForm(state, 'real-vila', 5)

    // Assert: jogador venceu todas de 2x1
    expect(form).toHaveLength(5)
    expect(form.every((entry) => entry === 'V')).toBe(true)
  })

  test('sem jogos, forma vazia; com poucos jogos, devolve o que tem', () => {
    // Arrange
    const created = createSeason('real-vila', 42)
    const one = advanceSeason(created, 0, 3, createRng(9)).value

    // Act & Assert
    expect(recentForm(created, 'real-vila', 5)).toHaveLength(0)
    expect(recentForm(one, 'real-vila', 5)).toEqual(['D'])
    expect(recentForm(one, 'clube-fantasma', 5)).toHaveLength(0)
  })

  test('todos os participantes têm forma após rodadas jogadas', () => {
    // Arrange
    let state = createSeason('real-vila', 7)
    let rng = createRng(3)
    for (let round = 0; round < 6; round++) {
      const advanced = advanceSeason(state, 1, 1, rng)
      state = advanced.value
      rng = advanced.next
    }

    // Act & Assert
    for (const clubId of state.participants) {
      const form = recentForm(state, clubId, 5)
      expect(form.length).toBeGreaterThan(0)
      for (const entry of form) expect(['V', 'E', 'D']).toContain(entry)
    }
  })
})
