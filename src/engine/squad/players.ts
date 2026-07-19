import type { Club } from '../../data/clubs'
import { squadFor } from '../../data/squadNames'
import type { PlayerAttributes } from '../career/attributes'
import { ageFactor, RETIRE_AGE, type Potential } from './aging'

/**
 * Elencos completos estilo FIFA: cada clube tem 18 jogadores determinísticos
 * (mesmo clube = mesmo elenco sempre), com posição, idade, seis atributos e
 * overall ponderado pela posição — clube forte joga mais em tudo.
 */

export type SquadPosition = 'GOL' | 'LD' | 'ZAG' | 'LE' | 'VOL' | 'MEI' | 'PON' | 'ATA'

export interface FifaAttributes {
  /** Ritmo (velocidade). */
  readonly pac: number
  /** Finalização. */
  readonly fin: number
  /** Passe. */
  readonly pas: number
  /** Drible. */
  readonly dri: number
  /** Defesa (no goleiro, a luva). */
  readonly def: number
  /** Físico. */
  readonly fis: number
}

export interface SquadPlayer {
  readonly id: string
  readonly name: string
  readonly position: SquadPosition
  /** Posições secundárias — joga nelas com queda leve (nem todos têm). */
  readonly altPositions: readonly SquadPosition[]
  readonly age: number
  /** Teto de carreira: define até onde o jovem pode chegar. */
  readonly potential: Potential
  readonly shirt: number
  readonly attrs: FifaAttributes
  readonly overall: number
}

export const SQUAD_SIZE = 18

/** 4-3-3 clássico; o índice 9 (ATA) é o do protagonista, igual à LivePitch. */
export const STARTING_FORMATION: readonly SquadPosition[] = [
  'GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MEI', 'MEI', 'PON', 'ATA', 'PON',
]

export const USER_SQUAD_INDEX = 9

/** Id fixo do SEU craque dentro de qualquer elenco. */
export const USER_PLAYER_ID = 'voce'

const BENCH_POSITIONS: readonly SquadPosition[] = ['GOL', 'ZAG', 'LE', 'VOL', 'MEI', 'PON', 'ATA']

const ATTR_KEYS = ['pac', 'fin', 'pas', 'dri', 'def', 'fis'] as const

/** Pesos do overall por posição (somam 1). */
const OVERALL_WEIGHTS: Record<SquadPosition, FifaAttributes> = {
  GOL: { def: 0.55, fis: 0.2, pas: 0.1, pac: 0.05, dri: 0.05, fin: 0.05 },
  ZAG: { def: 0.5, fis: 0.25, pac: 0.1, pas: 0.1, dri: 0.03, fin: 0.02 },
  LD: { pac: 0.3, def: 0.3, fis: 0.15, pas: 0.15, dri: 0.07, fin: 0.03 },
  LE: { pac: 0.3, def: 0.3, fis: 0.15, pas: 0.15, dri: 0.07, fin: 0.03 },
  VOL: { def: 0.35, pas: 0.25, fis: 0.2, dri: 0.1, pac: 0.07, fin: 0.03 },
  MEI: { pas: 0.35, dri: 0.25, fin: 0.12, pac: 0.1, def: 0.1, fis: 0.08 },
  PON: { pac: 0.3, dri: 0.3, fin: 0.2, pas: 0.12, fis: 0.05, def: 0.03 },
  ATA: { fin: 0.4, pac: 0.2, dri: 0.18, fis: 0.12, pas: 0.08, def: 0.02 },
}

/** Boost dos atributos que definem a posição e pena nos irrelevantes. */
const POSITION_SHAPE: Record<SquadPosition, { readonly strong: readonly (keyof FifaAttributes)[]; readonly weak: readonly (keyof FifaAttributes)[] }> = {
  GOL: { strong: ['def'], weak: ['fin', 'dri', 'pac'] },
  ZAG: { strong: ['def', 'fis'], weak: ['fin', 'dri'] },
  LD: { strong: ['pac', 'def'], weak: ['fin'] },
  LE: { strong: ['pac', 'def'], weak: ['fin'] },
  VOL: { strong: ['def', 'pas'], weak: ['fin'] },
  MEI: { strong: ['pas', 'dri'], weak: ['def'] },
  PON: { strong: ['pac', 'dri'], weak: ['def'] },
  ATA: { strong: ['fin', 'pac'], weak: ['def'] },
}

/** Vizinhos naturais de cada posição — candidatos a posição secundária. */
const ALT_CANDIDATES: Record<SquadPosition, readonly SquadPosition[]> = {
  GOL: [],
  ZAG: ['VOL', 'LD'],
  LD: ['ZAG', 'PON'],
  LE: ['ZAG', 'PON'],
  VOL: ['ZAG', 'MEI'],
  MEI: ['VOL', 'PON'],
  PON: ['ATA', 'MEI'],
  ATA: ['PON', 'MEI'],
}

/** Fração dos jogadores de linha que dominam uma segunda posição. */
const ALT_POSITION_SHARE = 0.45

const STRONG_BOOST = 8
const WEAK_PENALTY = 12
const CLUB_BASE = 40
const CLUB_PER_STAR = 7
const PLAYER_SPREAD = 5
const ATTR_SPREAD = 6
const MIN_ATTR = 35
const MAX_ATTR = 92

/** Escala dos atributos treináveis do craque (1-10) para a régua FIFA. */
const USER_ATTR_BASE = 45
const USER_ATTR_PER_LEVEL = 5

const hashSeed = (input: string): number => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const nextRoll = (state: number): readonly [number, number] => {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0
  return [next / 4294967296, next]
}

const clampAttr = (value: number): number => Math.max(MIN_ATTR, Math.min(MAX_ATTR, Math.round(value)))

const overallFor = (position: SquadPosition, attrs: FifaAttributes): number => {
  const weights = OVERALL_WEIGHTS[position]
  const weighted = ATTR_KEYS.reduce((sum, key) => sum + attrs[key] * weights[key], 0)
  return Math.round(weighted)
}

/** Sorteio de potencial: poucos craques em formação, muitos medianos. */
const POTENTIAL_HIGH_SHARE = 0.15
const POTENTIAL_MEDIUM_SHARE = 0.55

const BASE_MIN_AGE = 17
const BASE_MAX_AGE = 36
/** Regens chegam da base: 16 a 21 anos. */
const REGEN_MIN_AGE = 16
const REGEN_MAX_AGE = 21

interface PeakPlayer {
  readonly attrs: FifaAttributes
  readonly baseAge: number
  readonly potential: Potential
  readonly altPositions: readonly SquadPosition[]
  readonly nextState: number
}

/** Sorteia um jogador "de pico": atributos máximos, idade-base e potencial. */
const rollPeakPlayer = (
  state: number,
  position: SquadPosition,
  clubBase: number,
  minAge: number,
  maxAge: number,
): PeakPlayer => {
  const shape = POSITION_SHAPE[position]
  const [playerRoll, s1] = nextRoll(state)
  let current = s1
  const playerShift = (playerRoll - 0.5) * 2 * PLAYER_SPREAD

  const values = {} as Record<keyof FifaAttributes, number>
  for (const key of ATTR_KEYS) {
    const [attrRoll, s2] = nextRoll(current)
    current = s2
    const attrShift = (attrRoll - 0.5) * 2 * ATTR_SPREAD
    const shapeShift = shape.strong.includes(key)
      ? STRONG_BOOST
      : shape.weak.includes(key)
        ? -WEAK_PENALTY
        : 0
    values[key] = clampAttr(clubBase + playerShift + attrShift + shapeShift)
  }

  const [ageRoll, s3] = nextRoll(current)
  current = s3
  const baseAge = minAge + Math.floor(ageRoll * (maxAge - minAge + 1))

  const [potentialRoll, s4] = nextRoll(current)
  current = s4
  const potential: Potential =
    potentialRoll < POTENTIAL_HIGH_SHARE
      ? 'alto'
      : potentialRoll < POTENTIAL_HIGH_SHARE + POTENTIAL_MEDIUM_SHARE
        ? 'medio'
        : 'baixo'

  const [altRoll, s5] = nextRoll(current)
  current = s5
  const candidates = ALT_CANDIDATES[position]
  const altPositions =
    candidates.length > 0 && altRoll < ALT_POSITION_SHARE
      ? [candidates[Math.floor((altRoll / ALT_POSITION_SHARE) * candidates.length) % candidates.length]]
      : []

  return { attrs: values, baseAge, potential, altPositions, nextState: current }
}

const scaleAttrs = (peak: FifaAttributes, factor: number): FifaAttributes => ({
  pac: clampAttr(peak.pac * factor),
  fin: clampAttr(peak.fin * factor),
  pas: clampAttr(peak.pas * factor),
  dri: clampAttr(peak.dri * factor),
  def: clampAttr(peak.def * factor),
  fis: clampAttr(peak.fis * factor),
})

/**
 * Elenco do clube na temporada `careerYear`: todo mundo envelhece +1 por ano,
 * jovens crescem rumo ao potencial, veteranos decaem dos 32 em diante e quem
 * passa dos 38 se aposenta — um garoto da base (regen) herda a vaga.
 */
export const squadPlayersFor = (club: Club, careerYear = 1): readonly SquadPlayer[] => {
  const names = squadFor(`${club.id}-elenco`, SQUAD_SIZE)
  const positions = [...STARTING_FORMATION, ...BENCH_POSITIONS]
  const clubBase = CLUB_BASE + club.strength * CLUB_PER_STAR
  let state = hashSeed(`${club.id}-atributos`)

  return positions.map((position, index) => {
    const first = rollPeakPlayer(state, position, clubBase, BASE_MIN_AGE, BASE_MAX_AGE)
    state = first.nextState

    // gerações: quando um jogador passa dos 38, o regen assume no ano seguinte
    let generation = 0
    let peak = first
    let name = names[index] ?? `Jogador ${index + 1}`
    let age = peak.baseAge + (careerYear - 1)
    while (age > RETIRE_AGE) {
      const yearsPastRetire = age - RETIRE_AGE
      generation++
      const regenState = hashSeed(`${club.id}-${index}-gen${generation}`)
      peak = rollPeakPlayer(regenState, position, clubBase, REGEN_MIN_AGE, REGEN_MAX_AGE)
      name = squadFor(`${club.id}-elenco-gen${generation}`, SQUAD_SIZE)[index] ?? name
      age = peak.baseAge + (yearsPastRetire - 1)
    }

    const factor = ageFactor(age, peak.potential)
    const attrs = scaleAttrs(peak.attrs, factor)
    return {
      id: generation === 0 ? `${club.id}-${index}` : `${club.id}-${index}-g${generation}`,
      name,
      position,
      altPositions: peak.altPositions,
      age,
      potential: peak.potential,
      shirt: index + 1,
      attrs,
      overall: overallFor(position, attrs),
    }
  })
}

/**
 * O craque do jogador dentro do elenco: FIN/PAS/DEF vêm dos atributos REAIS
 * treinados no jogo; ritmo, drible e físico herdam do atacante-base do clube.
 */
export const userAsSquadPlayer = (
  base: SquadPlayer,
  name: string,
  attributes: PlayerAttributes,
  position: SquadPosition = base.position,
): SquadPlayer => {
  const scale = (level: number): number => USER_ATTR_BASE + level * USER_ATTR_PER_LEVEL
  const attrs: FifaAttributes = {
    pac: base.attrs.pac,
    dri: base.attrs.dri,
    fis: base.attrs.fis,
    fin: scale(attributes.finalizacao),
    pas: scale(attributes.passe),
    def: scale(attributes.defesa),
  }
  return {
    ...base,
    id: USER_PLAYER_ID,
    name,
    position,
    altPositions: ALT_CANDIDATES[position],
    potential: 'alto',
    attrs,
    overall: overallFor(position, attrs),
  }
}


/** Quão à vontade o jogador está numa posição. */
export type PositionFit = 'natural' | 'secundaria' | 'improvisado'

export const positionFit = (player: SquadPlayer, position: SquadPosition): PositionFit => {
  if (position === player.position) return 'natural'
  if (player.altPositions.includes(position)) return 'secundaria'
  return 'improvisado'
}

const SECONDARY_PENALTY = 2
const OUT_OF_POSITION_PENALTY = 8
/** Linha no gol (ou goleiro na linha) é outra profissão. */
const KEEPER_SWAP_PENALTY = 25
const MIN_EFFECTIVE_OVERALL = 25

/**
 * Overall EFETIVO numa posição: recalculado pelos pesos dela (um zagueiro tem
 * finalização baixa) e punido pelo improviso — sem bloqueio, só consequência.
 */
export const overallAt = (player: SquadPlayer, position: SquadPosition): number => {
  const fit = positionFit(player, position)
  const crossesKeeper = (position === 'GOL') !== (player.position === 'GOL')
  const penalty = crossesKeeper
    ? KEEPER_SWAP_PENALTY
    : fit === 'natural'
      ? 0
      : fit === 'secundaria'
        ? SECONDARY_PENALTY
        : OUT_OF_POSITION_PENALTY
  return Math.max(MIN_EFFECTIVE_OVERALL, overallFor(position, player.attrs) - penalty)
}

/** Força da escalação: média dos overalls efetivos nos slots da formação. */
export const lineupRating = (
  players: readonly (SquadPlayer | undefined)[],
  slots: readonly SquadPosition[],
): number => {
  const values = slots.map((slot, index) => {
    const player = players[index]
    return player ? overallAt(player, slot) : MIN_EFFECTIVE_OVERALL
  })
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}
