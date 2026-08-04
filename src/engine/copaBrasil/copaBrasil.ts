import { clubById } from '../../data/clubs'
import type { Divisions } from '../pyramid/pyramid'
import { createRng, nextFloat, type RngResult, type RngState } from '../rng'
import type { SeasonFixture } from '../season/types'
import { drawCopaBrasil } from './draw'
import {
  isCopaBrasilRunning,
  isKnockoutStage,
  KNOCKOUT_ORDER,
  teamsInStage,
  type CopaBrasilKnockoutStage,
  type CopaBrasilMatch,
  type CopaBrasilStage,
  type CopaBrasilState,
} from './types'

/**
 * Motor da Copa do Brasil: mata-mata puro em ida e volta, dos 16 avos à final.
 *
 * A chave é fixa desde o sorteio (`bracket`): quem vence o confronto 0×1
 * enfrenta quem vencer o 2×3, e assim por diante. Não há novo sorteio a cada
 * fase — o caminho até a final já está desenhado no dia da abertura, que é o
 * que deixa o jogador ver de quem ele desviou e quem vem pela frente.
 */

export const createCopaBrasil = (
  seed: number,
  year: number,
  playerClubId: string | null,
  divisions: Divisions,
): CopaBrasilState => {
  const drawn = drawCopaBrasil(divisions, createRng(seed), playerClubId)
  return {
    seed,
    year,
    playerClubId,
    bracket: drawn.value,
    stage: 'r32',
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
  stage: CopaBrasilKnockoutStage,
  round: number,
  fixture: SeasonFixture,
  rng: RngState,
): RngResult<CopaBrasilMatch> => {
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

/** Quem joga em casa: a ida é na casa do primeiro da chave, a volta inverte. */
export const tieFixture = (
  pair: readonly [string, string],
  round: number,
): SeasonFixture =>
  round === 0
    ? { homeId: pair[0], awayId: pair[1] }
    : { homeId: pair[1], awayId: pair[0] }

const aggregateOf = (matches: readonly CopaBrasilMatch[], clubId: string): number =>
  matches.reduce(
    (sum, match) => sum + (match.homeId === clubId ? match.homeGoals : match.awayGoals),
    0,
  )

const tieMatchesOf = (
  state: CopaBrasilState,
  stage: CopaBrasilKnockoutStage,
  pair: readonly [string, string],
): readonly CopaBrasilMatch[] =>
  state.results.filter(
    (result) =>
      result.stage === stage && pair.includes(result.homeId) && pair.includes(result.awayId),
  )

const withShootout = (
  match: CopaBrasilMatch,
  pair: readonly [string, string],
  aggregateTied: boolean,
  rng: RngState,
): RngResult<CopaBrasilMatch> => {
  if (!aggregateTied) return { value: match, next: rng }
  const coin = nextFloat(rng)
  return {
    value: { ...match, penaltyWinnerId: coin.value < 0.5 ? pair[0] : pair[1] },
    next: coin.next,
  }
}

/** Quem passou de um confronto já decidido (os dois jogos registrados). */
const tieWinner = (
  state: CopaBrasilState,
  stage: CopaBrasilKnockoutStage,
  pair: readonly [string, string],
): string | null => {
  const both = tieMatchesOf(state, stage, pair)
  if (both.length < 2) return null
  const penalties = both.find((match) => match.penaltyWinnerId)
  if (penalties?.penaltyWinnerId) return penalties.penaltyWinnerId
  return aggregateOf(both, pair[0]) >= aggregateOf(both, pair[1]) ? pair[0] : pair[1]
}

/**
 * Os confrontos de uma fase, na ordem da chave. Nos 16 avos são os pares do
 * sorteio; nas fases seguintes, os vencedores da fase anterior — sempre
 * mantendo o lado da chave, que é o que faz o caminho ser previsível.
 */
/**
 * Os confrontos de uma fase ADMITINDO lacunas: `null` onde o classificado
 * ainda não é conhecido.
 *
 * `stagePairs` assume o primeiro do par quando o confronto anterior não
 * terminou — o que serve ao motor, que só olha a fase corrente, mas faz a
 * chave inteira parecer definida na tela. Para exibir, o que falta precisa
 * aparecer como falta.
 */
export const stageSlots = (
  state: CopaBrasilState,
  stage: CopaBrasilKnockoutStage,
): readonly (readonly [string | null, string | null])[] => {
  const stageIndex = KNOCKOUT_ORDER.indexOf(stage)
  let teams: (string | null)[] = [...state.bracket]
  for (let i = 0; i < stageIndex; i++) {
    const previous = KNOCKOUT_ORDER[i]
    const next: (string | null)[] = []
    for (let j = 0; j + 1 < teams.length; j += 2) {
      const home = teams[j]
      const away = teams[j + 1]
      // um lado indefinido já impede saber quem passa
      next.push(
        home !== null && away !== null
          ? tieWinner(state, previous, [home, away] as const)
          : null,
      )
    }
    teams = next
  }
  const pairs: (readonly [string | null, string | null])[] = []
  for (let i = 0; i + 1 < teams.length; i += 2) pairs.push([teams[i], teams[i + 1]] as const)
  return pairs.slice(0, teamsInStage(stage) / 2)
}

export const stagePairs = (
  state: CopaBrasilState,
  stage: CopaBrasilKnockoutStage,
): readonly (readonly [string, string])[] => {
  const stageIndex = KNOCKOUT_ORDER.indexOf(stage)
  let teams: string[] = [...state.bracket]
  for (let i = 0; i < stageIndex; i++) {
    const previous = KNOCKOUT_ORDER[i]
    const next: string[] = []
    for (let j = 0; j + 1 < teams.length; j += 2) {
      const pair = [teams[j], teams[j + 1]] as const
      next.push(tieWinner(state, previous, pair) ?? pair[0])
    }
    teams = next
  }
  const pairs: (readonly [string, string])[] = []
  for (let i = 0; i + 1 < teams.length; i += 2) pairs.push([teams[i], teams[i + 1]] as const)
  return pairs.slice(0, teamsInStage(stage) / 2)
}

/** O confronto do jogador na fase atual, ou null se ele já caiu. */
export const copaBrasilPlayerFixture = (state: CopaBrasilState): SeasonFixture | null => {
  if (!state.playerClubId || !isKnockoutStage(state.stage)) return null
  const pair = stagePairs(state, state.stage).find((entry) =>
    entry.includes(state.playerClubId!),
  )
  return pair ? tieFixture(pair, state.round) : null
}

export const copaBrasilOpponentId = (state: CopaBrasilState): string | null => {
  const fixture = copaBrasilPlayerFixture(state)
  if (!fixture) return null
  return fixture.homeId === state.playerClubId ? fixture.awayId : fixture.homeId
}

/** Saldo que o jogador traz da ida para a volta do confronto atual. */
export const copaBrasilAggregateLeadBeforeMatch = (state: CopaBrasilState): number => {
  if (!state.playerClubId || !isKnockoutStage(state.stage) || state.round !== 1) return 0
  const pair = stagePairs(state, state.stage).find((entry) =>
    entry.includes(state.playerClubId!),
  )
  if (!pair) return 0
  const opponentId = pair[0] === state.playerClubId ? pair[1] : pair[0]
  const firstLeg = tieMatchesOf(state, state.stage, pair)
  return aggregateOf(firstLeg, state.playerClubId) - aggregateOf(firstLeg, opponentId)
}

/** Simula os jogos da rodada atual, pulando o do jogador. */
const simulateRound = (
  state: CopaBrasilState,
  rng: RngState,
): RngResult<readonly CopaBrasilMatch[]> => {
  const played: CopaBrasilMatch[] = []
  let current = rng
  if (!isKnockoutStage(state.stage)) return { value: played, next: current }

  for (const pair of stagePairs(state, state.stage)) {
    if (state.playerClubId && pair.includes(state.playerClubId)) continue
    const simulated = simulateMatch(state.stage, state.round, tieFixture(pair, state.round), current)
    current = simulated.next
    if (state.round === 1) {
      const both = [...tieMatchesOf(state, state.stage, pair), simulated.value]
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

/** O estado seguinte depois que a rodada inteira foi registrada. */
const advanceStage = (state: CopaBrasilState): CopaBrasilState => {
  if (!isKnockoutStage(state.stage)) return state
  // ida jogada: a volta é na semana seguinte da competição
  if (state.round === 0) return { ...state, round: 1 }

  const stageIndex = KNOCKOUT_ORDER.indexOf(state.stage)
  const isFinal = stageIndex === KNOCKOUT_ORDER.length - 1
  const pairs = stagePairs(state, state.stage)

  if (isFinal) {
    const champion = pairs[0] ? tieWinner(state, 'final', pairs[0]) : null
    return {
      ...state,
      round: 0,
      stage: 'champion',
      championId: champion,
    }
  }

  const nextStage = KNOCKOUT_ORDER[stageIndex + 1]
  if (state.playerClubId) {
    const mine = pairs.find((pair) => pair.includes(state.playerClubId!))
    const survived = mine ? tieWinner(state, state.stage, mine) === state.playerClubId : false
    if (!survived) return { ...state, round: 0, stage: 'eliminated' }
  }
  return { ...state, round: 0, stage: nextStage }
}

/**
 * Registra o resultado do jogador, simula o resto da rodada e avança a fase.
 * `playerWon` só entra quando a VOLTA termina com o agregado empatado.
 */
export const advanceCopaBrasil = (
  state: CopaBrasilState,
  playerGoals: number,
  opponentGoals: number,
  rng: RngState,
  playerWonShootout: boolean,
): RngResult<{ readonly state: CopaBrasilState }> => {
  if (!isKnockoutStage(state.stage) || !state.playerClubId) {
    return { value: { state }, next: rng }
  }
  const fixture = copaBrasilPlayerFixture(state)
  if (!fixture) return { value: { state }, next: rng }

  const isHome = fixture.homeId === state.playerClubId
  const mine: CopaBrasilMatch = {
    stage: state.stage,
    round: state.round,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeGoals: isHome ? playerGoals : opponentGoals,
    awayGoals: isHome ? opponentGoals : playerGoals,
  }

  const pair = stagePairs(state, state.stage).find((entry) =>
    entry.includes(state.playerClubId!),
  )!
  const decided =
    state.round === 1 &&
    aggregateOf([...tieMatchesOf(state, state.stage, pair), mine], pair[0]) ===
      aggregateOf([...tieMatchesOf(state, state.stage, pair), mine], pair[1])
      ? { ...mine, penaltyWinnerId: playerWonShootout ? state.playerClubId : copaBrasilOpponentId(state)! }
      : mine

  const others = simulateRound(state, rng)
  const withResults: CopaBrasilState = {
    ...state,
    results: [...state.results, decided, ...others.value],
  }
  return { value: { state: advanceStage(withResults) }, next: others.next }
}

/** Roda a edição inteira sem o jogador — é assim que a Copa tem campeão. */
export const simulateCopaBrasilEdition = (
  state: CopaBrasilState,
  rng: RngState,
): RngResult<CopaBrasilState> => {
  let current = state
  let random = rng
  let guard = 0
  while (isCopaBrasilRunning(current.stage) && guard++ < 40) {
    const round = simulateRound(current, random)
    random = round.next
    current = advanceStage({ ...current, results: [...current.results, ...round.value] })
  }
  return { value: current, next: random }
}

/** Nome da fase para a UI, já sabendo se a edição acabou. */
export const stageOf = (state: CopaBrasilState): CopaBrasilStage => state.stage
