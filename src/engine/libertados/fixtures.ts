import { roundRobinFixtures } from '../season/roundrobin'
import { computeStandings } from '../season/season'
import type { SeasonFixture, TableRow } from '../season/types'
import {
  GROUP_ROUNDS,
  isKnockoutStage,
  KNOCKOUT_ORDER,
  type LibertadosKnockoutStage,
  type LibertadosState,
} from './types'

/**
 * Confrontos da Libertados. Os grupos são ida e volta (returno = turno com o
 * mando trocado) e o mata-mata é um par [cabeça, desafiante] em que o cabeça
 * decide em casa.
 */

const TURN_ROUNDS = GROUP_ROUNDS / 2

export const groupFixtures = (
  group: readonly string[],
  round: number,
): readonly SeasonFixture[] => {
  const turn = roundRobinFixtures(group, round % TURN_ROUNDS)
  if (round < TURN_ROUNDS) return turn
  return turn.map((fixture) => ({ homeId: fixture.awayId, awayId: fixture.homeId }))
}

const groupResults = (state: LibertadosState, group: readonly string[]) =>
  state.results.filter((result) => result.stage === 'groups' && group.includes(result.homeId))

export const groupStandingsFor = (
  state: LibertadosState,
  group: readonly string[],
): readonly TableRow[] => computeStandings(group, groupResults(state, group))

const groupQualifiers = (state: LibertadosState, group: readonly string[]): readonly string[] =>
  groupStandingsFor(state, group).slice(0, 2).map((row) => row.clubId)

/**
 * Cruzamento clássico: o 1º de um grupo pega o 2º do grupo vizinho. Os
 * confrontos "de cima" vêm primeiro e os "de baixo" depois, para que dois
 * clubes do mesmo grupo só se reencontrem na final.
 */
const seededQualifiers = (state: LibertadosState): readonly string[] => {
  const byGroup = state.groups.map((group) => groupQualifiers(state, group))
  const upper: string[] = []
  const lower: string[] = []
  for (let i = 0; i + 1 < byGroup.length; i += 2) {
    const [first1, second1] = byGroup[i]
    const [first2, second2] = byGroup[i + 1]
    upper.push(first1, second2)
    lower.push(first2, second1)
  }
  return [...upper, ...lower]
}

const stageBefore = (stage: LibertadosKnockoutStage): LibertadosKnockoutStage | null => {
  const index = KNOCKOUT_ORDER.indexOf(stage)
  return index <= 0 ? null : KNOCKOUT_ORDER[index - 1]
}

export const stageAfter = (
  stage: LibertadosKnockoutStage,
): LibertadosKnockoutStage | 'champion' => {
  const index = KNOCKOUT_ORDER.indexOf(stage)
  return index === KNOCKOUT_ORDER.length - 1 ? 'champion' : KNOCKOUT_ORDER[index + 1]
}

/** Ida: casa do desafiante. Volta: casa do cabeça, que decide em casa. */
export const tieFixture = (pair: readonly [string, string], round: number): SeasonFixture =>
  round === 0
    ? { homeId: pair[1], awayId: pair[0] }
    : { homeId: pair[0], awayId: pair[1] }

const tieMatches = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
  pair: readonly [string, string],
) =>
  state.results.filter(
    (result) =>
      result.stage === stage &&
      pair.includes(result.homeId) &&
      pair.includes(result.awayId),
  )

/** Vencedor do confronto pelo agregado; null enquanto faltar jogo. */
export const tieWinner = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
  pair: readonly [string, string],
): string | null => {
  const matches = tieMatches(state, stage, pair)
  if (matches.length < 2) return null
  const goalsFor = (clubId: string): number =>
    matches.reduce(
      (sum, match) => sum + (match.homeId === clubId ? match.homeGoals : match.awayGoals),
      0,
    )
  const [head, challenger] = pair
  const headGoals = goalsFor(head)
  const challengerGoals = goalsFor(challenger)
  if (headGoals !== challengerGoals) return headGoals > challengerGoals ? head : challenger
  // agregado empatado: quem levou nos pênaltis, registrado na volta
  return matches.find((match) => match.penaltyWinnerId)?.penaltyWinnerId ?? head
}

export const knockoutPairs = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
): readonly (readonly [string, string])[] => {
  const previous = stageBefore(stage)
  const teams =
    previous === null
      ? seededQualifiers(state)
      : stageWinners(state, previous)
  const pairs: [string, string][] = []
  for (let i = 0; i + 1 < teams.length; i += 2) pairs.push([teams[i], teams[i + 1]])
  return pairs
}

/** Vencedores de todos os confrontos de uma fase, na ordem da chave. */
export const stageWinners = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
): readonly string[] =>
  knockoutPairs(state, stage)
    .map((pair) => tieWinner(state, stage, pair))
    .filter((winner): winner is string => winner !== null)

/** O jogo atual do jogador, ou null se o torneio terminou para ele. */
export const playerFixture = (state: LibertadosState): SeasonFixture | null => {
  if (!state.playerClubId) return null
  if (state.stage === 'groups') {
    return (
      groupFixtures(state.groups[0], state.round).find(
        (fixture) =>
          fixture.homeId === state.playerClubId || fixture.awayId === state.playerClubId,
      ) ?? null
    )
  }
  if (!isKnockoutStage(state.stage)) return null
  const pair = knockoutPairs(state, state.stage).find((candidate) =>
    candidate.includes(state.playerClubId!),
  )
  return pair ? tieFixture(pair, state.round) : null
}

export const playerOpponentId = (state: LibertadosState): string | null => {
  const fixture = playerFixture(state)
  if (!fixture) return null
  return fixture.homeId === state.playerClubId ? fixture.awayId : fixture.homeId
}
