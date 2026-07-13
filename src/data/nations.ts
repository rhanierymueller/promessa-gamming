import type { Club } from './clubs'

/**
 * Seleções nacionais. Nomes de países são de uso livre (não são marcas);
 * escudos e identidades de confederações continuam proibidos — usamos só nome
 * do país + cores tradicionais da camisa.
 */
export type Confederation = 'america' | 'europa'

export interface Nation {
  readonly id: string
  readonly name: string
  readonly abbr: string
  readonly colors: { readonly primary: string; readonly secondary: string }
  readonly strength: number
  readonly confederation: Confederation
}

export const NATIONS: readonly Nation[] = [
  { id: 'brasil', name: 'Brasil', abbr: 'BRA', colors: { primary: '#F5C518', secondary: '#1E7A3C' }, strength: 5, confederation: 'america' },
  { id: 'argentina', name: 'Argentina', abbr: 'ARG', colors: { primary: '#75AADB', secondary: '#F5F0E6' }, strength: 5, confederation: 'america' },
  { id: 'uruguai', name: 'Uruguai', abbr: 'URU', colors: { primary: '#5CB8E4', secondary: '#1A1A1A' }, strength: 4, confederation: 'america' },
  { id: 'colombia', name: 'Colômbia', abbr: 'COL', colors: { primary: '#F5C518', secondary: '#2C4F8C' }, strength: 4, confederation: 'america' },
  { id: 'chile', name: 'Chile', abbr: 'CHI', colors: { primary: '#C1272D', secondary: '#2C4F8C' }, strength: 3, confederation: 'america' },
  { id: 'paraguai', name: 'Paraguai', abbr: 'PAR', colors: { primary: '#C1272D', secondary: '#F5F0E6' }, strength: 3, confederation: 'america' },
  { id: 'equador', name: 'Equador', abbr: 'EQU', colors: { primary: '#F5C518', secondary: '#C1272D' }, strength: 3, confederation: 'america' },
  { id: 'mexico', name: 'México', abbr: 'MEX', colors: { primary: '#1E7A3C', secondary: '#C1272D' }, strength: 4, confederation: 'america' },
  { id: 'portugal', name: 'Portugal', abbr: 'POR', colors: { primary: '#C1272D', secondary: '#1E7A3C' }, strength: 4, confederation: 'europa' },
  { id: 'espanha', name: 'Espanha', abbr: 'ESP', colors: { primary: '#C1272D', secondary: '#F5C518' }, strength: 5, confederation: 'europa' },
  { id: 'franca', name: 'França', abbr: 'FRA', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 5, confederation: 'europa' },
  { id: 'italia', name: 'Itália', abbr: 'ITA', colors: { primary: '#2C6FA8', secondary: '#F5F0E6' }, strength: 4, confederation: 'europa' },
  { id: 'alemanha', name: 'Alemanha', abbr: 'ALE', colors: { primary: '#F5F0E6', secondary: '#1A1A1A' }, strength: 5, confederation: 'europa' },
  { id: 'inglaterra', name: 'Inglaterra', abbr: 'ING', colors: { primary: '#F5F0E6', secondary: '#C1272D' }, strength: 4, confederation: 'europa' },
  { id: 'holanda', name: 'Holanda', abbr: 'HOL', colors: { primary: '#E8762C', secondary: '#F5F0E6' }, strength: 4, confederation: 'europa' },
  { id: 'belgica', name: 'Bélgica', abbr: 'BEL', colors: { primary: '#C1272D', secondary: '#1A1A1A' }, strength: 4, confederation: 'europa' },
]

export const nationById = (id: string): Nation | null =>
  NATIONS.find((nation) => nation.id === id) ?? null

/** Adapta uma seleção para o formato de clube usado pela partida. */
export const nationAsClub = (nation: Nation): Club => ({
  id: `nation-${nation.id}`,
  name: nation.name,
  abbr: nation.abbr,
  city: 'Seleção nacional',
  nickname: `Seleção de ${nation.name}`,
  colors: nation.colors,
  strength: nation.strength,
})
