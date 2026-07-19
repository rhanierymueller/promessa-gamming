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

/**
 * MOMENTUM: sua atuação contagia o time. Nota acima de 6 empurra os gols do
 * time e segura os deles; nota baixa faz o contrário. Escala -0.5..+1.
 */
export const momentumFor = (rating: number): number =>
  Math.max(-0.5, Math.min(1, (rating - 6) / 4))

const MOMENTUM_OUR_BOOST = 0.15
const MOMENTUM_THEIR_DAMP = 0.1

/** Um gol automático do plano acontece mesmo, ou a tática/momentum o transforma? */
export const rollAutoGoal = (
  kind: 'teamGoal' | 'opponentGoal',
  tactic: Tactic,
  rng: RngState,
  momentum = 0,
): RngResult<boolean> => {
  const profile = PROFILES[tactic]
  const base = kind === 'teamGoal' ? profile.cancelOurGoal : profile.cancelTheirGoal
  // jogando bem: nossos gols vingam mais (menos cancel) e os deles menos
  const cancelChance = kind === 'teamGoal'
    ? Math.max(0, base - momentum * MOMENTUM_OUR_BOOST)
    : Math.min(0.9, base + momentum * MOMENTUM_THEIR_DAMP)
  const roll = nextFloat(rng)
  return { value: roll.value >= cancelChance, next: roll.next }
}

export type MicroGoalSide = 'team' | 'opponent' | null

/** Lances corridos podem virar gol — tática e momentum definem de quem. */
/** Peso do abismo técnico (edge −0.5..0.5 dos ratings) no lance corrido. */
const RATING_EDGE_FACTOR = 0.6

export const rollMicroGoal = (
  tactic: Tactic,
  rng: RngState,
  momentum = 0,
  ratingEdge = 0,
): RngResult<MicroGoalSide> => {
  const profile = PROFILES[tactic]
  const ourChance = profile.microOurGoal * (1 + momentum * 0.5) * (1 + ratingEdge * RATING_EDGE_FACTOR)
  const theirChance = profile.microTheirGoal * (1 - momentum * 0.3) * (1 - ratingEdge * RATING_EDGE_FACTOR)
  const roll = nextFloat(rng)
  if (roll.value < ourChance) return { value: 'team', next: roll.next }
  if (roll.value < ourChance + theirChance) {
    return { value: 'opponent', next: roll.next }
  }
  return { value: null, next: roll.next }
}
