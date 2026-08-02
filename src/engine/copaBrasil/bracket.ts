import { stagePairs } from './copaBrasil'
import {
  KNOCKOUT_ORDER,
  STAGE_NAMES,
  type CopaBrasilKnockoutStage,
  type CopaBrasilMatch,
  type CopaBrasilState,
} from './types'

/**
 * O chaveamento da Copa do Brasil pronto para a tela.
 *
 * Traduz o estado do motor no que a UI precisa mostrar: quem enfrenta quem em
 * cada fase, o agregado dos que já foram e quem passou. Fica no engine, e não
 * no componente, porque a regra de "quem venceu" é do jogo — a tela só desenha.
 */

export interface BracketTieView {
  readonly homeId: string
  readonly awayId: string
  readonly homeGoals?: number
  readonly awayGoals?: number
  readonly winnerId?: string
  readonly onPenalties?: boolean
}

export interface BracketStageView {
  readonly id: string
  readonly name: string
  readonly ties: readonly BracketTieView[]
}

/** Gols de um clube num confronto, somando ida e volta. */
const aggregate = (matches: readonly CopaBrasilMatch[], clubId: string): number =>
  matches.reduce(
    (sum, match) => sum + (match.homeId === clubId ? match.homeGoals : match.awayGoals),
    0,
  )

export const copaBrasilBracket = (state: CopaBrasilState): readonly BracketStageView[] =>
  KNOCKOUT_ORDER.map((stage: CopaBrasilKnockoutStage) => ({
    id: stage,
    name: STAGE_NAMES[stage],
    ties: stagePairs(state, stage).map((pair) => {
      const played = state.results.filter(
        (result) =>
          result.stage === stage &&
          pair.includes(result.homeId) &&
          pair.includes(result.awayId),
      )
      // o confronto só está decidido com os DOIS jogos na conta
      if (played.length < 2) {
        return { homeId: pair[0], awayId: pair[1] }
      }
      const penalties = played.find((match) => match.penaltyWinnerId)
      const homeGoals = aggregate(played, pair[0])
      const awayGoals = aggregate(played, pair[1])
      return {
        homeId: pair[0],
        awayId: pair[1],
        homeGoals,
        awayGoals,
        winnerId:
          penalties?.penaltyWinnerId ?? (homeGoals >= awayGoals ? pair[0] : pair[1]),
        onPenalties: penalties !== undefined,
      }
    }),
  }))
