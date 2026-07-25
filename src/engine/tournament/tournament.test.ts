import { describe, expect, test } from 'vitest'
import { NATIONAL_NAMES } from '../../data/nationalNames'
import { NATIONS, nationById } from '../../data/nations'
import { createRng } from '../rng'
import {
  advanceTournament,
  continentalKindFor,
  createTournament,
  firstKnockoutStage,
  GROUP_COUNT,
  GROUP_ROUNDS,
  GROUP_SIZE,
  KNOCKOUT_ORDER,
  knockoutPairs,
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


describe('createTournament', () => {
  test('monta 2 grupos de 4 com o jogador no grupo A', () => {
    // Act
    const cup = createTournament('copa-america', 'brasil', 42)

    // Assert
    expect(cup.groups[0]).toHaveLength(4)
    expect(cup.groups[1]).toHaveLength(4)
    expect(cup.groups[0][0]).toBe('brasil')
    expect(new Set([...cup.groups[0], ...cup.groups[1]]).size).toBe(8)
  })

  test('torneio continental só convoca seleções da mesma confederação', () => {
    // Act
    const copa = createTournament('copa-america', 'brasil', 42)
    const nations = createTournament('liga-nacoes', 'franca', 42)

    // Assert
    for (const id of [...copa.groups[0], ...copa.groups[1]]) {
      expect(nationById(id)!.confederation).toBe('america')
    }
    for (const id of [...nations.groups[0], ...nations.groups[1]]) {
      expect(nationById(id)!.confederation).toBe('europa')
    }
  })

  test('Copa do Mundo mistura confederações e é determinística por seed', () => {
    // Act
    const cup = createTournament('copa-mundo', 'brasil', 42)
    const confederations = new Set(
      [...cup.groups[0], ...cup.groups[1]].map((id) => nationById(id)!.confederation),
    )

    // Assert
    // com 32 seleções a Copa cruza vários continentes, não só dois
    expect(confederations.size).toBeGreaterThanOrEqual(2)
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
    // 3 rodadas de grupo + a chave inteira (oitavas, quartas, semi e final)
    const playerGames = finished.results.filter(
      (r) => r.homeId === 'brasil' || r.awayId === 'brasil',
    )
    expect(playerGames).toHaveLength(GROUP_ROUNDS + KNOCKOUT_ORDER.length)
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

describe('empate: onde vale e onde não vale', () => {
  test('fase de grupos PODE terminar empatada, inclusive na Copa', () => {
    // Arrange: primeira rodada de grupos da Copa
    const state = createTournament('copa-mundo', 'brasil', 7)
    expect(state.stage).toBe('groups')

    // Act: 1 a 1
    const { value } = advanceTournament(state, 1, 1, createRng(11))

    // Assert: ninguém foi para a decisão — o ponto ficou dividido
    expect(value.playerPenaltyWon).toBeNull()
    const meu = value.state.results.find(
      (r) => r.homeId === 'brasil' || r.awayId === 'brasil',
    )!
    expect(meu.homeGoals).toBe(meu.awayGoals)
    expect(meu.penaltyWinnerId).toBeUndefined()
  })

  test('mata-mata NUNCA fica empatado — alguém avança', () => {
    // Arrange: passa a fase de grupos empatando tudo e chega ao mata-mata
    let state = createTournament('copa-mundo', 'brasil', 5)
    let rng = createRng(99)
    for (let i = 0; i < GROUP_ROUNDS; i++) {
      const step = advanceTournament(state, 3, 0, rng)
      state = step.value.state
      rng = step.next
    }
    expect(state.stage).toBe('r16')

    // Act: empata no mata-mata
    const { value } = advanceTournament(state, 1, 1, rng)

    // Assert
    expect(value.playerPenaltyWon).not.toBeNull()
    for (const match of value.state.results.filter((r) => r.stage === 'r16')) {
      const decidido = match.homeGoals !== match.awayGoals || match.penaltyWinnerId !== undefined
      expect(decidido).toBe(true)
    }
  })
})

describe('calendário das competições de seleção', () => {
  test('Copa do Mundo só de quatro em quatro anos', () => {
    for (let year = 1; year <= 24; year++) {
      const kind = tournamentKindForYear(year, 'america')
      expect(kind === 'copa-mundo').toBe(year % 4 === 0)
    }
  })

  test('Copa América nos anos pares que não são de Copa', () => {
    expect(tournamentKindForYear(2, 'america')).toBe('copa-america')
    expect(tournamentKindForYear(6, 'america')).toBe('copa-america')
    expect(tournamentKindForYear(4, 'america')).toBe('copa-mundo')
  })

  test('europeu joga a Liga das Nações no lugar da Copa América', () => {
    expect(tournamentKindForYear(2, 'europa')).toBe('liga-nacoes')
    expect(tournamentKindForYear(4, 'europa')).toBe('copa-mundo')
  })

  test('ano ímpar é temporada só de clube', () => {
    for (const year of [1, 3, 5, 7, 9]) {
      expect(tournamentKindForYear(year, 'america')).toBeNull()
    }
  })
})

describe('nomes por nacionalidade', () => {
  test('toda seleção tem nomes próprios — um norueguês não se chama João Silva', () => {
    for (const nation of NATIONS) {
      const pool = NATIONAL_NAMES[nation.id]
      expect(pool, `faltam nomes para ${nation.name}`).toBeDefined()
      expect(pool.firsts.length).toBeGreaterThanOrEqual(12)
      expect(pool.lasts.length).toBeGreaterThanOrEqual(12)
    }
  })
})


describe('Copa do Mundo com 32 seleções', () => {
  const cup = createTournament('copa-mundo', 'brasil', 7)

  test('são oito grupos de quatro', () => {
    expect(cup.groups).toHaveLength(GROUP_COUNT['copa-mundo'])
    for (const group of cup.groups) expect(group).toHaveLength(GROUP_SIZE)
  })

  test('nenhuma seleção aparece em dois grupos', () => {
    const todas = cup.groups.flat()
    expect(new Set(todas).size).toBe(todas.length)
  })

  test('você abre o grupo A', () => {
    expect(cup.groups[0][0]).toBe('brasil')
  })

  test('a Copa América continua com dois grupos', () => {
    expect(createTournament('copa-america', 'brasil', 7).groups).toHaveLength(2)
  })

  test('a chave vai das oitavas à final', () => {
    expect(firstKnockoutStage(cup)).toBe('r16')
    expect(firstKnockoutStage(createTournament('copa-america', 'brasil', 7))).toBe('semi')
  })

  test('as oitavas têm oito confrontos e ninguém joga duas vezes', () => {
    // Arrange: joga a fase de grupos inteira
    let state = cup
    let rng = createRng(5)
    for (let i = 0; i < GROUP_ROUNDS; i++) {
      const step = advanceTournament(state, 2, 0, rng)
      state = step.value.state
      rng = step.next
    }

    // Act
    const pares = knockoutPairs(state, 'r16')

    // Assert
    expect(pares).toHaveLength(8)
    const times = pares.flat()
    expect(new Set(times).size).toBe(16)
  })
})
