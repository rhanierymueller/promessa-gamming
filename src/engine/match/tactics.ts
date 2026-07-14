import { nextFloat, type RngResult, type RngState } from '../rng'

/**
 * Instruções táticas em tempo real. Recuar tranca o próprio gol mas seca o
 * ataque; contra-ataque gera gols emergentes nas transições, expondo a defesa.
 */
export type Tactic = 'equilibrado' | 'recuar' | 'contra-ataque'

export const TACTIC_LABELS: Record<Tactic, string> = {
  equilibrado: 'Equilibrado',
  recuar: 'Recuar',
  'contra-ataque': 'Contra-ataque',
}

interface TacticProfile {
  /** Chance de um gol PLANEJADO do adversário ser evitado pela postura. */
  readonly cancelTheirGoal: number
  /** Chance de um gol planejado do NOSSO time ser desperdiçado. */
  readonly cancelOurGoal: number
  /** Chance de gol emergente nosso a cada lance corrido. */
  readonly microOurGoal: number
  /** Chance de gol emergente deles a cada lance corrido. */
  readonly microTheirGoal: number
}

const PROFILES: Record<Tactic, TacticProfile> = {
  equilibrado: { cancelTheirGoal: 0.1, cancelOurGoal: 0.1, microOurGoal: 0.012, microTheirGoal: 0.012 },
  recuar: { cancelTheirGoal: 0.4, cancelOurGoal: 0.35, microOurGoal: 0.004, microTheirGoal: 0.007 },
  'contra-ataque': { cancelTheirGoal: 0.15, cancelOurGoal: 0.2, microOurGoal: 0.026, microTheirGoal: 0.017 },
}

/** Um gol automático do plano acontece mesmo, ou a tática o transforma? */
export const rollAutoGoal = (
  kind: 'teamGoal' | 'opponentGoal',
  tactic: Tactic,
  rng: RngState,
): RngResult<boolean> => {
  const profile = PROFILES[tactic]
  const cancelChance = kind === 'teamGoal' ? profile.cancelOurGoal : profile.cancelTheirGoal
  const roll = nextFloat(rng)
  return { value: roll.value >= cancelChance, next: roll.next }
}

export type MicroGoalSide = 'team' | 'opponent' | null

/** Lances corridos podem virar gol — a tática define de quem. */
export const rollMicroGoal = (tactic: Tactic, rng: RngState): RngResult<MicroGoalSide> => {
  const profile = PROFILES[tactic]
  const roll = nextFloat(rng)
  if (roll.value < profile.microOurGoal) return { value: 'team', next: roll.next }
  if (roll.value < profile.microOurGoal + profile.microTheirGoal) {
    return { value: 'opponent', next: roll.next }
  }
  return { value: null, next: roll.next }
}
