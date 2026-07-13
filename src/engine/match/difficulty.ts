import type { MatchConfig } from './types'

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Ajusta a partida pela diferença de estrelas entre os clubes: enfrentar um
 * grande deixa o adversário mais perigoso e o seu time menos produtivo.
 * (O goleiro nos SEUS lances segue a rampa padrão — evolução na Fase 2.)
 */
export const matchConfigFor = (
  base: MatchConfig,
  myStars: number,
  opponentStars: number,
): MatchConfig => {
  const delta = opponentStars - myStars
  return {
    ...base,
    teamGoalChance: clamp(base.teamGoalChance - delta * 0.08, 0.1, 0.75),
    opponentGoalChance: clamp(base.opponentGoalChance + delta * 0.12, 0.1, 0.9),
    maxOpponentGoals: delta >= 2 ? base.maxOpponentGoals + 1 : base.maxOpponentGoals,
  }
}
