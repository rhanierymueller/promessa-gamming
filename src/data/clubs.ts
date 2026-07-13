/**
 * Liga fictícia com identidade regional — cores e cidades evocam o futebol
 * brasileiro sem usar nomes, apelidos ou símbolos registrados de clubes reais
 * (decisão jurídica: ver Riscos Jurídicos no vault). Editor de times pelo
 * usuário entra na Fase 2.
 */

export interface ClubColors {
  readonly primary: string
  readonly secondary: string
}

export interface Club {
  readonly id: string
  readonly name: string
  readonly abbr: string
  readonly city: string
  readonly nickname: string
  readonly colors: ClubColors
  /** Força do elenco, 1-5 estrelas. */
  readonly strength: number
}

export const CLUBS: readonly Club[] = [
  { id: 'real-vila', name: 'Real da Vila', abbr: 'RVL', city: 'São Paulo', nickname: 'A Promessa da Vila', colors: { primary: '#FFD23F', secondary: '#3A2860' }, strength: 2 },
  { id: 'leoes-capital', name: 'Leões da Capital', abbr: 'LEO', city: 'São Paulo', nickname: 'O Leão', colors: { primary: '#1A1A1A', secondary: '#F5F0E6' }, strength: 5 },
  { id: 'verdejante', name: 'Verdejante EC', abbr: 'VER', city: 'São Paulo', nickname: 'O Verdão da Zona Leste', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 4 },
  { id: 'aurora-paulista', name: 'Aurora Paulista', abbr: 'AUR', city: 'Campinas', nickname: 'A Aurora', colors: { primary: '#7A1E3C', secondary: '#2C4F8C' }, strength: 3 },
  { id: 'estrela-minas', name: 'Estrela de Minas', abbr: 'EST', city: 'Belo Horizonte', nickname: 'O Estrelado', colors: { primary: '#1C3F94', secondary: '#F5F0E6' }, strength: 4 },
  { id: 'ferroviario-minas', name: 'Ferroviário de Minas', abbr: 'FER', city: 'Belo Horizonte', nickname: 'A Locomotiva', colors: { primary: '#1A1A1A', secondary: '#F5F0E6' }, strength: 4 },
  { id: 'mare-rubra', name: 'Maré Rubra', abbr: 'MAR', city: 'Rio de Janeiro', nickname: 'A Maré', colors: { primary: '#C1272D', secondary: '#1A1A1A' }, strength: 5 },
  { id: 'ancora', name: 'Âncora FC', abbr: 'ANC', city: 'Rio de Janeiro', nickname: 'O Ancorado', colors: { primary: '#1A1A1A', secondary: '#F5F0E6' }, strength: 3 },
  { id: 'sol-carioca', name: 'Sol Carioca', abbr: 'SOL', city: 'Rio de Janeiro', nickname: 'O Solzão', colors: { primary: '#E8A33D', secondary: '#1E7A3C' }, strength: 2 },
  { id: 'vendaval-sul', name: 'Vendaval do Sul', abbr: 'VEN', city: 'Curitiba', nickname: 'O Vendaval', colors: { primary: '#C1272D', secondary: '#1A1A1A' }, strength: 3 },
  { id: 'pampa', name: 'Pampa FC', abbr: 'PAM', city: 'Porto Alegre', nickname: 'O Pampeano', colors: { primary: '#2C4F8C', secondary: '#1A1A1A' }, strength: 4 },
  { id: 'sangue-gaucho', name: 'Sangue Gaúcho', abbr: 'SAN', city: 'Porto Alegre', nickname: 'O Sangue', colors: { primary: '#C1272D', secondary: '#F5F0E6' }, strength: 4 },
  { id: 'guara-norte', name: 'Guará do Norte', abbr: 'GUA', city: 'Belém', nickname: 'O Guará', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 2 },
  { id: 'farol-salvador', name: 'Farol de Salvador', abbr: 'FAR', city: 'Salvador', nickname: 'O Farol', colors: { primary: '#C1272D', secondary: '#2C4F8C' }, strength: 3 },
  { id: 'mandacaru', name: 'Mandacaru FC', abbr: 'MAN', city: 'Fortaleza', nickname: 'O Cabra da Peste', colors: { primary: '#1E7A3C', secondary: '#E8A33D' }, strength: 3 },
  { id: 'ilha-grande', name: 'Ilha Grande EC', abbr: 'ILH', city: 'Florianópolis', nickname: 'O Ilhéu', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 1 },
]

export const clubById = (id: string): Club | null =>
  CLUBS.find((club) => club.id === id) ?? null

export const randomOpponent = (excludeId: string, roll: number): Club => {
  const candidates = CLUBS.filter((club) => club.id !== excludeId)
  return candidates[Math.floor(roll * candidates.length) % candidates.length]
}
