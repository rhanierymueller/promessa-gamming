import { clubById } from '../../data/clubs'
import { createRng, nextFloat, type RngResult, type RngState } from '../rng'
import type { SeasonFixture } from '../season/types'
import { drawGroups, pickContinentalClubs } from './draw'
import {
  groupFixtures,
  groupStandingsFor,
  knockoutPairs,
  playerFixture,
  stageAfter,
  stageWinners,
  tieFixture,
} from './fixtures'
import {
  CONTINENTAL_SPOTS,
  GROUP_ROUNDS,
  isKnockoutStage,
  isLibertadosRunning,
  type LibertadosKnockoutStage,
  type LibertadosMatch,
  type LibertadosState,
} from './types'

/**
 * O ciclo da edição: sorteio, jogo do jogador, simulação do resto da data e
 * avanço de fase. Quando o jogador cai, o resto é simulado até a final — o
 * continente não para porque você foi eliminado.
 */

export const createLibertados = (
  seed: number,
  year: number,
  playerClubId: string | null,
  brazilianIds: readonly string[],
): LibertadosState => {
  const rng = createRng(seed)
  const drawn = pickContinentalClubs(CONTINENTAL_SPOTS, rng)
  const groups = drawGroups([...brazilianIds, ...drawn.value], playerClubId, drawn.next)
  return {
    seed,
    year,
    playerClubId,
    groups: groups.value,
    stage: 'groups',
    round: 0,
    results: [],
    championId: null,
  }
}

const simulateGoals = (clubId: string, rng: RngState): RngResult<number> => {
  const strength = clubById(clubId)?.strength ?? 3
  const spread = nextFloat(rng)
  const luck = nextFloat(spread.next)
  const expected = 0.5 + strength * 0.28 + (spread.value * 2 - 1) * 1.2 + (luck.value - 0.5)
  return { value: Math.max(0, Math.min(5, Math.round(expected))), next: luck.next }
}

const simulateMatch = (
  stage: 'groups' | LibertadosKnockoutStage,
  round: number,
  fixture: SeasonFixture,
  rng: RngState,
): RngResult<LibertadosMatch> => {
  const home = simulateGoals(fixture.homeId, rng)
  const away = simulateGoals(fixture.awayId, home.next)
  return {
    value: {
      stage,
      round,
      homeId: fixture.homeId,
      awayId: fixture.awayId,
      homeGoals: home.value,
      awayGoals: away.value,
    },
    next: away.next,
  }
}

/** Desempate por pênaltis do agregado, quando a volta termina igual na soma. */
const withShootout = (
  match: LibertadosMatch,
  pair: readonly [string, string],
  aggregateTied: boolean,
  rng: RngState,
): RngResult<LibertadosMatch> => {
  if (!aggregateTied) return { value: match, next: rng }
  const coin = nextFloat(rng)
  return {
    value: { ...match, penaltyWinnerId: coin.value < 0.5 ? pair[0] : pair[1] },
    next: coin.next,
  }
}

const aggregateOf = (
  matches: readonly LibertadosMatch[],
  clubId: string,
): number =>
  matches.reduce(
    (sum, match) => sum + (match.homeId === clubId ? match.homeGoals : match.awayGoals),
    0,
  )

/** Simula todos os jogos da data atual, pulando o do jogador. */
const simulateDate = (state: LibertadosState, rng: RngState): RngResult<readonly LibertadosMatch[]> => {
  const played: LibertadosMatch[] = []
  let current = rng

  if (state.stage === 'groups') {
    for (const group of state.groups) {
      for (const fixture of groupFixtures(group, state.round)) {
        if (fixture.homeId === state.playerClubId || fixture.awayId === state.playerClubId) continue
        const simulated = simulateMatch('groups', state.round, fixture, current)
        current = simulated.next
        played.push(simulated.value)
      }
    }
    return { value: played, next: current }
  }

  if (!isKnockoutStage(state.stage)) return { value: played, next: current }

  for (const pair of knockoutPairs(state, state.stage)) {
    if (state.playerClubId && pair.includes(state.playerClubId)) continue
    const fixture = tieFixture(pair, state.round)
    const simulated = simulateMatch(state.stage, state.round, fixture, current)
    current = simulated.next
    // na volta, agregado empatado precisa de vencedor
    if (state.round === 1) {
      const both = [
        ...state.results.filter(
          (result) =>
            result.stage === state.stage &&
            pair.includes(result.homeId) &&
            pair.includes(result.awayId),
        ),
        simulated.value,
      ]
      const tied = aggregateOf(both, pair[0]) === aggregateOf(both, pair[1])
      const decided = withShootout(simulated.value, pair, tied, current)
      current = decided.next
      played.push(decided.value)
      continue
    }
    played.push(simulated.value)
  }
  return { value: played, next: current }
}

/** Decide o estado seguinte depois que a data inteira foi registrada. */
const advanceStage = (state: LibertadosState): LibertadosState => {
  if (state.stage === 'groups') {
    const nextRound = state.round + 1
    if (nextRound < GROUP_ROUNDS) return { ...state, round: nextRound }
    if (!state.playerClubId) return { ...state, round: 0, stage: 'r16' }
    const qualified = groupStandingsFor(state, state.groups[0])
      .slice(0, 2)
      .some((row) => row.clubId === state.playerClubId)
    return { ...state, round: 0, stage: qualified ? 'r16' : 'eliminated' }
  }

  if (!isKnockoutStage(state.stage)) return state
  if (state.round === 0) return { ...state, round: 1 }

  const stage = state.stage
  const playerWon =
    state.playerClubId === null ||
    stageWinners(state, stage).includes(state.playerClubId)

  // a final decide o campeão com ou sem você: perder ali dá a taça ao outro
  if (stageAfter(stage) === 'champion') {
    const champion = stageWinners(state, 'final')[0] ?? null
    return {
      ...state,
      stage: playerWon ? 'champion' : 'eliminated',
      round: 0,
      championId: champion,
    }
  }

  if (!playerWon) return { ...state, stage: 'eliminated' }
  return { ...state, stage: stageAfter(stage) as LibertadosKnockoutStage, round: 0 }
}

/** Roda o torneio até o fim sem jogo do jogador — é o mundo sem você. */
export const simulateEdition = (
  state: LibertadosState,
  rng: RngState,
): RngResult<LibertadosState> => {
  let current: LibertadosState = { ...state, playerClubId: null }
  let currentRng = rng
  let guard = 0
  while (isLibertadosRunning(current.stage) && guard++ < 40) {
    const date = simulateDate(current, currentRng)
    currentRng = date.next
    current = advanceStage({ ...current, results: [...current.results, ...date.value] })
  }
  return { value: current, next: currentRng }
}

export interface LibertadosAdvance {
  readonly state: LibertadosState
  /** Empate no agregado do jogador: quem levou nos pênaltis. */
  readonly playerPenaltyWon: boolean | null
}

/**
 * Fecha o jogo atual do jogador com o placar REAL e simula o resto da data.
 * Quando o jogador cai, o resto da edição é simulado para que o campeão exista.
 */
export const advanceLibertados = (
  state: LibertadosState,
  playerGoalsFor: number,
  playerGoalsAgainst: number,
  rng: RngState,
  /**
   * Rede de segurança para o agregado que chega empatado aqui. Na prática o
   * desempate acontece DENTRO da partida, no lance dos dados.
   */
  playerShootoutWon?: boolean,
): RngResult<LibertadosAdvance> => {
  const fixture = playerFixture(state)
  if (!fixture || !isLibertadosRunning(state.stage)) {
    return { value: { state, playerPenaltyWon: null }, next: rng }
  }

  const playerIsHome = fixture.homeId === state.playerClubId
  const stage = state.stage as 'groups' | LibertadosKnockoutStage
  let current = rng
  let playerPenaltyWon: boolean | null = null
  let playerMatch: LibertadosMatch = {
    stage,
    round: state.round,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeGoals: playerIsHome ? playerGoalsFor : playerGoalsAgainst,
    awayGoals: playerIsHome ? playerGoalsAgainst : playerGoalsFor,
  }

  // volta do mata-mata com agregado empatado: alguém tem de passar
  if (isKnockoutStage(stage) && state.round === 1) {
    const pair = knockoutPairs(state, stage).find((candidate) =>
      candidate.includes(state.playerClubId!),
    )
    if (pair) {
      const both = [
        ...state.results.filter(
          (result) =>
            result.stage === stage &&
            pair.includes(result.homeId) &&
            pair.includes(result.awayId),
        ),
        playerMatch,
      ]
      if (aggregateOf(both, pair[0]) === aggregateOf(both, pair[1])) {
        const coin = nextFloat(current)
        current = coin.next
        playerPenaltyWon = playerShootoutWon ?? coin.value < 0.5
        const opponentId = pair[0] === state.playerClubId ? pair[1] : pair[0]
        playerMatch = {
          ...playerMatch,
          penaltyWinnerId: playerPenaltyWon ? state.playerClubId! : opponentId,
        }
      }
    }
  }

  const date = simulateDate(state, current)
  current = date.next
  const withResults: LibertadosState = {
    ...state,
    results: [...state.results, playerMatch, ...date.value],
  }

  const advanced = advanceStage(withResults)
  /*
   * Caiu antes da final: o resto da edição roda simulado, para o campeão
   * existir de qualquer jeito. Quem perde a PRÓPRIA final já saiu daqui com
   * championId preenchido — não há mais nada a simular.
   */
  if (advanced.stage === 'eliminated' && advanced.championId === null) {
    const resume: LibertadosState = {
      ...advanced,
      // retoma da fase seguinte à que ele perdeu; dos grupos, vai às oitavas
      stage:
        state.stage === 'groups'
          ? 'r16'
          : stageAfter(state.stage as LibertadosKnockoutStage),
      round: 0,
    }
    const rest = simulateEdition(resume, current)
    return {
      value: {
        state: { ...advanced, results: rest.value.results, championId: rest.value.championId },
        playerPenaltyWon,
      },
      next: rest.next,
    }
  }

  return { value: { state: advanced, playerPenaltyWon }, next: current }
}
