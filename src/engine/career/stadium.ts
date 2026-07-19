import type { Competition } from '../../state/save'

/**
 * O palco cresce com a carreira: Série D na várzea, C em estádio pequeno,
 * B em estádio médio, A (e jogos de seleção) no caldeirão grande.
 */

export type StadiumTier = 'varzea' | 'pequeno' | 'medio' | 'grande'

const TIER_BY_DIVISION: Record<number, StadiumTier> = {
  0: 'grande',
  1: 'medio',
  2: 'pequeno',
  3: 'varzea',
}

export const stadiumTierFor = (division: number | null, competition: Competition): StadiumTier => {
  if (competition === 'selecao') return 'grande'
  if (division === null) return 'varzea'
  return TIER_BY_DIVISION[division] ?? 'varzea'
}
