import { nextFloat, type RngResult, type RngState } from '../rng'
import { goalCenter } from './config'
import { flightX } from './flight'
import type { FlightParams, KeeperPlan, ShotConfig } from './types'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * O goleiro amostra a trajetória cedo e extrapola EM LINHA RETA — é isso que
 * faz a curva enganá-lo de verdade: a estimativa dele erra o destino final.
 */
export const keeperGuess = (flight: FlightParams, reactT: number, config: ShotConfig): number => {
  const x1 = flightX(flight, reactT)
  const x2 = flightX(flight, reactT + config.guessSampleDt)
  return x1 + ((x2 - x1) / config.guessSampleDt) * (1 - reactT)
}

export const planKeeper = (
  flight: FlightParams,
  skill: number,
  rng: RngState,
  config: ShotConfig,
): RngResult<KeeperPlan> => {
  const reactRoll = nextFloat(rng)
  const reactT = Math.max(
    config.reactTMin,
    config.reactTBase - skill * config.reactTSkillFactor + (reactRoll.value - 0.5) * config.reactTNoise,
  )

  // extrapolação linear é enganada pela curva; goleiro habilidoso LÊ parte dela
  const linear = keeperGuess(flight, reactT, config)
  const actual = flightX(flight, 1)
  const curveRead = Math.min(1, skill * config.curveReadFactor)
  const noiseRoll = nextFloat(reactRoll.next)
  const guess = linear + (actual - linear) * curveRead
    + (noiseRoll.value * 2 - 1) * (1 - skill) * config.guessNoise

  const center = goalCenter(config)

  // goleiro de verdade às vezes CRAVA o canto errado — a chance cai com a habilidade
  const sideRoll = nextFloat(noiseRoll.next)
  const wrongSideChance = config.wrongSideBase * (1 - skill * 0.5)
  const committed = sideRoll.value < wrongSideChance ? center - (guess - center) : guess

  const maxDive = config.maxDiveBase + skill * config.maxDiveSkillFactor
  return {
    value: { reactT, diveX: clamp(committed, center - maxDive, center + maxDive) },
    next: sideRoll.next,
  }
}
