export type ShieldKind =
  | 'classic'
  | 'rounded'
  | 'pennant'
  | 'crowned'
  | 'diamond'
  | 'roundel'
  | 'banner'

export type PatternKind =
  | 'solid'
  | 'stripes'
  | 'sash'
  | 'band'
  | 'halves'
  | 'hoops'
  | 'quarters'
  | 'chevron'
  | 'cross'
  | 'waves'
  | 'rays'

export type PlateKind = 'none' | 'round' | 'diamond' | 'banner'

export type EmblemKind =
  | 'star'
  | 'crown'
  | 'lion'
  | 'wheat'
  | 'sun'
  | 'rail'
  | 'wave'
  | 'anchor'
  | 'tower'
  | 'wind'
  | 'horseshoe'
  | 'feather'
  | 'lighthouse'
  | 'cactus'
  | 'island'
  | 'compass'
  | 'globe'
  | 'peak'
  | 'mesa'
  | 'gear'
  | 'coffee'
  | 'scales'
  | 'hook'
  | 'bird'
  | 'palm'
  | 'pickaxe'
  | 'flower'
  | 'drop'
  | 'anvil'
  | 'tree'
  | 'cane'
  | 'ship'
  | 'gate'
  | 'brick'
  | 'sprout'
  | 'diamond'
  | 'cocoa'
  | 'canoe'
  | 'crystal'
  | 'horns'
  | 'leaf'
  | 'fish'
  | 'mangrove'
  | 'rain'

export interface ClubCrestIdentity {
  readonly shield: ShieldKind
  readonly pattern: PatternKind
  readonly emblem: EmblemKind
  readonly plate: PlateKind
}

/**
 * Direção de arte explícita da liga fictícia.
 *
 * O hash continua útil como fallback para clubes futuros, mas os 56 clubes
 * atuais têm símbolo ligado ao próprio nome, região ou apelido. Assim o escudo
 * deixa de ser só uma combinação aleatória de formas e passa a contar quem é o
 * clube mesmo quando aparece com 20 px na tabela.
 */
const CLUB_CREST_IDENTITIES: Readonly<Record<string, ClubCrestIdentity>> = {
  'real-vila':         { shield: 'classic', pattern: 'sash',     emblem: 'star',       plate: 'round' },
  'leoes-capital':     { shield: 'crowned', pattern: 'stripes',  emblem: 'lion',       plate: 'round' },
  verdejante:          { shield: 'rounded', pattern: 'halves',   emblem: 'wheat',      plate: 'diamond' },
  'aurora-paulista':   { shield: 'roundel', pattern: 'rays',     emblem: 'sun',        plate: 'none' },
  'estrela-minas':     { shield: 'diamond', pattern: 'quarters', emblem: 'star',       plate: 'diamond' },
  'ferroviario-minas': { shield: 'banner',  pattern: 'stripes',  emblem: 'rail',       plate: 'banner' },
  'mare-rubra':        { shield: 'classic', pattern: 'waves',    emblem: 'wave',       plate: 'round' },
  ancora:               { shield: 'roundel', pattern: 'hoops',    emblem: 'anchor',     plate: 'round' },
  'sol-carioca':       { shield: 'crowned', pattern: 'rays',     emblem: 'tower',      plate: 'banner' },
  'vendaval-sul':      { shield: 'pennant', pattern: 'sash',     emblem: 'wind',       plate: 'diamond' },
  pampa:                { shield: 'rounded', pattern: 'band',     emblem: 'horseshoe',  plate: 'round' },
  'sangue-gaucho':     { shield: 'classic', pattern: 'halves',   emblem: 'wind',       plate: 'banner' },
  'guara-norte':       { shield: 'diamond', pattern: 'chevron',  emblem: 'feather',    plate: 'diamond' },
  'farol-salvador':    { shield: 'banner',  pattern: 'hoops',    emblem: 'lighthouse', plate: 'banner' },
  mandacaru:            { shield: 'crowned', pattern: 'halves',   emblem: 'cactus',     plate: 'round' },
  'ilha-grande':       { shield: 'roundel', pattern: 'waves',    emblem: 'island',     plate: 'round' },

  imperial:             { shield: 'rounded', pattern: 'band',     emblem: 'crown',      plate: 'diamond' },
  atlantico:            { shield: 'diamond', pattern: 'waves',    emblem: 'wave',       plate: 'round' },
  alvorada:             { shield: 'classic', pattern: 'rays',     emblem: 'sun',        plate: 'round' },
  bandeirante:          { shield: 'pennant', pattern: 'quarters', emblem: 'compass',    plate: 'diamond' },
  continental:          { shield: 'roundel', pattern: 'cross',    emblem: 'globe',      plate: 'round' },
  'serra-dourada':     { shield: 'crowned', pattern: 'chevron',  emblem: 'peak',       plate: 'diamond' },
  planalto:             { shield: 'banner',  pattern: 'band',     emblem: 'mesa',       plate: 'banner' },

  'uniao-fabril':      { shield: 'classic', pattern: 'quarters', emblem: 'gear',       plate: 'round' },
  cafeeira:             { shield: 'rounded', pattern: 'halves',   emblem: 'coffee',     plate: 'diamond' },
  'ferroviario-norte': { shield: 'pennant', pattern: 'band',     emblem: 'rail',       plate: 'banner' },
  mercantil:            { shield: 'diamond', pattern: 'quarters', emblem: 'scales',     plate: 'round' },
  estiva:               { shield: 'banner',  pattern: 'sash',     emblem: 'hook',       plate: 'diamond' },
  colonial:             { shield: 'crowned', pattern: 'cross',    emblem: 'tower',      plate: 'banner' },
  chapada:              { shield: 'rounded', pattern: 'chevron',  emblem: 'mesa',       plate: 'round' },
  'costa-verde':       { shield: 'classic', pattern: 'waves',    emblem: 'leaf',       plate: 'diamond' },
  sertanejo:            { shield: 'pennant', pattern: 'rays',     emblem: 'cactus',     plate: 'round' },

  riacho:               { shield: 'banner',  pattern: 'waves',    emblem: 'wave',       plate: 'none' },
  pantanal:             { shield: 'classic', pattern: 'halves',   emblem: 'bird',       plate: 'round' },
  babacu:               { shield: 'rounded', pattern: 'rays',     emblem: 'palm',       plate: 'diamond' },
  garimpeiro:           { shield: 'diamond', pattern: 'sash',     emblem: 'pickaxe',    plate: 'round' },
  'ipe-roxo':          { shield: 'roundel', pattern: 'quarters', emblem: 'flower',     plate: 'round' },
  'lagoa-azul':        { shield: 'pennant', pattern: 'waves',    emblem: 'drop',       plate: 'diamond' },
  'vale-do-aco':       { shield: 'classic', pattern: 'band',     emblem: 'anvil',      plate: 'banner' },
  seringueiro:          { shield: 'crowned', pattern: 'halves',   emblem: 'tree',       plate: 'round' },
  canavial:             { shield: 'banner',  pattern: 'stripes',  emblem: 'cane',       plate: 'diamond' },
  'monte-alto':        { shield: 'pennant', pattern: 'chevron',  emblem: 'peak',       plate: 'none' },
  estaleiro:            { shield: 'rounded', pattern: 'waves',    emblem: 'ship',       plate: 'banner' },
  fronteira:            { shield: 'diamond', pattern: 'cross',    emblem: 'gate',       plate: 'diamond' },

  'barro-preto':       { shield: 'classic', pattern: 'quarters', emblem: 'brick',      plate: 'banner' },
  'vila-esperanca':    { shield: 'roundel', pattern: 'rays',     emblem: 'sprout',     plate: 'round' },
  torrao:               { shield: 'pennant', pattern: 'halves',   emblem: 'diamond',    plate: 'diamond' },
  cacaueiro:            { shield: 'rounded', pattern: 'band',     emblem: 'cocoa',      plate: 'round' },
  ribeirinha:           { shield: 'banner',  pattern: 'waves',    emblem: 'canoe',      plate: 'banner' },
  salineiro:            { shield: 'diamond', pattern: 'quarters', emblem: 'crystal',    plate: 'round' },
  charqueada:           { shield: 'classic', pattern: 'sash',     emblem: 'horns',      plate: 'diamond' },
  'cinturao-verde':    { shield: 'crowned', pattern: 'stripes',  emblem: 'leaf',       plate: 'round' },
  'velho-chico':       { shield: 'pennant', pattern: 'waves',    emblem: 'fish',       plate: 'none' },
  manguezal:            { shield: 'rounded', pattern: 'halves',   emblem: 'mangrove',   plate: 'banner' },
  cerrado:              { shield: 'classic', pattern: 'rays',     emblem: 'tree',       plate: 'diamond' },
  garoa:                { shield: 'roundel', pattern: 'hoops',    emblem: 'rain',       plate: 'round' },
}

const FALLBACK_SHIELDS: readonly ShieldKind[] = [
  'classic', 'rounded', 'pennant', 'crowned', 'diamond', 'roundel', 'banner',
]
const FALLBACK_PATTERNS: readonly PatternKind[] = [
  'stripes', 'sash', 'band', 'halves', 'hoops', 'quarters', 'chevron', 'cross', 'waves', 'rays',
]
const FALLBACK_EMBLEMS: readonly EmblemKind[] = [
  'star', 'crown', 'sun', 'anchor', 'peak', 'compass', 'gear', 'leaf',
]
const FALLBACK_PLATES: readonly PlateKind[] = ['none', 'round', 'diamond', 'banner']

/** Hash estável do id → fallback determinístico para clubes adicionados no futuro. */
export const hashClubId = (id: string): number => {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const hasNamedCrestIdentity = (clubId: string): boolean =>
  Object.prototype.hasOwnProperty.call(CLUB_CREST_IDENTITIES, clubId)

export const crestIdentityFor = (clubId: string): ClubCrestIdentity => {
  const named = CLUB_CREST_IDENTITIES[clubId]
  if (named) return named

  const hash = hashClubId(clubId)
  return {
    shield: FALLBACK_SHIELDS[hash % FALLBACK_SHIELDS.length],
    pattern: FALLBACK_PATTERNS[(hash >>> 3) % FALLBACK_PATTERNS.length],
    emblem: FALLBACK_EMBLEMS[(hash >>> 7) % FALLBACK_EMBLEMS.length],
    plate: FALLBACK_PLATES[(hash >>> 11) % FALLBACK_PLATES.length],
  }
}
