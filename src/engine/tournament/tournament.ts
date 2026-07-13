import { NATIONS, nationById, type Confederation } from '../../data/nations'
import { createRng, nextFloat, type RngResult, type RngState } from '../rng'
import { roundRobinFixtures } from '../season/roundrobin'
import { computeStandings, type ScoredMatch } from '../season/season'

/**
 * Torneios de seleção: fase de grupos (2 grupos de 4, todos contra todos) e
 * mata-mata (semifinal cruzada + final). Empate no mata-mata vai aos pênaltis.
 * O jogador disputa TODOS os jogos da sua seleção; o resto é simulado.
 */
export type TournamentKind = 'copa-america' | 'liga-nacoes' | 'copa-mundo'
export type TournamentStage = 'groups' | 'semi' | 'final' | 'champion' | 'eliminated'

export const TOURNAMENT_NAMES: Record<TournamentKind, string> = {
  'copa-america': 'Copa América',
  'liga-nacoes': 'Liga das Nações',
  'copa-mundo': 'Copa do Mundo',
}

export const GROUP_SIZE = 4
export const GROUP_ROUNDS = GROUP_SIZE - 1

export interface TournamentMatch extends ScoredMatch {
  readonly stage: 'groups' | 'semi' | 'final'
  readonly round: number
  /** Vencedor nos pênaltis quando o placar terminou empatado no mata-mata. */
  readonly penaltyWinnerId?: string
}

export interface TournamentState {
  readonly kind: TournamentKind
  readonly seed: number
  readonly playerNationId: string
  readonly groupA: readonly string[]
  readonly groupB: readonly string[]
  readonly stage: TournamentStage
  readonly round: number
  readonly results: readonly TournamentMatch[]
  readonly championId: string | null
}

export const continentalKindFor = (confederation: Confederation): TournamentKind =>
  confederation === 'europa' ? 'liga-nacoes' : 'copa-america'

/**
 * Calendário: uma competição de seleções por ano, em dezembro — anos ímpares
 * têm o torneio continental, anos pares têm Copa do Mundo.
 */
export const tournamentKindForYear = (careerYear: number, confederation: Confederation): TournamentKind =>
  careerYear % 2 === 0 ? 'copa-mundo' : continentalKindFor(confederation)

const drawFrom = (pool: string[], count: number, rng: RngState): RngResult<string[]> => {
  const drawn: string[] = []
  let current = rng
  const rest = [...pool]
  while (drawn.length < count && rest.length > 0) {
    const roll = nextFloat(current)
    current = roll.next
    drawn.push(rest.splice(Math.floor(roll.value * rest.length) % rest.length, 1)[0])
  }
  return { value: drawn, next: current }
}

export const createTournament = (
  kind: TournamentKind,
  playerNationId: string,
  seed: number,
): TournamentState => {
  const player = nationById(playerNationId)
  if (!player) throw new Error(`seleção desconhecida: ${playerNationId}`)
  const pool =
    kind === 'copa-mundo'
      ? NATIONS.filter((n) => n.id !== playerNationId).map((n) => n.id)
      : NATIONS.filter((n) => n.id !== playerNationId && n.confederation === player.confederation).map((n) => n.id)

  const rng = createRng(seed)
  const drawn = drawFrom(pool, GROUP_SIZE * 2 - 1, rng)
  return {
    kind,
    seed,
    playerNationId,
    groupA: [playerNationId, ...drawn.value.slice(0, GROUP_SIZE - 1)],
    groupB: drawn.value.slice(GROUP_SIZE - 1),
    stage: 'groups',
    round: 0,
    results: [],
    championId: null,
  }
}

const groupResults = (state: TournamentState, group: readonly string[]): readonly TournamentMatch[] =>
  state.results.filter((r) => r.stage === 'groups' && group.includes(r.homeId))

const groupQualifiers = (state: TournamentState, group: readonly string[]): readonly string[] =>
  computeStandings(group, groupResults(state, group))
    .slice(0, 2)
    .map((row) => row.clubId)

export const groupStandings = (state: TournamentState, group: readonly string[]) =>
  computeStandings(group, groupResults(state, group))

const matchWinner = (match: TournamentMatch): string => {
  if (match.penaltyWinnerId) return match.penaltyWinnerId
  return match.homeGoals > match.awayGoals ? match.homeId : match.awayId
}

const semiPairs = (state: TournamentState): readonly [string, string][] => {
  const [a1, a2] = groupQualifiers(state, state.groupA)
  const [b1, b2] = groupQualifiers(state, state.groupB)
  return [
    [a1, b2],
    [b1, a2],
  ]
}

const finalPair = (state: TournamentState): [string, string] => {
  const semis = state.results.filter((r) => r.stage === 'semi')
  return [matchWinner(semis[0]), matchWinner(semis[1])]
}

/** O confronto atual do jogador, ou null se o torneio terminou para ele. */
export const playerTournamentFixture = (state: TournamentState): { homeId: string; awayId: string } | null => {
  if (state.stage === 'groups') {
    const fixture = roundRobinFixtures(state.groupA, state.round).find(
      (f) => f.homeId === state.playerNationId || f.awayId === state.playerNationId,
    )
    return fixture ?? null
  }
  if (state.stage === 'semi') {
    const pair = semiPairs(state).find((p) => p.includes(state.playerNationId))
    return pair ? { homeId: pair[0], awayId: pair[1] } : null
  }
  if (state.stage === 'final') {
    const pair = finalPair(state)
    return pair.includes(state.playerNationId) ? { homeId: pair[0], awayId: pair[1] } : null
  }
  return null
}

export const playerTournamentOpponentId = (state: TournamentState): string | null => {
  const fixture = playerTournamentFixture(state)
  if (!fixture) return null
  return fixture.homeId === state.playerNationId ? fixture.awayId : fixture.homeId
}

const simulateNationGoals = (nationId: string, rng: RngState): RngResult<number> => {
  const strength = nationById(nationId)?.strength ?? 4
  const spread = nextFloat(rng)
  const luck = nextFloat(spread.next)
  const expected = 0.5 + strength * 0.28 + (spread.value * 2 - 1) * 1.2 + (luck.value - 0.5)
  return { value: Math.max(0, Math.min(5, Math.round(expected))), next: luck.next }
}

const simulateMatch = (
  stage: 'groups' | 'semi' | 'final',
  round: number,
  homeId: string,
  awayId: string,
  knockout: boolean,
  rng: RngState,
): RngResult<TournamentMatch> => {
  const home = simulateNationGoals(homeId, rng)
  const away = simulateNationGoals(awayId, home.next)
  let current = away.next
  let penaltyWinnerId: string | undefined
  if (knockout && home.value === away.value) {
    const coin = nextFloat(current)
    current = coin.next
    penaltyWinnerId = coin.value < 0.5 ? homeId : awayId
  }
  return {
    value: { stage, round, homeId, awayId, homeGoals: home.value, awayGoals: away.value, penaltyWinnerId },
    next: current,
  }
}

export interface TournamentAdvance {
  readonly state: TournamentState
  /** Empate do jogador no mata-mata: quem levou nos pênaltis. */
  readonly playerPenaltyWon: boolean | null
}

/**
 * Fecha o jogo atual do jogador (placar real) e simula o resto da etapa.
 * Empate do jogador no mata-mata é decidido nos pênaltis via RNG.
 */
export const advanceTournament = (
  state: TournamentState,
  playerGoalsFor: number,
  playerGoalsAgainst: number,
  rng: RngState,
): RngResult<TournamentAdvance> => {
  const fixture = playerTournamentFixture(state)
  if (!fixture || state.stage === 'champion' || state.stage === 'eliminated') {
    return { value: { state, playerPenaltyWon: null }, next: rng }
  }
  const playerIsHome = fixture.homeId === state.playerNationId
  const knockout = state.stage !== 'groups'
  let current = rng
  let playerPenaltyWon: boolean | null = null
  let penaltyWinnerId: string | undefined

  if (knockout && playerGoalsFor === playerGoalsAgainst) {
    const coin = nextFloat(current)
    current = coin.next
    playerPenaltyWon = coin.value < 0.5
    penaltyWinnerId = playerPenaltyWon
      ? state.playerNationId
      : fixture.homeId === state.playerNationId ? fixture.awayId : fixture.homeId
  }

  const playerMatch: TournamentMatch = {
    stage: state.stage as 'groups' | 'semi' | 'final',
    round: state.round,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeGoals: playerIsHome ? playerGoalsFor : playerGoalsAgainst,
    awayGoals: playerIsHome ? playerGoalsAgainst : playerGoalsFor,
    penaltyWinnerId,
  }
  const results: TournamentMatch[] = [playerMatch]

  if (state.stage === 'groups') {
    // o outro jogo do grupo A + a rodada inteira do grupo B
    const otherA = roundRobinFixtures(state.groupA, state.round).find(
      (f) => f.homeId !== state.playerNationId && f.awayId !== state.playerNationId,
    )!
    const simA = simulateMatch('groups', state.round, otherA.homeId, otherA.awayId, false, current)
    current = simA.next
    results.push(simA.value)
    for (const fixtureB of roundRobinFixtures(state.groupB, state.round)) {
      const simB = simulateMatch('groups', state.round, fixtureB.homeId, fixtureB.awayId, false, current)
      current = simB.next
      results.push(simB.value)
    }
  } else if (state.stage === 'semi') {
    const otherSemi = semiPairs(state).find((p) => !p.includes(state.playerNationId))!
    const sim = simulateMatch('semi', 0, otherSemi[0], otherSemi[1], true, current)
    current = sim.next
    results.push(sim.value)
  }

  const withResults: TournamentState = { ...state, results: [...state.results, ...results] }
  const playerWon =
    playerGoalsFor > playerGoalsAgainst || playerPenaltyWon === true

  let nextState: TournamentState
  if (state.stage === 'groups') {
    const nextRound = state.round + 1
    if (nextRound < GROUP_ROUNDS) {
      nextState = { ...withResults, round: nextRound }
    } else {
      const qualified = groupQualifiers(withResults, state.groupA).includes(state.playerNationId)
      nextState = { ...withResults, round: 0, stage: qualified ? 'semi' : 'eliminated' }
    }
  } else if (state.stage === 'semi') {
    nextState = { ...withResults, stage: playerWon ? 'final' : 'eliminated' }
  } else {
    nextState = {
      ...withResults,
      stage: playerWon ? 'champion' : 'eliminated',
      championId: playerWon
        ? state.playerNationId
        : fixture.homeId === state.playerNationId ? fixture.awayId : fixture.homeId,
    }
  }

  return { value: { state: nextState, playerPenaltyWon }, next: current }
}
