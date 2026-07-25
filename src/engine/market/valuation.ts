import type { Potential } from '../squad/aging'

/**
 * Quanto a idade e o potencial mexem no preço. O overall diz o que o jogador
 * É HOJE; isto diz quanto de carreira ainda resta para render. Sem isso, um
 * veterano de 35 saía pelo mesmo preço de um garoto de 20 com o mesmo overall
 * — e o garoto vale muito mais, porque ainda vai crescer.
 */

/**
 * Peso da idade, ancorado por marcos e interpolado entre eles. Precisa ser
 * contínuo: em degraus, 30 e 31 anos valeriam igual e o preço despencaria
 * de um aniversário para o outro.
 */
const AGE_ANCHORS: readonly { readonly age: number; readonly factor: number }[] = [
  { age: 16, factor: 1.3 },
  { age: 21, factor: 1.35 },
  { age: 24, factor: 1.25 },
  { age: 27, factor: 1.05 },
  { age: 30, factor: 0.72 },
  { age: 33, factor: 0.45 },
  { age: 36, factor: 0.26 },
  { age: 40, factor: 0.18 },
]

const ageFactorFor = (age: number): number => {
  if (age <= AGE_ANCHORS[0].age) return AGE_ANCHORS[0].factor
  for (let i = 1; i < AGE_ANCHORS.length; i++) {
    const previous = AGE_ANCHORS[i - 1]
    const current = AGE_ANCHORS[i]
    if (age > current.age) continue
    const progress = (age - previous.age) / (current.age - previous.age)
    return previous.factor + (current.factor - previous.factor) * progress
  }
  return AGE_ANCHORS[AGE_ANCHORS.length - 1].factor
}

/**
 * Bônus de potencial. Só pesa em quem ainda tem tempo de virar o que promete:
 * aos 35 o teto de carreira já não vale dinheiro nenhum.
 */
const POTENTIAL_BONUS: Record<Potential, number> = {
  alto: 0.4,
  medio: 0.12,
  baixo: -0.08,
}

const YOUNG_AGE = 23
const PRIME_AGE = 28

/** Quanto do bônus de potencial ainda se aplica nessa idade (1 → 0). */
const potentialWeight = (age: number): number => {
  if (age <= YOUNG_AGE) return 1
  if (age >= PRIME_AGE) return 0.1
  return 1 - (age - YOUNG_AGE) / (PRIME_AGE - YOUNG_AGE)
}

const MIN_MULTIPLIER = 0.15

/** Multiplicador do preço base (que vem do overall). */
export const ageValueMultiplier = (age: number, potential: Potential): number => {
  const base = ageFactorFor(age)
  const bonus = POTENTIAL_BONUS[potential] * potentialWeight(age)
  return Math.max(MIN_MULTIPLIER, base + bonus)
}
