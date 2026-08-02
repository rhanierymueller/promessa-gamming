import type { ScoredMatch } from '../season/season'

/**
 * Copa do Brasil: mata-mata puro, dos 16 avos à final, sempre em ida e volta.
 *
 * Ao contrário da liga, ela mistura a pirâmide inteira: 32 clubes sorteados
 * entre as quatro divisões, com a Série A dominando mas a Série D presente —
 * é a competição onde o time pequeno cruza com o grande.
 */

export const COPA_BRASIL_NAME = 'Copa do Brasil'

/** Clubes na chave: 16 avos com 32 times. */
export const COPA_BRASIL_TEAMS = 32

export type CopaBrasilStage =
  | 'r32'
  | 'r16'
  | 'quarter'
  | 'semi'
  | 'final'
  | 'champion'
  | 'eliminated'

export type CopaBrasilKnockoutStage = Extract<
  CopaBrasilStage,
  'r32' | 'r16' | 'quarter' | 'semi' | 'final'
>

export const KNOCKOUT_ORDER: readonly CopaBrasilKnockoutStage[] = [
  'r32', 'r16', 'quarter', 'semi', 'final',
]

export const STAGE_NAMES: Record<CopaBrasilStage, string> = {
  r32: ' 16 avos de final',
  r16: 'Oitavas de final',
  quarter: 'Quartas de final',
  semi: 'Semifinal',
  final: 'Final',
  champion: 'Campeão',
  eliminated: 'Eliminado',
}

/** Cinco fases, duas partidas cada. */
export const MATCHES_PER_EDITION = KNOCKOUT_ORDER.length * 2

export interface CopaBrasilMatch extends ScoredMatch {
  readonly stage: CopaBrasilKnockoutStage
  /** 0 = ida, 1 = volta. */
  readonly round: number
  /** Só na volta: quem levou nos pênaltis com o agregado empatado. */
  readonly penaltyWinnerId?: string
}

export interface CopaBrasilState {
  readonly seed: number
  /** Ano de carreira da edição. */
  readonly year: number
  /** null = edição simulada, sem o clube do jogador. */
  readonly playerClubId: string | null
  /** Os 32 sorteados, na ordem da chave: 0 enfrenta 1, 2 enfrenta 3… */
  readonly bracket: readonly string[]
  readonly stage: CopaBrasilStage
  /** 0 = ida, 1 = volta. */
  readonly round: number
  readonly results: readonly CopaBrasilMatch[]
  readonly championId: string | null
}

export const isKnockoutStage = (stage: CopaBrasilStage): stage is CopaBrasilKnockoutStage =>
  KNOCKOUT_ORDER.includes(stage as CopaBrasilKnockoutStage)

/** A edição ainda tem jogo a fazer? */
export const isCopaBrasilRunning = (stage: CopaBrasilStage): boolean => isKnockoutStage(stage)

/**
 * Índice do jogo na edição (0-9): duas partidas por fase, na ordem da chave.
 * É o que casa cada compromisso com a data dele no calendário.
 */
export const copaBrasilMatchIndex = (stage: CopaBrasilKnockoutStage, round: number): number =>
  KNOCKOUT_ORDER.indexOf(stage) * 2 + round

/** Quantos clubes restam numa fase: 32 nos 16 avos, 16 nas oitavas… */
export const teamsInStage = (stage: CopaBrasilKnockoutStage): number =>
  COPA_BRASIL_TEAMS / 2 ** KNOCKOUT_ORDER.indexOf(stage)
