import type { DefenseConfig } from '../defense/defense'
import type { ShotConfig } from '../shot/types'
import type { WallConfig } from '../shot/wall'

/**
 * Perks: habilidades de RPG desbloqueadas por MARCOS da carreira (escolha 1
 * de 3). Cada perk tem efeito real na física dos lances ou na economia de
 * treino — é o que diferencia um matador de um maestro.
 */

export type PerkId =
  | 'folha-seca'
  | 'frieza'
  | 'maestro'
  | 'capitao'
  | 'matador'
  | 'muralha'
  | 'idolo-da-torcida'
  | 'craque-de-copa'

export interface Perk {
  readonly id: PerkId
  readonly name: string
  readonly description: string
}

export const PERKS: readonly Perk[] = [
  { id: 'folha-seca', name: 'Folha Seca', description: 'Sua cobrança engana a barreira: o pulo deles rende 15% menos.' },
  { id: 'frieza', name: 'Frieza', description: 'O tempo desacelera: +50% de tempo para decidir nos passes.' },
  { id: 'maestro', name: 'Maestro', description: 'Visão de camisa 10: +5% de chance em todas as opções de passe.' },
  { id: 'capitao', name: 'Capitão', description: 'Sua atuação contagia: momentum positivo 30% mais forte no time.' },
  { id: 'matador', name: 'Matador', description: 'Frio no desespero: chute 15% mais preciso quando o jogo está empatado ou perdendo.' },
  { id: 'muralha', name: 'Muralha', description: 'Reflexo de paredão: alcance da luva 6% maior nas defesas.' },
  { id: 'idolo-da-torcida', name: 'Ídolo da Torcida', description: 'A arquibancada te empurra: +1 ponto de treino em toda vitória.' },
  { id: 'craque-de-copa', name: 'Craque de Copa', description: 'Palco grande não te assusta: chute 12% mais preciso em jogos de seleção.' },
]

export const PERK_IDS: readonly PerkId[] = PERKS.map((perk) => perk.id)

export const perkById = (id: PerkId): Perk => PERKS.find((perk) => perk.id === id)!

export const isPerkId = (value: unknown): value is PerkId =>
  typeof value === 'string' && (PERK_IDS as readonly string[]).includes(value)

/**
 * A habilidade é a recompensa mais rara da carreira: só sai depois de CINCO
 * atuações NOTA 10. Escolher zera a contagem. Antes eram seis marcos soltos
 * (nota 8+, 10 gols, acesso, título...) e a escolha pipocava toda hora.
 */
export const PERFECT_RATING = 10
export const PERFECT_GAMES_FOR_PERK = 5

export const PERK_OFFER_REASON =
  `${PERFECT_GAMES_FOR_PERK} atuações nota ${PERFECT_RATING} — o estrelato cobra o preço dele.`

/** A partida entra na conta de atuações perfeitas? */
export const isPerfectRating = (rating: number): boolean => rating >= PERFECT_RATING

const OFFER_SIZE = 3

/** Trio oferecido: as habilidades que o craque ainda não tem. */
export const perkOptionsFor = (owned: readonly PerkId[]): readonly PerkId[] =>
  PERK_IDS.filter((id) => !owned.includes(id)).slice(0, OFFER_SIZE)

/** Contexto do lance — decide quais perks de chute se aplicam. */
export interface ShotPerkContext {
  /** Time empatando ou perdendo (hora do matador). */
  readonly clutch: boolean
  /** Jogo de torneio de seleções. */
  readonly tournament: boolean
}

const MATADOR_PRECISION = 0.85
const COPA_PRECISION = 0.88
const FOLHA_SECA_WALL = 0.85
const MURALHA_REACH = 1.06
const MAESTRO_PASS_BONUS = 0.05
const MAX_PASS_CHANCE = 0.97
const FRIEZA_TIME_FACTOR = 1.5
const CAPITAO_MOMENTUM = 1.3
const MAX_MOMENTUM = 1
const IDOLO_WIN_POINTS = 1

export const applyPerksToShot = (
  config: ShotConfig,
  perks: readonly PerkId[],
  context: ShotPerkContext,
): ShotConfig => {
  const matador = perks.includes('matador') && context.clutch ? MATADOR_PRECISION : 1
  const copa = perks.includes('craque-de-copa') && context.tournament ? COPA_PRECISION : 1
  const precision = matador * copa
  if (precision === 1) return config
  return {
    ...config,
    dispersionX: config.dispersionX * precision,
    dispersionHeight: config.dispersionHeight * precision,
  }
}

export const applyPerksToWall = (wall: WallConfig, perks: readonly PerkId[]): WallConfig =>
  perks.includes('folha-seca') ? { ...wall, jumpBoost: wall.jumpBoost * FOLHA_SECA_WALL } : wall

export const applyPerksToDefense = (
  config: DefenseConfig,
  perks: readonly PerkId[],
): DefenseConfig =>
  perks.includes('muralha') ? { ...config, reach: config.reach * MURALHA_REACH } : config

export const perkPassChance = (baseChance: number, perks: readonly PerkId[]): number =>
  perks.includes('maestro')
    ? Math.min(MAX_PASS_CHANCE, baseChance + MAESTRO_PASS_BONUS)
    : baseChance

export const perkDecisionSeconds = (baseSeconds: number, perks: readonly PerkId[]): number =>
  perks.includes('frieza') ? baseSeconds * FRIEZA_TIME_FACTOR : baseSeconds

/** Capitão amplia o contágio positivo — jogar mal segue pesando igual. */
export const captainMomentum = (momentum: number, perks: readonly PerkId[]): number =>
  perks.includes('capitao') && momentum > 0
    ? Math.min(MAX_MOMENTUM, momentum * CAPITAO_MOMENTUM)
    : momentum

export const perkTrainingBonus = (perks: readonly PerkId[], isWin: boolean): number =>
  perks.includes('idolo-da-torcida') && isWin ? IDOLO_WIN_POINTS : 0
