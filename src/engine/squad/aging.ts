/**
 * Curva de carreira estilo FIFA: o jovem rende uma fração do próprio teto,
 * cresce até o pico (27-31), decai a partir dos 32 e pendura as chuteiras
 * aos 38. O POTENCIAL define o teto — nem todo garoto vira craque.
 */

export type Potential = 'alto' | 'medio' | 'baixo'

/** Idade atual do craque: a da criação mais uma por temporada disputada. */
export const playerAgeInSeason = (createdAge: number, careerYear: number): number =>
  createdAge + Math.max(0, careerYear - 1)

export const PEAK_AGE = 27
export const DECLINE_AGE = 32
export const RETIRE_AGE = 38

/** Rendimento aos 16 anos, como fração do teto. */
const YOUTH_FLOOR = 0.7
const YOUTH_START_AGE = 16
/** Queda por ano a partir dos 32. */
const DECLINE_PER_YEAR = 0.04
const MIN_FACTOR = 0.6

/** Multiplicador do teto por potencial — o "PO" do card. */
const POTENTIAL_CEILING: Record<Potential, number> = {
  alto: 1.1,
  medio: 1,
  baixo: 0.9,
}

/** Idade de auge do jogador mais precoce e do mais tardio. */
export const EARLY_PEAK_AGE = 23
export const LATE_PEAK_AGE = 30
/** Ritmo médio: a curva clássica, com auge aos 27. */
const DEFAULT_BLOOM = 0.5

/**
 * Idade em que ESTE jogador chega ao próprio auge, pelo ritmo `bloom` (0 = o
 * mais tardio, 1 = o mais precoce).
 *
 * Sem isso todo mundo evoluía exatamente 3% ao ano e chegava ao topo aos 27 —
 * o elenco inteiro andava em fila indiana. O que faz um elenco parecer vivo é
 * o garoto que estoura aos 22 ao lado do que só se acha aos 29.
 */
export const peakAgeFor = (bloom: number): number => {
  const clamped = Math.min(1, Math.max(0, bloom))
  return Math.round(LATE_PEAK_AGE - clamped * (LATE_PEAK_AGE - EARLY_PEAK_AGE))
}

/** Anos de auge antes de a curva virar. No ritmo médio, dá os 32 de sempre. */
const PLATEAU_YEARS = DECLINE_AGE - PEAK_AGE

/**
 * Idade em que ESTE jogador começa a cair. Anda junto com o auge: quem estoura
 * aos 23 apaga aos 28, quem só se acha aos 30 ainda joga aos 34.
 *
 * Prender o declínio nos 32 para todo mundo puniria o tardio duas vezes — ele
 * demorava a crescer e caía no mesmo dia que os outros, então nunca rendia.
 */
export const declineAgeFor = (bloom: number): number => peakAgeFor(bloom) + PLATEAU_YEARS

/** Fator multiplicador dos atributos de pico na idade dada. */
export const ageFactor = (age: number, potential: Potential, bloom = DEFAULT_BLOOM): number => {
  const peakAge = peakAgeFor(bloom)
  const declineAge = declineAgeFor(bloom)
  const shape =
    age <= YOUTH_START_AGE
      ? YOUTH_FLOOR
      : age < peakAge
        ? YOUTH_FLOOR + ((age - YOUTH_START_AGE) / (peakAge - YOUTH_START_AGE)) * (1 - YOUTH_FLOOR)
        : age < declineAge
          ? 1
          : Math.max(MIN_FACTOR, 1 - (age - (declineAge - 1)) * DECLINE_PER_YEAR)
  return shape * POTENTIAL_CEILING[potential]
}
