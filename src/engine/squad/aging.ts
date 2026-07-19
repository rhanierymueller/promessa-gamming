/**
 * Curva de carreira estilo FIFA: o jovem rende uma fração do próprio teto,
 * cresce até o pico (27-31), decai a partir dos 32 e pendura as chuteiras
 * aos 38. O POTENCIAL define o teto — nem todo garoto vira craque.
 */

export type Potential = 'alto' | 'medio' | 'baixo'

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

/** Fator multiplicador dos atributos de pico na idade dada. */
export const ageFactor = (age: number, potential: Potential): number => {
  const shape =
    age <= YOUTH_START_AGE
      ? YOUTH_FLOOR
      : age < PEAK_AGE
        ? YOUTH_FLOOR + ((age - YOUTH_START_AGE) / (PEAK_AGE - YOUTH_START_AGE)) * (1 - YOUTH_FLOOR)
        : age < DECLINE_AGE
          ? 1
          : Math.max(MIN_FACTOR, 1 - (age - (DECLINE_AGE - 1)) * DECLINE_PER_YEAR)
  return shape * POTENTIAL_CEILING[potential]
}
