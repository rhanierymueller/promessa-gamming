import { describe, expect, test } from 'vitest'
import { nationById } from '../../data/nations'
import { createRng } from '../rng'
import {
  advanceTournament,
  continentalKindFor,
  createTournament,
  GROUP_ROUNDS,
  playerTournamentOpponentId,
  tournamentKindForYear,
  type TournamentState,
} from './tournament'

/** Joga todos os jogos do jogador com o placar dado até o torneio terminar. */
const playThrough = (state: TournamentState, goalsFor: number, goalsAgainst: number): TournamentState => {
  let current = state
  let rng = createRng(777)
  let guard = 0
  while (current.stage !== 'champion' && current.stage !== 'eliminated' && guard++ < 20) {
    const advanced = advanceTournament(current, goalsFor, goalsAgainst, rng)
    current = advanced.value.state
    rng = advanced.next
  }
  return current
}

describe('continentalKindFor', () => {
  test('europeu joga Liga das Nações; americano, Copa América', () => {
    expect(continentalKindFor('europa')).toBe('liga-nacoes')
    expect(continentalKindFor('america')).toBe('copa-america')
  })
})

describe('tournamentKindForYear (calendário)', () => {
  test('anos ímpares têm o continental; pares, a Copa do Mundo', () => {
    expect(tournamentKindForYear(1, 'america')).toBe('copa-america')
    expect(tournamentKindForYear(1, 'europa')).toBe('liga-nacoes')
    expect(tournamentKindForYear(2, 'america')).toBe('copa-mundo')
    expect(tournamentKindForYear(3, 'america')).toBe('copa-america')
    expect(tournamentKindForYear(4, 'europa')).toBe('copa-mundo')
  })
})

describe('createTournament', () => {
  test('monta 2 grupos de 4 com o jogador no grupo A', () => {
    // Act
    const cup = createTournament('copa-america', 'brasil', 42)

    // Assert
    expect(cup.groupA).toHaveLength(4)
    expect(cup.groupB).toHaveLength(4)
    expect(cup.groupA[0]).toBe('brasil')
    expect(new Set([...cup.groupA, ...cup.groupB]).size).toBe(8)
  })

  test('torneio continental só convoca seleções da mesma confederação', () => {
    // Act
    const copa = createTournament('copa-america', 'brasil', 42)
    const nations = createTournament('liga-nacoes', 'franca', 42)

    // Assert
    for (const id of [...copa.groupA, ...copa.groupB]) {
      expect(nationById(id)!.confederation).toBe('america')
    }
    for (const id of [...nations.groupA, ...nations.groupB]) {
      expect(nationById(id)!.confederation).toBe('europa')
    }
  })

  test('Copa do Mundo mistura confederações e é determinística por seed', () => {
    // Act
    const cup = createTournament('copa-mundo', 'brasil', 42)
    const confederations = new Set(
      [...cup.groupA, ...cup.groupB].map((id) => nationById(id)!.confederation),
    )

    // Assert
    expect(confederations.size).toBe(2)
    expect(createTournament('copa-mundo', 'brasil', 42)).toEqual(cup)
  })
})

describe('fase de grupos', () => {
  test('o jogador tem adversário definido em cada uma das 3 rodadas', () => {
    // Arrange
    let cup = createTournament('copa-america', 'brasil', 42)
    let rng = createRng(1)
    const opponents = new Set<string>()

    // Act
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const opponent = playerTournamentOpponentId(cup)!
      opponents.add(opponent)
      const advanced = advanceTournament(cup, 2, 0, rng)
      cup = advanced.value.state
      rng = advanced.next
    }

    // Assert: enfrentou os 3 companheiros de grupo, sem repetição
    expect(opponents.size).toBe(GROUP_ROUNDS)
    expect(cup.stage).toBe('semi')
  })

  test('perder tudo na fase de grupos elimina', () => {
    // Arrange
    let cup = createTournament('copa-america', 'brasil', 42)
    let rng = createRng(1)

    // Act
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceTournament(cup, 0, 3, rng)
      cup = advanced.value.state
      rng = advanced.next
    }

    // Assert
    expect(cup.stage).toBe('eliminated')
  })
})

describe('mata-mata', () => {
  test('vencer tudo dá o título', () => {
    // Act
    const finished = playThrough(createTournament('copa-mundo', 'brasil', 42), 2, 0)

    // Assert
    expect(finished.stage).toBe('champion')
    expect(finished.championId).toBe('brasil')
    // grupos (3) + semi (1) + final (1) jogos do jogador registrados
    const playerGames = finished.results.filter(
      (r) => r.homeId === 'brasil' || r.awayId === 'brasil',
    )
    expect(playerGames).toHaveLength(5)
  })

  test('empate no mata-mata decide nos pênaltis, para qualquer lado', () => {
    // Arrange: joga a semi empatando — o RNG decide
    let cup = createTournament('copa-america', 'brasil', 42)
    let rng = createRng(1)
    for (let round = 0; round < GROUP_ROUNDS; round++) {
      const advanced = advanceTournament(cup, 2, 0, rng)
      cup = advanced.value.state
      rng = advanced.next
    }
    expect(cup.stage).toBe('semi')

    // Act
    const advanced = advanceTournament(cup, 1, 1, rng)

    // Assert
    expect(advanced.value.playerPenaltyWon).not.toBeNull()
    expect(['final', 'eliminated']).toContain(advanced.value.state.stage)
  })

  test('perder a final termina com o rival campeão', () => {
    // Arrange: vence grupos e semi, perde a final
    let cup = createTournament('copa-mundo', 'brasil', 42)
    let rng = createRng(9)
    while (cup.stage !== 'final') {
      const advanced = advanceTournament(cup, 3, 0, rng)
      cup = advanced.value.state
      rng = advanced.next
    }
    const rival = playerTournamentOpponentId(cup)

    // Act
    const finished = advanceTournament(cup, 0, 1, rng).value.state

    // Assert
    expect(finished.stage).toBe('eliminated')
    expect(finished.championId).toBe(rival)
  })
})
