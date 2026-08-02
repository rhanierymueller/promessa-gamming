import type { Club } from './clubs'

/**
 * Seleções nacionais. Nomes de países são de uso livre (não são marcas);
 * escudos e identidades de confederações continuam proibidos — usamos só nome
 * do país + cores tradicionais da camisa.
 */
export type Confederation =
  | 'america'
  | 'europa'
  | 'africa'
  | 'asia'
  | 'oceania'

/**
 * Confederações com torneio continental próprio no jogo. As demais existem
 * como adversárias de Copa do Mundo, mas não têm seleções em número
 * suficiente para montar uma competição de oito times.
 */
const PLAYABLE_CONFEDERATIONS: readonly Confederation[] = ['america', 'europa']

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
  { id: 'peru', name: 'Peru', abbr: 'PER', colors: { primary: '#C1272D', secondary: '#F5F0E6' }, strength: 3, confederation: 'america' },
  { id: 'bolivia', name: 'Bolívia', abbr: 'BOL', colors: { primary: '#1E7A3C', secondary: '#F5C518' }, strength: 2, confederation: 'america' },
  { id: 'venezuela', name: 'Venezuela', abbr: 'VEN', colors: { primary: '#F5C518', secondary: '#7A1E3C' }, strength: 2, confederation: 'america' },
  { id: 'portugal', name: 'Portugal', abbr: 'POR', colors: { primary: '#C1272D', secondary: '#1E7A3C' }, strength: 4, confederation: 'europa' },
  { id: 'espanha', name: 'Espanha', abbr: 'ESP', colors: { primary: '#C1272D', secondary: '#F5C518' }, strength: 5, confederation: 'europa' },
  { id: 'franca', name: 'França', abbr: 'FRA', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 5, confederation: 'europa' },
  { id: 'italia', name: 'Itália', abbr: 'ITA', colors: { primary: '#2C6FA8', secondary: '#F5F0E6' }, strength: 4, confederation: 'europa' },
  { id: 'alemanha', name: 'Alemanha', abbr: 'ALE', colors: { primary: '#F5F0E6', secondary: '#1A1A1A' }, strength: 5, confederation: 'europa' },
  { id: 'inglaterra', name: 'Inglaterra', abbr: 'ING', colors: { primary: '#F5F0E6', secondary: '#C1272D' }, strength: 4, confederation: 'europa' },
  { id: 'holanda', name: 'Holanda', abbr: 'HOL', colors: { primary: '#E8762C', secondary: '#F5F0E6' }, strength: 4, confederation: 'europa' },
  { id: 'belgica', name: 'Bélgica', abbr: 'BEL', colors: { primary: '#C1272D', secondary: '#1A1A1A' }, strength: 4, confederation: 'europa' },

  // --- demais participantes de Copa do Mundo ---
  { id: 'estados-unidos', name: 'Estados Unidos', abbr: 'EUA', colors: { primary: '#F5F0E6', secondary: '#2C4F8C' }, strength: 3, confederation: 'america' },
  { id: 'honduras', name: 'Honduras', abbr: 'HON', colors: { primary: '#5CB8E4', secondary: '#F5F0E6' }, strength: 2, confederation: 'america' },
  { id: 'holanda-nz', name: 'Nova Zelândia', abbr: 'NZL', colors: { primary: '#F5F0E6', secondary: '#1A1A1A' }, strength: 2, confederation: 'oceania' },
  { id: 'australia', name: 'Austrália', abbr: 'AUS', colors: { primary: '#F5C518', secondary: '#1E7A3C' }, strength: 3, confederation: 'oceania' },
  { id: 'japao', name: 'Japão', abbr: 'JPN', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 3, confederation: 'asia' },
  { id: 'coreia-do-sul', name: 'Coreia do Sul', abbr: 'COR', colors: { primary: '#C1272D', secondary: '#2C4F8C' }, strength: 3, confederation: 'asia' },
  { id: 'africa-do-sul', name: 'África do Sul', abbr: 'RSA', colors: { primary: '#1E7A3C', secondary: '#F5C518' }, strength: 2, confederation: 'africa' },
  { id: 'nigeria', name: 'Nigéria', abbr: 'NGA', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 3, confederation: 'africa' },
  { id: 'argelia', name: 'Argélia', abbr: 'ARG', colors: { primary: '#F5F0E6', secondary: '#1E7A3C' }, strength: 3, confederation: 'africa' },
  { id: 'gana', name: 'Gana', abbr: 'GAN', colors: { primary: '#F5F0E6', secondary: '#C1272D' }, strength: 3, confederation: 'africa' },
  { id: 'camaroes', name: 'Camarões', abbr: 'CAM', colors: { primary: '#1E7A3C', secondary: '#C1272D' }, strength: 3, confederation: 'africa' },
  { id: 'costa-do-marfim', name: 'Costa do Marfim', abbr: 'CIV', colors: { primary: '#E8762C', secondary: '#F5F0E6' }, strength: 3, confederation: 'africa' },
  { id: 'grecia', name: 'Grécia', abbr: 'GRE', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 3, confederation: 'europa' },
  { id: 'eslovenia', name: 'Eslovênia', abbr: 'SVN', colors: { primary: '#4A90C2', secondary: '#F5F0E6' }, strength: 2, confederation: 'europa' },
  { id: 'eslovaquia', name: 'Eslováquia', abbr: 'SVK', colors: { primary: '#2C6FA8', secondary: '#F5F0E6' }, strength: 2, confederation: 'europa' },
  { id: 'servia', name: 'Sérvia', abbr: 'SRB', colors: { primary: '#C1272D', secondary: '#2C4F8C' }, strength: 3, confederation: 'europa' },
  { id: 'dinamarca', name: 'Dinamarca', abbr: 'DIN', colors: { primary: '#C1272D', secondary: '#F5F0E6' }, strength: 3, confederation: 'europa' },
  { id: 'noruega', name: 'Noruega', abbr: 'NOR', colors: { primary: '#C1272D', secondary: '#2C4F8C' }, strength: 3, confederation: 'europa' },
  { id: 'suica', name: 'Suíça', abbr: 'SUI', colors: { primary: '#C1272D', secondary: '#F5F0E6' }, strength: 3, confederation: 'europa' },
]

/** Seleções que o jogador pode escolher: as que têm torneio continental. */
export const PLAYABLE_NATIONS: readonly Nation[] = NATIONS.filter((nation) =>
  PLAYABLE_CONFEDERATIONS.includes(nation.confederation),
)

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
  division: 0,
})
