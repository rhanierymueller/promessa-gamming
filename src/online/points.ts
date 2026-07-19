import type { MatchRecord } from '../state/save'

/**
 * Pontos do ranking semanal entre amigos — derivados da partida de LIGA:
 * resultado (3/1/0) + gols do craque + bônus de atuação de gala.
 */
export const GALA_RATING = 8
export const GALA_BONUS = 2
export const MAX_WEEKLY_SUBMISSION = 50

export const weeklyPointsFor = (record: MatchRecord): number => {
  const resultPoints =
    record.teamGoals > record.opponentGoals ? 3 : record.teamGoals === record.opponentGoals ? 1 : 0
  const galaBonus = record.rating >= GALA_RATING ? GALA_BONUS : 0
  const total = resultPoints + record.playerGoals + galaBonus
  return Math.min(MAX_WEEKLY_SUBMISSION, Math.max(0, total))
}

/** Código de convite: 6 chars A-Z/2-9 (sem 0/O/1/I ambíguos). */
export const isValidLeagueCode = (code: string): boolean =>
  /^[A-Z2-9]{6}$/.test(code.trim().toUpperCase())

export const normalizeLeagueCode = (code: string): string => code.trim().toUpperCase()
