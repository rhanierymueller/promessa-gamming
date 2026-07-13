/**
 * Convocação para a seleção: só fase MUITO boa convoca, e só na janela de
 * dezembro (fim da liga). Critério: pelo menos 5 jogos de liga na temporada e
 * média ≥ 8.0 nas últimas 5 notas.
 */
export const CALLUP_MIN_MATCHES = 5
export const CALLUP_MIN_AVERAGE = 8.0

export const isCallUpEligible = (seasonLeagueRatings: readonly number[]): boolean => {
  if (seasonLeagueRatings.length < CALLUP_MIN_MATCHES) return false
  const window = seasonLeagueRatings.slice(-CALLUP_MIN_MATCHES)
  const average = window.reduce((sum, rating) => sum + rating, 0) / CALLUP_MIN_MATCHES
  return average >= CALLUP_MIN_AVERAGE
}
