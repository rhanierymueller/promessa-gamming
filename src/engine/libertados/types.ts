import type { ScoredMatch } from '../season/season'

/**
 * Copa Libertados: 32 clubes, 8 grupos de 4 em ida e volta e mata-mata das
 * oitavas à final, também em ida e volta. Quem passa é o AGREGADO dos dois
 * jogos; empate vai aos pênaltis. Não existe gol fora — a regra foi abolida.
 */

export const LIBERTADOS_NAME = 'Copa Libertados'

export const GROUP_COUNT = 8
export const GROUP_SIZE = 4
/** Ida e volta: três rodadas de turno, três de returno. */
export const GROUP_ROUNDS = (GROUP_SIZE - 1) * 2
export const POT_COUNT = 4
/** Vagas do Brasil: os 4 primeiros da Série A do ano anterior. */
export const BRAZILIAN_SPOTS = 4
export const CONTINENTAL_SPOTS = GROUP_COUNT * GROUP_SIZE - BRAZILIAN_SPOTS
/** 6 jogos de grupo + 2 em cada uma das 4 fases de mata-mata. */
export const MATCHES_PER_EDITION = GROUP_ROUNDS + 8

export type LibertadosStage =
  | 'groups'
  | 'r16'
  | 'quarter'
  | 'semi'
  | 'final'
  | 'champion'
  | 'eliminated'

export type LibertadosKnockoutStage = Extract<
  LibertadosStage,
  'r16' | 'quarter' | 'semi' | 'final'
>

export const KNOCKOUT_ORDER: readonly LibertadosKnockoutStage[] = [
  'r16', 'quarter', 'semi', 'final',
]

export const STAGE_NAMES: Record<LibertadosStage, string> = {
  groups: 'Fase de grupos',
  r16: 'Oitavas de final',
  quarter: 'Quartas de final',
  semi: 'Semifinal',
  final: 'Final',
  champion: 'Campeão',
  eliminated: 'Eliminado',
}

export interface LibertadosMatch extends ScoredMatch {
  readonly stage: 'groups' | LibertadosKnockoutStage
  /** Grupos: 0-5. Mata-mata: 0 = ida, 1 = volta. */
  readonly round: number
  /** Só na volta: quem levou nos pênaltis com o agregado empatado. */
  readonly penaltyWinnerId?: string
}

export interface LibertadosState {
  readonly seed: number
  /** Ano de carreira da edição. */
  readonly year: number
  /** null = edição simulada, sem clube do jogador. */
  readonly playerClubId: string | null
  /** 8 grupos de 4, na ordem A-H. Com jogador, ele abre o grupo A. */
  readonly groups: readonly (readonly string[])[]
  readonly stage: LibertadosStage
  readonly round: number
  readonly results: readonly LibertadosMatch[]
  readonly championId: string | null
}

/** Letra do grupo na tabela: 0 → A, 1 → B… */
export const groupLetter = (index: number): string => String.fromCharCode(65 + index)

export const isKnockoutStage = (stage: LibertadosStage): stage is LibertadosKnockoutStage =>
  KNOCKOUT_ORDER.includes(stage as LibertadosKnockoutStage)

/** O torneio ainda tem jogo a fazer? */
export const isLibertadosRunning = (stage: LibertadosStage): boolean =>
  stage === 'groups' || isKnockoutStage(stage)

/**
 * Posição do jogo na edição (0-13). É a ponte entre o estado do torneio e a
 * data no calendário.
 */
export const libertadosMatchIndex = (
  stage: 'groups' | LibertadosKnockoutStage,
  round: number,
): number => {
  if (stage === 'groups') return round
  return GROUP_ROUNDS + KNOCKOUT_ORDER.indexOf(stage) * 2 + round
}
