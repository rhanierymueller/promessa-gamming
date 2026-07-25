import { KNOCKOUT_ORDER, type TournamentStage } from '../tournament/tournament'

/**
 * O que a tela de fim de temporada deve oferecer. Existe como função pura
 * porque o erro aqui é o pior possível: a carreira TRAVA. Foi o que aconteceu
 * quando a Copa passou a ser de quatro em quatro anos — em ano sem competição
 * a convocação continuava "disponível", escondendo o botão de virar o ano, e
 * o card da convocação também não aparecia por não haver torneio.
 */

export type SeasonEndAction =
  /** Há convocação esperando: o jogador se apresenta à seleção. */
  | 'callup'
  /** Torneio em andamento: primeiro termine a competição. */
  | 'tournament'
  /** Nada pendente: pode virar o ano. */
  | 'close'

/** A seleção ainda tem jogo a fazer nesta fase? */
export const isTournamentRunning = (stage: TournamentStage): boolean =>
  stage === 'groups' || KNOCKOUT_ORDER.includes(stage as never)

export interface SeasonEndInput {
  /** Forma e vitrine aprovam a convocação. */
  readonly eligible: boolean
  /** Competição de seleção deste ano — null em ano sem torneio. */
  readonly hasTournamentThisYear: boolean
  /** Fase do torneio em andamento, ou null se não há torneio aberto. */
  readonly stage: TournamentStage | null
}

export const seasonEndAction = ({
  eligible,
  hasTournamentThisYear,
  stage,
}: SeasonEndInput): SeasonEndAction => {
  if (stage !== null) return isTournamentRunning(stage) ? 'tournament' : 'close'
  // sem torneio aberto: só há convocação se o ano tiver competição
  return eligible && hasTournamentThisYear ? 'callup' : 'close'
}
