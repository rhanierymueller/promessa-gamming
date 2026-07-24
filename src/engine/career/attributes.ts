import type { ShotConfig } from '../shot/types'
import type { WallConfig } from '../shot/wall'
import type { DefenseConfig } from '../defense/defense'

/**
 * Atributos do craque (1-10) — cada um com efeito REAL na física:
 * finalização afina o chute, cobrança encolhe a barreira, defesa estica a
 * luva, passe aumenta a chance das opções. Sobem com pontos de treino
 * ganhos pelas notas das partidas.
 */
export type AttributeKey = 'finalizacao' | 'passe' | 'cobranca' | 'defesa'

export interface PlayerAttributes {
  readonly finalizacao: number
  readonly passe: number
  readonly cobranca: number
  readonly defesa: number
}

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  finalizacao: 'Finalização',
  passe: 'Passe',
  cobranca: 'Cobrança',
  defesa: 'Defesa',
}

export const ATTRIBUTE_KEYS: readonly AttributeKey[] = ['finalizacao', 'passe', 'cobranca', 'defesa']

export const MIN_ATTRIBUTE = 1
export const MAX_ATTRIBUTE = 10

export const DEFAULT_ATTRIBUTES: PlayerAttributes = {
  finalizacao: 3,
  passe: 3,
  cobranca: 3,
  defesa: 3,
}

/** Nível a partir do qual o treino dobra de preço (jogador de elite). */
const ELITE_LEVEL = 6
/** Nível a partir do qual o treino triplica de preço (nível lenda). */
const LEGEND_LEVEL = 8

/**
 * Subir do nível N para N+1: custa N pontos até o 5, dobra no 6-7 e
 * triplica no 8-9 — o topo é meta de carreira, não de temporada.
 */
export const upgradeCost = (currentLevel: number): number => {
  if (currentLevel >= LEGEND_LEVEL) return currentLevel * 3
  if (currentLevel >= ELITE_LEVEL) return currentLevel * 2
  return currentLevel
}

export const canUpgrade = (
  attributes: PlayerAttributes,
  key: AttributeKey,
  trainingPoints: number,
): boolean =>
  attributes[key] < MAX_ATTRIBUTE && trainingPoints >= upgradeCost(attributes[key])

export const applyUpgrade = (attributes: PlayerAttributes, key: AttributeKey): PlayerAttributes => ({
  ...attributes,
  [key]: Math.min(MAX_ATTRIBUTE, attributes[key] + 1),
})

/** Pontos de treino pela nota: jogão rende mais treino. */
export const trainingPointsForRating = (rating: number): number => {
  if (rating >= 8) return 3
  if (rating >= 6.5) return 2
  if (rating >= 5) return 1
  return 0
}

const levelFactor = (level: number): number =>
  Math.min(MAX_ATTRIBUTE, Math.max(MIN_ATTRIBUTE, level)) - 1

/** Finalização: chute mais confiável — dispersão cai até ~67% no nível máximo. */
export const shotTuning = (config: ShotConfig, finalizacao: number): ShotConfig => {
  const precision = 1 - levelFactor(finalizacao) * 0.075
  return {
    ...config,
    dispersionX: config.dispersionX * precision,
    dispersionHeight: config.dispersionHeight * precision,
  }
}

/** Cobrança: a barreira "encolhe" — pulo rende menos contra cobrador de elite. */
export const wallTuning = (wall: WallConfig, cobranca: number): WallConfig => ({
  ...wall,
  jumpBoost: wall.jumpBoost * (1 - levelFactor(cobranca) * 0.07),
})

/** Defesa: luva mais comprida e leitura que aguenta atraso maior. */
export const defenseTuning = (config: DefenseConfig, defesa: number): DefenseConfig => ({
  ...config,
  reach: config.reach * (1 + levelFactor(defesa) * 0.06),
  lateDiveT: Math.min(0.85, config.lateDiveT + levelFactor(defesa) * 0.012),
})

/** Passe: bônus direto na chance de sucesso das opções (cap para nunca ser garantido). */
export const passBonus = (passe: number): number => levelFactor(passe) * 0.02

export const boostedPassChance = (baseChance: number, passe: number): number =>
  Math.min(0.97, baseChance + passBonus(passe))
