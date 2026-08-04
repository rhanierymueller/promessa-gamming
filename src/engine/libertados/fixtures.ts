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

/**
 * Vencedor do confronto pelo agregado; null enquanto o confronto não tiver
 * dono. Agregado empatado só tem vencedor com os pênaltis registrados na
 * volta: sem eles o confronto ainda não terminou, e devolver um dos dois lados
 * por padrão inventaria um classificado.
 */
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
  return matches.find((match) => match.penaltyWinnerId)?.penaltyWinnerId ?? null
}

/**
 * Os confrontos de uma fase, na ordem da chave.
 *
 * A chave de uma fase só existe quando TODOS os confrontos da fase anterior
 * terminaram: os pares saem de posições consecutivas na lista de vencedores, e
 * um vencedor faltando não deixaria só um buraco — ele encurtaria a lista e
 * desalinharia todos os pares seguintes, cruzando clubes de chaves diferentes.
 * Fase anterior incompleta devolve lista vazia.
 */
export const knockoutPairs = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
): readonly (readonly [string, string])[] => {
  const previous = stageBefore(stage)
  let teams: readonly string[]
  if (previous === null) {
    teams = seededQualifiers(state)
  } else {
    const winners = knockoutPairs(state, previous).map((pair) =>
      tieWinner(state, previous, pair),
    )
    if (winners.length === 0 || winners.some((winner) => winner === null)) return []
    teams = winners as readonly string[]
  }
  const pairs: [string, string][] = []
  for (let i = 0; i + 1 < teams.length; i += 2) pairs.push([teams[i], teams[i + 1]])
  return pairs
}

/**
 * Os confrontos de uma fase ADMITINDO lacunas: `null` onde o classificado
 * ainda não saiu.
 *
 * `knockoutPairs` devolve lista vazia quando a fase anterior não terminou —
 * serve ao motor, mas some da tela: o jogador não vê que existe uma final à
 * frente. Aqui a vaga aparece como vaga.
 */
export const knockoutSlots = (
  state: LibertadosState,
  stage: LibertadosKnockoutStage,
): readonly (readonly [string | null, string | null])[] => {
  const previous = stageBefore(stage)
  let teams: readonly (string | null)[]
  if (previous === null) {
    teams = seededQualifiers(state)
  } else {
    teams = knockoutSlots(state, previous).map((pair) =>
      pair[0] !== null && pair[1] !== null
        ? tieWinner(state, previous, [pair[0], pair[1]] as const)
        : null,
    )
  }
  const pairs: (readonly [string | null, string | null])[] = []
  for (let i = 0; i + 1 < teams.length; i += 2) pairs.push([teams[i], teams[i + 1]] as const)
  return pairs
}

/** Vencedores já decididos de uma fase, na ordem da chave. */
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
