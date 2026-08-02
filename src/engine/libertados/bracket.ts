import { knockoutPairs } from './fixtures'
import {
  KNOCKOUT_ORDER,
  STAGE_NAMES,
  type LibertadosMatch,
  type LibertadosState,
} from './types'

/**
 * O mata-mata da Libertados pronto para a tela.
 *
 * Mesmo contrato do chaveamento da Copa do Brasil: a regra de quem passou é do
 * engine, a tela só desenha. Duplicar isso num componente deixaria a UI
 * decidindo resultado de partida.
 */

export interface LibertadosBracketTie {
  readonly homeId: string
  readonly awayId: string
  readonly homeGoals?: number
  readonly awayGoals?: number
  readonly winnerId?: string
  readonly onPenalties?: boolean
}

export interface LibertadosBracketStage {
  readonly id: string
  readonly name: string
  readonly ties: readonly LibertadosBracketTie[]
}

const aggregate = (matches: readonly LibertadosMatch[], clubId: string): number =>
  matches.reduce(
    (sum, match) => sum + (match.homeId === clubId ? match.homeGoals : match.awayGoals),
    0,
  )

export const libertadosBracket = (
  state: LibertadosState,
): readonly LibertadosBracketStage[] =>
  KNOCKOUT_ORDER.map((stage) => ({
    id: stage,
    name: STAGE_NAMES[stage],
    ties: knockoutPairs(state, stage).map((pair) => {
      const played = state.results.filter(
        (result) =>
          result.stage === stage &&
          pair.includes(result.homeId) &&
          pair.includes(result.awayId),
      )
      // ida e volta: sem os dois jogos o confronto ainda está aberto
      if (played.length < 2) return { homeId: pair[0], awayId: pair[1] }
      const penalties = played.find((match) => match.penaltyWinnerId)
      const homeGoals = aggregate(played, pair[0])
      const awayGoals = aggregate(played, pair[1])
      return {
        homeId: pair[0],
        awayId: pair[1],
        homeGoals,
        awayGoals,
        winnerId: penalties?.penaltyWinnerId ?? (homeGoals >= awayGoals ? pair[0] : pair[1]),
        onPenalties: penalties !== undefined,
      }
    }),
  }))
