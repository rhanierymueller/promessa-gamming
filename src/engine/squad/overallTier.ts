/**
 * Faixa visual de um overall (ou de um atributo). Quatro níveis em vez de
 * três: numa lista de mercado com craques de 95 ao lado de titulares de 75,
 * uma faixa única para tudo acima de 75 apagava a diferença que mais importa
 * na hora de escolher reforço.
 */

export const OVR_ELITE = 85
export const OVR_HIGH = 75
export const OVR_MID = 62

export type OverallTier = 'ovr-elite' | 'ovr-high' | 'ovr-mid' | 'ovr-low'

export const ovrClass = (overall: number): OverallTier => {
  if (overall >= OVR_ELITE) return 'ovr-elite'
  if (overall >= OVR_HIGH) return 'ovr-high'
  if (overall >= OVR_MID) return 'ovr-mid'
  return 'ovr-low'
}
