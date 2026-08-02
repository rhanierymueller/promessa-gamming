import { continentalClubById } from './continentalClubs'

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
  /** Divisão INICIAL da pirâmide (0=Série A … 3=Série D). */
  readonly division: number
}

export const CLUBS: readonly Club[] = [
  { id: 'real-vila', name: 'Real da Vila', abbr: 'RVL', city: 'São Paulo', nickname: 'A Promessa da Vila', colors: { primary: '#FFD23F', secondary: '#3A2860' }, strength: 2, division: 3 },
  { id: 'leoes-capital', name: 'Atlético da Capital', abbr: 'ATC', city: 'São Paulo', nickname: 'O Alvinegro', colors: { primary: '#1A1A1A', secondary: '#F5F0E6' }, strength: 5, division: 0 },
  { id: 'verdejante', name: 'Campestre EC', abbr: 'CAM', city: 'São Paulo', nickname: 'O Campestre', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'aurora-paulista', name: 'AA Aurora', abbr: 'AUR', city: 'Campinas', nickname: 'A Aurora', colors: { primary: '#7A1E3C', secondary: '#2C4F8C' }, strength: 3, division: 1 },
  { id: 'estrela-minas', name: 'Estrela de Minas', abbr: 'EST', city: 'Belo Horizonte', nickname: 'O Estrelado', colors: { primary: '#1C3F94', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'ferroviario-minas', name: 'Ferroviário de Minas', abbr: 'FER', city: 'Belo Horizonte', nickname: 'A Locomotiva', colors: { primary: '#1A1A1A', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'mare-rubra', name: 'Regatas Guanabara', abbr: 'REG', city: 'Rio de Janeiro', nickname: 'O Rubro da Baía', colors: { primary: '#C1272D', secondary: '#1A1A1A' }, strength: 5, division: 0 },
  { id: 'ancora', name: 'Portuário FC', abbr: 'POR', city: 'Rio de Janeiro', nickname: 'O Portuário', colors: { primary: '#1A1A1A', secondary: '#F5F0E6' }, strength: 3, division: 1 },
  { id: 'sol-carioca', name: 'Cidade Nova EC', abbr: 'CID', city: 'Rio de Janeiro', nickname: 'O Suburbano', colors: { primary: '#E8A33D', secondary: '#1E7A3C' }, strength: 2, division: 2 },
  { id: 'vendaval-sul', name: 'Iguaçu FC', abbr: 'IGU', city: 'Curitiba', nickname: 'O Iguaçu', colors: { primary: '#C1272D', secondary: '#1A1A1A' }, strength: 3, division: 1 },
  { id: 'pampa', name: 'Pampa FC', abbr: 'PAM', city: 'Porto Alegre', nickname: 'O Pampeano', colors: { primary: '#2C4F8C', secondary: '#1A1A1A' }, strength: 4, division: 0 },
  { id: 'sangue-gaucho', name: 'Minuano SC', abbr: 'MIN', city: 'Porto Alegre', nickname: 'O Minuano', colors: { primary: '#C1272D', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'guara-norte', name: 'Guará do Norte', abbr: 'GUA', city: 'Belém', nickname: 'O Guará', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 2, division: 2 },
  { id: 'farol-salvador', name: 'Soteropolitano EC', abbr: 'SOT', city: 'Salvador', nickname: 'O Sotero', colors: { primary: '#C1272D', secondary: '#2C4F8C' }, strength: 3, division: 1 },
  { id: 'mandacaru', name: 'Mandacaru FC', abbr: 'MAN', city: 'Fortaleza', nickname: 'O Cabra da Peste', colors: { primary: '#1E7A3C', secondary: '#E8A33D' }, strength: 3, division: 1 },
  { id: 'ilha-grande', name: 'Atlético da Ilha', abbr: 'ILH', city: 'Florianópolis', nickname: 'O Ilhéu', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 1, division: 3 },
  // ==== Série A (novos) ====
  { id: 'imperial', name: 'Imperial FC', abbr: 'IMP', city: 'Petrópolis', nickname: 'O Imperador', colors: { primary: '#2E7D46', secondary: '#F2C230' }, strength: 5, division: 0 },
  { id: 'atlantico', name: 'Atlântico FC', abbr: 'ATL', city: 'Rio de Janeiro', nickname: 'O Oceânico', colors: { primary: '#123A6B', secondary: '#F5F0E6' }, strength: 5, division: 0 },
  { id: 'alvorada', name: 'Alvorada EC', abbr: 'ALV', city: 'Brasília', nickname: 'A Alvorada', colors: { primary: '#E8A33D', secondary: '#1A1A1A' }, strength: 4, division: 0 },
  { id: 'bandeirante', name: 'Bandeirante FC', abbr: 'BAN', city: 'Sorocaba', nickname: 'O Desbravador', colors: { primary: '#7A1E3C', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'continental', name: 'Continental EC', abbr: 'CTN', city: 'Curitiba', nickname: 'O Continental', colors: { primary: '#1A1A1A', secondary: '#C1272D' }, strength: 4, division: 0 },
  { id: 'serra-dourada', name: 'Serra Dourada EC', abbr: 'SDO', city: 'Goiânia', nickname: 'O Dourado', colors: { primary: '#F2C230', secondary: '#1E7A3C' }, strength: 4, division: 0 },
  { id: 'planalto', name: 'Planalto AA', abbr: 'PLA', city: 'Brasília', nickname: 'O Planaltino', colors: { primary: '#F5F0E6', secondary: '#123A6B' }, strength: 4, division: 0 },
  // ==== Série B (novos) ====
  { id: 'uniao-fabril', name: 'União Fabril EC', abbr: 'UFA', city: 'São Caetano do Sul', nickname: 'O Fabril', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 3, division: 1 },
  { id: 'cafeeira', name: 'AA Cafeeira', abbr: 'CAF', city: 'Londrina', nickname: 'O Grão', colors: { primary: '#5B3A24', secondary: '#F2C230' }, strength: 3, division: 1 },
  { id: 'ferroviario-norte', name: 'Ferroviário do Norte', abbr: 'FNO', city: 'São Luís', nickname: 'O Trem do Norte', colors: { primary: '#C1272D', secondary: '#1A1A1A' }, strength: 3, division: 1 },
  { id: 'mercantil', name: 'Mercantil FC', abbr: 'MER', city: 'Porto Alegre', nickname: 'O Mercante', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 3, division: 1 },
  { id: 'estiva', name: 'Estiva EC', abbr: 'ETV', city: 'Itajaí', nickname: 'O Estivador', colors: { primary: '#123A6B', secondary: '#E8A33D' }, strength: 3, division: 1 },
  { id: 'colonial', name: 'Colonial SC', abbr: 'CLN', city: 'Blumenau', nickname: 'O Colono', colors: { primary: '#C1272D', secondary: '#F5F0E6' }, strength: 3, division: 1 },
  { id: 'chapada', name: 'Chapada FC', abbr: 'CHP', city: 'Cuiabá', nickname: 'O Chapadão', colors: { primary: '#E8A33D', secondary: '#2E7D46' }, strength: 3, division: 1 },
  { id: 'costa-verde', name: 'Costa Verde EC', abbr: 'CVE', city: 'Angra dos Reis', nickname: 'O Costeiro', colors: { primary: '#1E7A3C', secondary: '#123A6B' }, strength: 3, division: 1 },
  { id: 'sertanejo', name: 'Sertanejo AA', abbr: 'STJ', city: 'Campina Grande', nickname: 'O Sertanejo', colors: { primary: '#F2C230', secondary: '#5B3A24' }, strength: 3, division: 1 },
  // ==== Série C (novos) ====
  { id: 'riacho', name: 'Riacho EC', abbr: 'RIA', city: 'Teresina', nickname: 'O Riacho', colors: { primary: '#2C4F8C', secondary: '#F2C230' }, strength: 2, division: 2 },
  { id: 'pantanal', name: 'Pantanal FC', abbr: 'PTN', city: 'Corumbá', nickname: 'O Pantaneiro', colors: { primary: '#1E7A3C', secondary: '#E8A33D' }, strength: 2, division: 2 },
  { id: 'babacu', name: 'Babaçu AA', abbr: 'BAB', city: 'Imperatriz', nickname: 'O Babaçu', colors: { primary: '#5B3A24', secondary: '#F5F0E6' }, strength: 2, division: 2 },
  { id: 'garimpeiro', name: 'Garimpeiro FC', abbr: 'GPR', city: 'Ouro Preto', nickname: 'O Garimpo', colors: { primary: '#F2C230', secondary: '#1A1A1A' }, strength: 3, division: 2 },
  { id: 'ipe-roxo', name: 'Ipê Roxo EC', abbr: 'IPE', city: 'Campo Grande', nickname: 'O Ipê', colors: { primary: '#6B2FA0', secondary: '#F5F0E6' }, strength: 2, division: 2 },
  { id: 'lagoa-azul', name: 'Lagoa Azul FC', abbr: 'LAG', city: 'Natal', nickname: 'O Lagoeiro', colors: { primary: '#2C7FB8', secondary: '#F5F0E6' }, strength: 2, division: 2 },
  { id: 'vale-do-aco', name: 'Vale do Aço AA', abbr: 'VAC', city: 'Ipatinga', nickname: 'O Aço', colors: { primary: '#8A8F98', secondary: '#C1272D' }, strength: 3, division: 2 },
  { id: 'seringueiro', name: 'Seringueiro EC', abbr: 'SRG', city: 'Rio Branco', nickname: 'O Seringal', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 2, division: 2 },
  { id: 'canavial', name: 'Canavial FC', abbr: 'CNV', city: 'Maceió', nickname: 'O Canavieiro', colors: { primary: '#7ACC6E', secondary: '#1A1A1A' }, strength: 2, division: 2 },
  { id: 'monte-alto', name: 'Monte Alto AA', abbr: 'MTA', city: 'Caruaru', nickname: 'O Montanhês', colors: { primary: '#C1272D', secondary: '#F2C230' }, strength: 2, division: 2 },
  { id: 'estaleiro', name: 'Estaleiro SC', abbr: 'ETL', city: 'Niterói', nickname: 'O Estaleiro', colors: { primary: '#123A6B', secondary: '#8A8F98' }, strength: 3, division: 2 },
  { id: 'fronteira', name: 'Fronteira FC', abbr: 'FRT', city: 'Uruguaiana', nickname: 'O Fronteiriço', colors: { primary: '#2E7D46', secondary: '#C1272D' }, strength: 2, division: 2 },
  // ==== Série D (novos) ====
  { id: 'barro-preto', name: 'Barro Preto EC', abbr: 'BPR', city: 'Belo Horizonte', nickname: 'O Barro', colors: { primary: '#1A1A1A', secondary: '#E8A33D' }, strength: 1, division: 3 },
  { id: 'vila-esperanca', name: 'Vila Esperança FC', abbr: 'VES', city: 'São Paulo', nickname: 'A Esperança', colors: { primary: '#2C7FB8', secondary: '#F2C230' }, strength: 2, division: 3 },
  { id: 'torrao', name: 'Torrão FC', abbr: 'TRR', city: 'Belém', nickname: 'O Torrão', colors: { primary: '#5B3A24', secondary: '#1E7A3C' }, strength: 1, division: 3 },
  { id: 'cacaueiro', name: 'Cacaueiro EC', abbr: 'CCA', city: 'Ilhéus', nickname: 'O Cacau', colors: { primary: '#7A4A21', secondary: '#F5F0E6' }, strength: 1, division: 3 },
  { id: 'ribeirinha', name: 'Ribeirinha AA', abbr: 'RBR', city: 'Manaus', nickname: 'O Ribeirinho', colors: { primary: '#1E7A3C', secondary: '#2C7FB8' }, strength: 1, division: 3 },
  { id: 'salineiro', name: 'Salineiro FC', abbr: 'SLN', city: 'Areia Branca', nickname: 'O Salineiro', colors: { primary: '#F5F0E6', secondary: '#2C7FB8' }, strength: 1, division: 3 },
  { id: 'charqueada', name: 'Charqueada SC', abbr: 'CHQ', city: 'Pelotas', nickname: 'O Charque', colors: { primary: '#7A1E3C', secondary: '#F5F0E6' }, strength: 2, division: 3 },
  { id: 'cinturao-verde', name: 'Cinturão Verde EC', abbr: 'CVD', city: 'Mogi das Cruzes', nickname: 'A Horta', colors: { primary: '#7ACC6E', secondary: '#5B3A24' }, strength: 1, division: 3 },
  { id: 'velho-chico', name: 'Velho Chico FC', abbr: 'VCH', city: 'Petrolina', nickname: 'O Velho Chico', colors: { primary: '#2C7FB8', secondary: '#E8A33D' }, strength: 2, division: 3 },
  { id: 'manguezal', name: 'Manguezal SC', abbr: 'MGZ', city: 'Recife', nickname: 'O Mangue', colors: { primary: '#2E5D46', secondary: '#C1272D' }, strength: 2, division: 3 },
  { id: 'cerrado', name: 'Cerrado EC', abbr: 'CRD', city: 'Palmas', nickname: 'O Cerratense', colors: { primary: '#E8A33D', secondary: '#7A1E3C' }, strength: 1, division: 3 },
  { id: 'garoa', name: 'Garoa FC', abbr: 'GAR', city: 'São Paulo', nickname: 'A Garoa', colors: { primary: '#8A8F98', secondary: '#1A1A1A' }, strength: 1, division: 3 },
]

export const clubById = (id: string): Club | null =>
  CLUBS.find((club) => club.id === id) ?? continentalClubById(id)

export const randomOpponent = (excludeId: string, roll: number): Club => {
  const candidates = CLUBS.filter((club) => club.id !== excludeId)
  return candidates[Math.floor(roll * candidates.length) % candidates.length]
}
