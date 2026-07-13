import { nextFloat, nextInt, type RngResult, type RngState } from '../rng'

/**
 * Mini-game de passe: sob pressão de tempo, o jogador escolhe entre opções com
 * risco e recompensa crescentes. A opção ousada rende mais nota — quando dá certo.
 */
export type PassRisk = 'safe' | 'bold' | 'audacious'

export interface PassOption {
  readonly risk: PassRisk
  /** Indexa os textos em src/data/narration.ts (a engine não conhece texto). */
  readonly templateId: number
  readonly successChance: number
  readonly ratingOnSuccess: number
  readonly ratingOnFailure: number
}

export interface PassResolution {
  readonly completed: boolean
  readonly ratingDelta: number
}

interface RiskProfile {
  readonly successChance: number
  readonly ratingOnSuccess: number
  readonly ratingOnFailure: number
}

const RISK_PROFILES: Record<PassRisk, RiskProfile> = {
  safe: { successChance: 0.92, ratingOnSuccess: 0.2, ratingOnFailure: -0.3 },
  bold: { successChance: 0.6, ratingOnSuccess: 0.5, ratingOnFailure: -0.5 },
  audacious: { successChance: 0.35, ratingOnSuccess: 0.9, ratingOnFailure: -0.7 },
}

export const PASS_TEMPLATE_COUNT = 4
export const PASS_DECISION_SECONDS = 6

/** Sempre uma opção de cada risco, com variação só no texto. */
export const generatePassOptions = (rng: RngState): RngResult<readonly PassOption[]> => {
  const risks: PassRisk[] = ['safe', 'bold', 'audacious']
  const options: PassOption[] = []
  let current = rng
  for (const risk of risks) {
    const template = nextInt(current, 0, PASS_TEMPLATE_COUNT - 1)
    current = template.next
    options.push({ risk, templateId: template.value, ...RISK_PROFILES[risk] })
  }
  return { value: options, next: current }
}

export const resolvePass = (option: PassOption, rng: RngState): RngResult<PassResolution> => {
  const roll = nextFloat(rng)
  const completed = roll.value < option.successChance
  return {
    value: {
      completed,
      ratingDelta: completed ? option.ratingOnSuccess : option.ratingOnFailure,
    },
    next: roll.next,
  }
}

/** Estourou o tempo: pressionado, o jogador entrega a bola. */
export const timeoutPass = (): PassResolution => ({ completed: false, ratingDelta: -0.6 })
