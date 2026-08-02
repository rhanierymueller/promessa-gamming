import type { Club } from './clubs'

/**
 * Clubes da América do Sul para a Copa Libertados. Mesma regra jurídica dos
 * clubes brasileiros: nome, apelido e cores vêm da geografia e da cultura de
 * cada país, nunca de um clube real.
 *
 * `division` é sempre 0 — todos jogam a primeira divisão do país deles — mas
 * eles NÃO entram na pirâmide brasileira: `initialDivisions` e o mercado leem
 * só `CLUBS`.
 */

export interface ContinentalClub extends Club {
  /** País do clube — id de NATIONS. */
  readonly nationId: string
}

/** Os nove países com clubes no torneio. */
export const CONTINENTAL_NATIONS: readonly string[] = [
  'argentina', 'uruguai', 'paraguai', 'chile', 'colombia',
  'equador', 'peru', 'bolivia', 'venezuela',
]

export const CONTINENTAL_CLUBS: readonly ContinentalClub[] = [
  // ==== Argentina ====
  { id: 'sa-riachuelo', nationId: 'argentina', name: 'Atlético del Riachuelo', abbr: 'RIC', city: 'Buenos Aires', nickname: 'El Ribereño', colors: { primary: '#1B3A6B', secondary: '#F5F0E6' }, strength: 5, division: 0 },
  { id: 'sa-pampero', nationId: 'argentina', name: 'Club Pampero', abbr: 'PPO', city: 'Bahía Blanca', nickname: 'El Viento del Sur', colors: { primary: '#C1272D', secondary: '#1A1A1A' }, strength: 5, division: 0 },
  { id: 'sa-cordobes', nationId: 'argentina', name: 'Deportivo Cordobés', abbr: 'CBS', city: 'Córdoba', nickname: 'El Mediterráneo', colors: { primary: '#2E7D46', secondary: '#F2C230' }, strength: 4, division: 0 },
  { id: 'sa-andino', nationId: 'argentina', name: 'Andino de Mendoza', abbr: 'AND', city: 'Mendoza', nickname: 'El Cuyano', colors: { primary: '#6B2FA0', secondary: '#F5F0E6' }, strength: 4, division: 0 },

  // ==== Uruguai ====
  { id: 'sa-charrua', nationId: 'uruguai', name: 'Club Charrúa', abbr: 'CHA', city: 'Montevidéu', nickname: 'La Garra', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 5, division: 0 },
  { id: 'sa-rambla', nationId: 'uruguai', name: 'Rambla FC', abbr: 'RMB', city: 'Montevidéu', nickname: 'El Ramblero', colors: { primary: '#5CB8E4', secondary: '#1A1A1A' }, strength: 5, division: 0 },
  { id: 'sa-salteno', nationId: 'uruguai', name: 'Deportivo Salteño', abbr: 'SLT', city: 'Salto', nickname: 'El Naranjero', colors: { primary: '#E8762C', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'sa-esteno', nationId: 'uruguai', name: 'Club Esteño', abbr: 'ESN', city: 'Punta del Este', nickname: 'El Faro', colors: { primary: '#123A6B', secondary: '#F2C230' }, strength: 3, division: 0 },

  // ==== Paraguai ====
  { id: 'sa-nanduti', nationId: 'paraguai', name: 'Deportivo Ñandutí', abbr: 'NDT', city: 'Assunção', nickname: 'El Encaje', colors: { primary: '#F5F0E6', secondary: '#C1272D' }, strength: 4, division: 0 },
  { id: 'sa-ypacarai', nationId: 'paraguai', name: 'Club Ypacaraí', abbr: 'YPA', city: 'Ypacaraí', nickname: 'El Lacustre', colors: { primary: '#2C7FB8', secondary: '#F2C230' }, strength: 4, division: 0 },
  { id: 'sa-chaqueno', nationId: 'paraguai', name: 'Atlético Chaqueño', abbr: 'CQO', city: 'Filadelfia', nickname: 'El Chaqueño', colors: { primary: '#E8A33D', secondary: '#5B3A24' }, strength: 3, division: 0 },
  { id: 'sa-mburucuya', nationId: 'paraguai', name: 'Mburucuyá FC', abbr: 'MBU', city: 'Encarnación', nickname: 'La Flor', colors: { primary: '#6B2FA0', secondary: '#F2C230' }, strength: 3, division: 0 },

  // ==== Chile ====
  { id: 'sa-cordillera', nationId: 'chile', name: 'Cordillera FC', abbr: 'CDL', city: 'Santiago', nickname: 'Los Cóndores', colors: { primary: '#1A1A1A', secondary: '#C1272D' }, strength: 5, division: 0 },
  { id: 'sa-atacama', nationId: 'chile', name: 'Atacama FC', abbr: 'ATA', city: 'Copiapó', nickname: 'Los Salitreros', colors: { primary: '#E8A33D', secondary: '#2C4F8C' }, strength: 4, division: 0 },
  { id: 'sa-porteno', nationId: 'chile', name: 'Deportivo Porteño', abbr: 'PRT', city: 'Valparaíso', nickname: 'El Muelle', colors: { primary: '#2C4F8C', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'sa-araucano', nationId: 'chile', name: 'Club Araucano', abbr: 'ARC', city: 'Temuco', nickname: 'El Araucano', colors: { primary: '#1E7A3C', secondary: '#F2C230' }, strength: 3, division: 0 },

  // ==== Colômbia ====
  { id: 'sa-cafetero', nationId: 'colombia', name: 'Deportivo Cafetero', abbr: 'CFT', city: 'Manizales', nickname: 'El Grano de Oro', colors: { primary: '#5B3A24', secondary: '#F2C230' }, strength: 5, division: 0 },
  { id: 'sa-vallenato', nationId: 'colombia', name: 'Club Vallenato', abbr: 'VLL', city: 'Valledupar', nickname: 'Los Juglares', colors: { primary: '#F2C230', secondary: '#2C4F8C' }, strength: 4, division: 0 },
  { id: 'sa-esmeralda', nationId: 'colombia', name: 'Esmeralda FC', abbr: 'ESM', city: 'Bogotá', nickname: 'La Piedra Verde', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'sa-tayrona', nationId: 'colombia', name: 'Tayrona FC', abbr: 'TAY', city: 'Santa Marta', nickname: 'Los Tayronas', colors: { primary: '#E8A33D', secondary: '#1A1A1A' }, strength: 3, division: 0 },

  // ==== Equador ====
  { id: 'sa-mitad-mundo', nationId: 'equador', name: 'Mitad del Mundo FC', abbr: 'MDM', city: 'Quito', nickname: 'Los Equinocciales', colors: { primary: '#F5C518', secondary: '#C1272D' }, strength: 5, division: 0 },
  { id: 'sa-manabita', nationId: 'equador', name: 'Deportivo Manabita', abbr: 'MNB', city: 'Manta', nickname: 'Los Atuneros', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 4, division: 0 },
  { id: 'sa-guayaco', nationId: 'equador', name: 'Atlético Guayaco', abbr: 'GYC', city: 'Guayaquil', nickname: 'Los Astilleros', colors: { primary: '#2C4F8C', secondary: '#F2C230' }, strength: 3, division: 0 },
  { id: 'sa-cotopaxi', nationId: 'equador', name: 'Cotopaxi FC', abbr: 'CTX', city: 'Latacunga', nickname: 'Los Volcánicos', colors: { primary: '#8A8F98', secondary: '#C1272D' }, strength: 3, division: 0 },

  // ==== Peru ====
  { id: 'sa-inti', nationId: 'peru', name: 'Club Inti', abbr: 'INT', city: 'Lima', nickname: 'Los Hijos del Sol', colors: { primary: '#F5C518', secondary: '#C1272D' }, strength: 5, division: 0 },
  { id: 'sa-chimu', nationId: 'peru', name: 'Deportivo Chimú', abbr: 'CHM', city: 'Trujillo', nickname: 'Los Chimúes', colors: { primary: '#E8A33D', secondary: '#1A1A1A' }, strength: 3, division: 0 },
  { id: 'sa-misti', nationId: 'peru', name: 'Atlético Misti', abbr: 'MST', city: 'Arequipa', nickname: 'Los Characatos', colors: { primary: '#F5F0E6', secondary: '#C1272D' }, strength: 2, division: 0 },
  { id: 'sa-vicuna', nationId: 'peru', name: 'Club Vicuña', abbr: 'VCN', city: 'Cusco', nickname: 'Las Vicuñas', colors: { primary: '#7A4A21', secondary: '#F2C230' }, strength: 2, division: 0 },

  // ==== Bolívia ====
  { id: 'sa-altiplano', nationId: 'bolivia', name: 'Altiplano FC', abbr: 'ALP', city: 'La Paz', nickname: 'Los de Arriba', colors: { primary: '#C1272D', secondary: '#F2C230' }, strength: 3, division: 0 },
  { id: 'sa-illimani', nationId: 'bolivia', name: 'Deportivo Illimani', abbr: 'ILM', city: 'La Paz', nickname: 'El Nevado', colors: { primary: '#F5F0E6', secondary: '#2C4F8C' }, strength: 2, division: 0 },
  { id: 'sa-camba', nationId: 'bolivia', name: 'Club Camba', abbr: 'CMB', city: 'Santa Cruz de la Sierra', nickname: 'Los Cambas', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 2, division: 0 },
  { id: 'sa-salar', nationId: 'bolivia', name: 'Club Salar', abbr: 'SAL', city: 'Uyuni', nickname: 'Los del Salar', colors: { primary: '#F5F0E6', secondary: '#8A8F98' }, strength: 2, division: 0 },

  // ==== Venezuela ====
  { id: 'sa-orinoco', nationId: 'venezuela', name: 'Deportivo Orinoco', abbr: 'ORN', city: 'Ciudad Guayana', nickname: 'El Caudaloso', colors: { primary: '#2C7FB8', secondary: '#F2C230' }, strength: 3, division: 0 },
  { id: 'sa-avila', nationId: 'venezuela', name: 'Club Ávila', abbr: 'AVL', city: 'Caracas', nickname: 'La Montaña', colors: { primary: '#1E7A3C', secondary: '#F5F0E6' }, strength: 2, division: 0 },
  { id: 'sa-llanero', nationId: 'venezuela', name: 'Atlético Llanero', abbr: 'LLN', city: 'Barinas', nickname: 'Los Llaneros', colors: { primary: '#C1272D', secondary: '#F5F0E6' }, strength: 2, division: 0 },
  { id: 'sa-tepuy', nationId: 'venezuela', name: 'Tepuy FC', abbr: 'TPY', city: 'Santa Elena de Uairén', nickname: 'La Mesa de Piedra', colors: { primary: '#6B2FA0', secondary: '#F2C230' }, strength: 2, division: 0 },
]

export const continentalClubById = (id: string): ContinentalClub | null =>
  CONTINENTAL_CLUBS.find((club) => club.id === id) ?? null
