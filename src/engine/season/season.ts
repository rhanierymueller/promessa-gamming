import { CLUBS, clubById } from '../../data/clubs'
import { createRng, nextFloat, type RngResult, type RngState } from '../rng'
import { roundRobinFixtures } from './roundrobin'
import {
  SEASON_ROUNDS,
  SEASON_TEAMS,
  type SeasonFixture,
  type SeasonMatchResult,
  type SeasonState,
  type TableRow,
} from './types'

/** Sorteia os 9 adversários da temporada, determinístico pela seed. */
export const createSeason = (playerClubId: string, seed: number): SeasonState => {
  const pool = CLUBS.filter((club) => club.id !== playerClubId).map((club) => club.id)
  let rng = createRng(seed)
  const participants: string[] = [playerClubId]
  while (participants.length < SEASON_TEAMS && pool.length > 0) {
    const roll = nextFloat(rng)
    rng = roll.next
    const index = Math.floor(roll.value * pool.length) % pool.length
    participants.push(pool.splice(index, 1)[0])
  }
  return { seed, participants, playerClubId, currentRound: 0, results: [] }
}

export const isSeasonOver = (state: SeasonState): boolean => state.currentRound >= SEASON_ROUNDS

export const fixturesForRound = (state: SeasonState, round: number): readonly SeasonFixture[] =>
  roundRobinFixtures(state.participants, round)

/** O jogo do jogador na rodada, com o adversário e o mando. */
export const playerFixture = (state: SeasonState, round: number): SeasonFixture => {
  const fixture = fixturesForRound(state, round).find(
    (f) => f.homeId === state.playerClubId || f.awayId === state.playerClubId,
  )
  if (!fixture) throw new Error(`rodada ${round} sem jogo do clube ${state.playerClubId}`)
  return fixture
}

export const playerOpponentId = (state: SeasonState): string => {
  const fixture = playerFixture(state, state.currentRound)
  return fixture.homeId === state.playerClubId ? fixture.awayId : fixture.homeId
}

const simulateTeamGoals = (clubId: string, rng: RngState): RngResult<number> => {
  const strength = clubById(clubId)?.strength ?? 3
  const spread = nextFloat(rng)
  const luck = nextFloat(spread.next)
  const expected = 0.6 + strength * 0.28 + (spread.value * 2 - 1) * 1.3 + (luck.value - 0.5)
  return { value: Math.max(0, Math.min(5, Math.round(expected))), next: luck.next }
}

/**
 * Fecha a rodada atual: registra o placar REAL do jogador e simula por força
 * os outros quatro jogos. Determinístico dado o estado do RNG.
 */
export const advanceSeason = (
  state: SeasonState,
  playerGoalsFor: number,
  playerGoalsAgainst: number,
  rng: RngState,
): RngResult<SeasonState> => {
  if (isSeasonOver(state)) return { value: state, next: rng }
  const round = state.currentRound
  const results: SeasonMatchResult[] = []
  let current = rng

  for (const fixture of fixturesForRound(state, round)) {
    const isPlayerGame = fixture.homeId === state.playerClubId || fixture.awayId === state.playerClubId
    if (isPlayerGame) {
      const playerIsHome = fixture.homeId === state.playerClubId
      results.push({
        round,
        ...fixture,
        homeGoals: playerIsHome ? playerGoalsFor : playerGoalsAgainst,
        awayGoals: playerIsHome ? playerGoalsAgainst : playerGoalsFor,
      })
      continue
    }
    const home = simulateTeamGoals(fixture.homeId, current)
    const away = simulateTeamGoals(fixture.awayId, home.next)
    current = away.next
    results.push({ round, ...fixture, homeGoals: home.value, awayGoals: away.value })
  }

  return {
    value: { ...state, currentRound: round + 1, results: [...state.results, ...results] },
    next: current,
  }
}

const emptyRow = (clubId: string): TableRow => ({
  clubId,
  points: 0,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
})

const applyResult = (row: TableRow, scored: number, conceded: number): TableRow => ({
  ...row,
  played: row.played + 1,
  goalsFor: row.goalsFor + scored,
  goalsAgainst: row.goalsAgainst + conceded,
  wins: row.wins + (scored > conceded ? 1 : 0),
  draws: row.draws + (scored === conceded ? 1 : 0),
  losses: row.losses + (scored < conceded ? 1 : 0),
  points: row.points + (scored > conceded ? 3 : scored === conceded ? 1 : 0),
})

export interface ScoredMatch {
  readonly homeId: string
  readonly awayId: string
  readonly homeGoals: number
  readonly awayGoals: number
}

/** Classificação genérica (liga e grupos de torneio): pontos > saldo > gols pró > nome. */
export const computeStandings = (
  participants: readonly string[],
  results: readonly ScoredMatch[],
): readonly TableRow[] => {
  const rows = new Map<string, TableRow>(participants.map((id) => [id, emptyRow(id)]))
  for (const result of results) {
    rows.set(result.homeId, applyResult(rows.get(result.homeId)!, result.homeGoals, result.awayGoals))
    rows.set(result.awayId, applyResult(rows.get(result.awayId)!, result.awayGoals, result.homeGoals))
  }
  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const diff = (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
    if (diff !== 0) return diff
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.clubId.localeCompare(b.clubId)
  })
}

export const computeTable = (state: SeasonState): readonly TableRow[] =>
  computeStandings(state.participants, state.results)

export const tablePosition = (state: SeasonState, clubId: string): number =>
  computeTable(state).findIndex((row) => row.clubId === clubId) + 1
