import { nationalName } from '../../data/nationalNames'
import { NATIONS } from '../../data/nations'
import { FIRST_NAMES, FIRST_NAMES_F, SURNAMES } from '../../data/squadNames'
import { ageValueMultiplier } from './valuation'
import { ageFactor, RETIRE_AGE, type Potential } from '../squad/aging'
import type { FifaAttributes, SquadPlayer, SquadPosition } from '../squad/players'
import type { PlayerGender } from '../../state/save'

/**
 * Transfermarket: verba por divisão, preço que segue o overall (estilo FIFA)
 * e um leque determinístico de jogadores por temporada. Contratados entram
 * no elenco no lugar do jogador mais fraco da posição.
 */

/** Verba da temporada por divisão (0 = Série A). */
const DIVISION_BUDGETS: Record<number, number> = {
  0: 20_000_000,
  1: 12_000_000,
  2: 800_000,
  3: 500_000,
}

export const allowanceFor = (division: number): number => DIVISION_BUDGETS[division] ?? 500_000

/** Prêmio por TÍTULO da divisão (0 = Série A). Copa de seleção não paga. */
const TITLE_PRIZES: Record<number, number> = {
  0: 4_500_000,
  1: 2_000_000,
  2: 1_000_000,
  3: 500_000,
}

export const titlePrizeFor = (division: number): number => TITLE_PRIZES[division] ?? 0

interface PriceRange {
  readonly min: number
  readonly max: number
}

/** Faixas de preço por qualidade — de R$ 400 mil pra cima, overall 60+. */
const PRICE_TIERS: readonly { readonly maxOverall: number; readonly range: PriceRange }[] = [
  { maxOverall: 59, range: { min: 200_000, max: 390_000 } },
  { maxOverall: 61, range: { min: 400_000, max: 800_000 } },
  { maxOverall: 69, range: { min: 1_500_000, max: 8_000_000 } },
  { maxOverall: 75, range: { min: 8_000_000, max: 15_000_000 } },
  { maxOverall: 81, range: { min: 15_000_000, max: 25_000_000 } },
  { maxOverall: 99, range: { min: 30_000_000, max: 150_000_000 } },
]

/** Piso de mercado: nem o veterano mais desvalorizado sai de graça. */
const MIN_PRICE = 120_000

/**
 * Variação aleatória em torno do meio da faixa. Estreita de propósito: com o
 * sorteio na faixa inteira (até 1,9× entre extremos), o acaso engolia o efeito
 * da idade e um veterano saía mais caro que um garoto do mesmo overall.
 */
const PRICE_JITTER = 0.18

/** Preço base do overall, com uma variação pequena para não ficar tabelado. */
const basePriceFor = (range: PriceRange, roll: number): number => {
  const middle = (range.min + range.max) / 2
  return middle * (1 - PRICE_JITTER + roll * PRICE_JITTER * 2)
}

export const priceRangeFor = (overall: number): PriceRange =>
  (PRICE_TIERS.find((tier) => overall <= tier.maxOverall) ?? PRICE_TIERS[PRICE_TIERS.length - 1]).range

/** Estrelas de overall (0.5 a 5, como no FIFA): ~45=1★, ~67=3★, 88+=5★. */
export const starsFor = (overall: number): number => {
  const stars = Math.round(((overall - 45) / 11) * 2) / 2 + 1
  return Math.max(0.5, Math.min(5, stars))
}

/** R$ em mil/mi, curto para caber na UI. */
export const formatMoney = (value: number): string => {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    const text = Number.isInteger(millions)
      ? String(millions)
      : millions.toFixed(1).replace('.', ',')
    return `R$ ${text} mi`
  }
  return `R$ ${Math.round(value / 1000)} mil`
}

/** Jogador anunciado no mercado. */
export interface MarketPlayer extends SquadPlayer {
  readonly nationality: string
  readonly price: number
  /** Atributos de pico (para envelhecer após a compra). */
  readonly peakAttrs: FifaAttributes
  readonly baseAge: number
}

/** Contratação gravada no save — deriva o jogador atual a cada temporada. */
export interface Signing {
  readonly id: string
  readonly name: string
  readonly position: SquadPosition
  readonly altPositions: readonly SquadPosition[]
  readonly nationality: string
  readonly baseAge: number
  readonly boughtYear: number
  readonly potential: Potential
  readonly peakAttrs: FifaAttributes
  readonly price: number
}

const POOL_SIZE = 160
const MARKET_MIN_AGE = 16
const MARKET_MAX_AGE = 36

const POSITIONS: readonly SquadPosition[] = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MEI', 'PON', 'ATA']

/** Distribuição de qualidade: muitos acessíveis, poucos galácticos. */
const OVERALL_BANDS: readonly { readonly weight: number; readonly min: number; readonly max: number }[] = [
  { weight: 0.26, min: 44, max: 54 },
  { weight: 0.22, min: 55, max: 61 },
  { weight: 0.24, min: 62, max: 69 },
  { weight: 0.14, min: 70, max: 75 },
  { weight: 0.09, min: 76, max: 81 },
  { weight: 0.05, min: 82, max: 90 },
]

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

const ATTR_KEYS = ['pac', 'fin', 'pas', 'dri', 'def', 'fis'] as const

export const overallFor = (position: SquadPosition, attrs: FifaAttributes): number => {
  const weights = OVERALL_WEIGHTS[position]
  return Math.round(ATTR_KEYS.reduce((sum, key) => sum + attrs[key] * weights[key], 0))
}

export const clampAttr = (value: number): number => Math.max(30, Math.min(95, Math.round(value)))

export const hashSeed = (input: string): number => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const nextRoll = (state: number): readonly [number, number] => {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0
  return [next / 4294967296, next]
}

export const scaleAttrs = (peak: FifaAttributes, factor: number): FifaAttributes => ({
  pac: clampAttr(peak.pac * factor),
  fin: clampAttr(peak.fin * factor),
  pas: clampAttr(peak.pas * factor),
  dri: clampAttr(peak.dri * factor),
  def: clampAttr(peak.def * factor),
  fis: clampAttr(peak.fis * factor),
})

const brazilianName = (rollFirst: number, rollLast: number, gender: PlayerGender): string => {
  const firsts = gender === 'feminino' ? FIRST_NAMES_F : FIRST_NAMES
  const first = firsts[Math.floor(rollFirst * firsts.length) % firsts.length]
  const last = SURNAMES[Math.floor(rollLast * SURNAMES.length) % SURNAMES.length]
  return `${first} ${last}`
}

/** Nome único no pool: nacionalidade certa e sem repetição (varre o banco). */
export const uniqueName = (
  nationality: string,
  rollFirst: number,
  rollLast: number,
  used: Set<string>,
  gender: PlayerGender = 'masculino',
): string => {
  for (let attempt = 0; attempt < 40; attempt++) {
    const shiftedLast = (rollLast + attempt * 0.0625) % 1
    const shiftedFirst = (rollFirst + Math.floor(attempt / 16) * 0.0625) % 1
    const name =
      nationality === 'brasil'
        ? brazilianName(shiftedFirst, shiftedLast, gender)
        : nationalName(nationality, shiftedFirst, shiftedLast, gender)
          ?? brazilianName(shiftedFirst, shiftedLast, gender)
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
  const fallback = `${nationality}-${used.size}`
  used.add(fallback)
  return fallback
}

/**
 * Galácticos curados: nomes COMUNS de verdade com sobrenomes fictícios —
 * nunca a combinação exata de um atleta real (decisão jurídica do projeto).
 */
const LEGENDS: readonly {
  readonly name: string
  readonly nationality: string
  readonly position: SquadPosition
  readonly age: number
  readonly target: number
}[] = [
  { name: 'Ronaldo Bezerra', nationality: 'brasil', position: 'ATA', age: 26, target: 93 },
  { name: 'Ronaldo Vilela', nationality: 'portugal', position: 'PON', age: 29, target: 92 },
  { name: 'Vinícius Sales', nationality: 'brasil', position: 'PON', age: 24, target: 91 },
  { name: 'Alisson Prado', nationality: 'brasil', position: 'GOL', age: 28, target: 90 },
  { name: 'Adriano Farias', nationality: 'brasil', position: 'ATA', age: 27, target: 89 },
  { name: 'Harry Colton', nationality: 'inglaterra', position: 'ATA', age: 28, target: 90 },
  { name: 'Kevin Lemmens', nationality: 'belgica', position: 'MEI', age: 29, target: 91 },
  { name: 'Antoine Renard', nationality: 'franca', position: 'ATA', age: 27, target: 90 },
  { name: 'Sergio Salas', nationality: 'espanha', position: 'VOL', age: 30, target: 89 },
  { name: 'Lukas Brandt', nationality: 'alemanha', position: 'MEI', age: 26, target: 89 },
]

/**
 * As mesmas dez estrelas do mercado feminino: mesma quantidade, mesmas
 * posições, mesmas idades e os mesmos tetos de overall — só os nomes mudam,
 * para que potencial, evolução e preço se comportem igual nas duas carreiras.
 */
const LEGENDS_F: typeof LEGENDS = [
  { name: 'Marta Bezerra', nationality: 'brasil', position: 'ATA', age: 26, target: 93 },
  { name: 'Carolina Vilela', nationality: 'portugal', position: 'PON', age: 29, target: 92 },
  { name: 'Debinha Sales', nationality: 'brasil', position: 'PON', age: 24, target: 91 },
  { name: 'Bárbara Prado', nationality: 'brasil', position: 'GOL', age: 28, target: 90 },
  { name: 'Cristiane Farias', nationality: 'brasil', position: 'ATA', age: 27, target: 89 },
  { name: 'Ellen Colton', nationality: 'inglaterra', position: 'ATA', age: 28, target: 90 },
  { name: 'Tessa Lemmens', nationality: 'belgica', position: 'MEI', age: 29, target: 91 },
  { name: 'Amandine Renard', nationality: 'franca', position: 'ATA', age: 27, target: 90 },
  { name: 'Alexia Salas', nationality: 'espanha', position: 'VOL', age: 30, target: 89 },
  { name: 'Lena Brandt', nationality: 'alemanha', position: 'MEI', age: 26, target: 89 },
]

/** O leque da temporada: determinístico pela seed da temporada + ano. */
export const marketPoolFor = (
  seasonSeed: number,
  careerYear: number,
  gender: PlayerGender = 'masculino',
): readonly MarketPlayer[] => {
  let state = hashSeed(`mercado-${seasonSeed}-${careerYear}`)
  const lendas = gender === 'feminino' ? LEGENDS_F : LEGENDS
  const usedNames = new Set<string>(lendas.map((legend) => legend.name))
  const pool: MarketPlayer[] = []

  // os craques de vitrine primeiro — o sonho de consumo da Série A
  for (const [index, legend] of lendas.entries()) {
    // semente pelo ÍNDICE, não pelo nome: assim a estrela nº 3 tem os mesmos
    // atributos nas duas carreiras, e só o nome muda entre elas
    const legendState = hashSeed(`lenda-${index}`)
    const factor = ageFactor(legend.age, 'alto')
    const peakTarget = legend.target / factor
    const weights = OVERALL_WEIGHTS[legend.position]
    const attrs = {} as Record<(typeof ATTR_KEYS)[number], number>
    let roll = legendState
    for (const key of ATTR_KEYS) {
      const [value, next] = nextRoll(roll)
      roll = next
      const emphasis = weights[key] >= 0.2 ? 5 : weights[key] <= 0.05 ? -6 : 0
      attrs[key] = clampAttr(peakTarget + emphasis + (value - 0.5) * 4)
    }
    const peakAttrs: FifaAttributes = attrs
    const currentAttrs = scaleAttrs(peakAttrs, factor)
    const overall = overallFor(legend.position, currentAttrs)
    const [priceRoll] = nextRoll(roll)
    const range = priceRangeFor(Math.max(overall, 82))
    const price = Math.max(
      MIN_PRICE,
      Math.round(
        (basePriceFor(range, priceRoll) * ageValueMultiplier(legend.age, 'alto')) / 100_000,
      ) * 100_000,
    )
    pool.push({
      id: `mkt-lenda-${index}`,
      name: legend.name,
      position: legend.position,
      altPositions: [],
      age: legend.age,
      potential: 'alto',
      shirt: 0,
      attrs: currentAttrs,
      overall,
      nationality: legend.nationality,
      price,
      peakAttrs,
      baseAge: legend.age,
    })
  }

  for (let index = 0; index < POOL_SIZE; index++) {
    const [bandRoll, s1] = nextRoll(state)
    state = s1
    let acc = 0
    const band = OVERALL_BANDS.find((candidate) => {
      acc += candidate.weight
      return bandRoll < acc
    }) ?? OVERALL_BANDS[0]

    const [posRoll, s2] = nextRoll(state)
    state = s2
    const position = POSITIONS[Math.floor(posRoll * POSITIONS.length) % POSITIONS.length]

    const [ageRoll, s3] = nextRoll(state)
    state = s3
    const age = MARKET_MIN_AGE + Math.floor(ageRoll * (MARKET_MAX_AGE - MARKET_MIN_AGE + 1))

    const [potentialRoll, s4] = nextRoll(state)
    state = s4
    const potential: Potential = potentialRoll < 0.15 ? 'alto' : potentialRoll < 0.7 ? 'medio' : 'baixo'

    const [targetRoll, s5] = nextRoll(state)
    state = s5
    const targetOverall = band.min + targetRoll * (band.max - band.min)
    const factor = ageFactor(age, potential)
    const peakTarget = targetOverall / factor

    const attrs = {} as Record<(typeof ATTR_KEYS)[number], number>
    const weights = OVERALL_WEIGHTS[position]
    for (const key of ATTR_KEYS) {
      const [attrRoll, s6] = nextRoll(state)
      state = s6
      const emphasis = weights[key] >= 0.2 ? 6 : weights[key] <= 0.05 ? -8 : 0
      attrs[key] = clampAttr(peakTarget + emphasis + (attrRoll - 0.5) * 8)
    }
    const peakAttrs: FifaAttributes = attrs
    const currentAttrs = scaleAttrs(peakAttrs, factor)
    const overall = overallFor(position, currentAttrs)

    const [nationRoll, s7] = nextRoll(state)
    state = s7
    const nationality =
      nationRoll < 0.7
        ? 'brasil'
        : NATIONS[Math.floor(((nationRoll - 0.7) / 0.3) * NATIONS.length) % NATIONS.length].id

    const [firstRoll, s8] = nextRoll(state)
    state = s8
    const [lastRoll, s9] = nextRoll(state)
    state = s9
    const name = uniqueName(nationality, firstRoll, lastRoll, usedNames, gender)

    const [priceRoll, s10] = nextRoll(state)
    state = s10
    const range = priceRangeFor(overall)
    // overall diz o que ele é hoje; idade e potencial dizem o que ainda rende
    const price =
      Math.round((basePriceFor(range, priceRoll) * ageValueMultiplier(age, potential)) / 10_000) *
      10_000

    pool.push({
      id: `mkt-${seasonSeed}-${careerYear}-${index}`,
      name,
      position,
      altPositions: [],
      age,
      potential,
      shirt: 0,
      attrs: currentAttrs,
      overall,
      nationality,
      price: Math.max(MIN_PRICE, price),
      peakAttrs,
      baseAge: age,
    })
  }
  return pool
}

/**
 * Elenco do MEU clube com os contratados dentro: cada reforço substitui o
 * jogador mais fraco da mesma posição (nunca você). Reforços envelhecem
 * temporada a temporada e penduram as chuteiras aos 38.
 */
/**
 * A vaga que cada reforço ocupa no elenco, por índice do array.
 *
 * Depende SÓ do desenho do elenco (as posições dos slots, fixas por clube) e
 * da ordem de chegada — nunca do overall de quem está lá. Escolher "o mais
 * fraco da posição" fazia o reforço trocar de índice de uma temporada para a
 * outra, porque todo mundo envelhece; e como a escalação guarda índices, o
 * titular que você comprou aparecia no banco na virada do ano.
 *
 * A conta ignora aposentadorias de propósito: o reforço que pendura as
 * chuteiras não pode empurrar a vaga dos outros.
 */
const slotsForSignings = (
  base: readonly SquadPlayer[],
  signings: readonly Signing[],
  userIndex: number,
): readonly number[] => {
  const free = base.map((_, index) => index).filter((index) => index !== userIndex)
  const taken = new Set<number>()
  const rank = new Map<SquadPosition, number>()

  return signings.map((signing) => {
    const order = rank.get(signing.position) ?? 0
    rank.set(signing.position, order + 1)
    // vagas da posição, da mais funda do banco para a mais alta
    const samePosition = free.filter((index) => base[index].position === signing.position).reverse()
    const wanted = samePosition[order]
    const slot =
      wanted !== undefined && !taken.has(wanted)
        ? wanted
        : // sem vaga da posição: a mais funda ainda livre
          free.filter((index) => !taken.has(index)).pop() ?? -1
    if (slot >= 0) taken.add(slot)
    return slot
  })
}

export const squadWithSignings = (
  base: readonly SquadPlayer[],
  signings: readonly Signing[],
  careerYear: number,
  userIndex = 9,
): readonly SquadPlayer[] => {
  const squad = [...base]
  const slots = slotsForSignings(base, signings, userIndex)
  signings.forEach((signing, signingIndex) => {
    const age = signing.baseAge + (careerYear - signing.boughtYear)
    if (age > RETIRE_AGE) return
    const factor = ageFactor(age, signing.potential)
    const attrs = scaleAttrs(signing.peakAttrs, factor)
    const player: SquadPlayer = {
      id: signing.id,
      name: signing.name,
      position: signing.position,
      altPositions: signing.altPositions,
      age,
      potential: signing.potential,
      shirt: 0,
      attrs,
      overall: overallFor(signing.position, attrs),
    }
    const slot = slots[signingIndex]
    if (slot >= 0) squad[slot] = { ...player, shirt: base[slot].shirt }
  })
  return squad
}
