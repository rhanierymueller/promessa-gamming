import type { Club } from '../../data/clubs'
import { continentalClubById } from '../../data/continentalClubs'
import { foreignSquadFor, squadFor } from '../../data/squadNames'
import type { PlayerAttributes } from '../career/attributes'
import type { PlayerGender } from '../../state/save'
import { ageFactor, declineAgeFor, peakAgeFor, PEAK_AGE, RETIRE_AGE, type Potential } from './aging'
import { FORMATIONS, formationIdFor } from './formation'

/**
 * Elencos completos estilo FIFA: cada clube tem 18 jogadores determinísticos
 * (mesmo clube = mesmo elenco sempre), com posição, idade, seis atributos e
 * overall ponderado pela posição — clube forte joga mais em tudo.
 */

export type SquadPosition = 'GOL' | 'LD' | 'ZAG' | 'LE' | 'VOL' | 'MEI' | 'PON' | 'ATA'

export interface FifaAttributes {
  /** Ritmo (velocidade). */
  readonly pac: number
  /** Finalização. */
  readonly fin: number
  /** Passe. */
  readonly pas: number
  /** Drible. */
  readonly dri: number
  /** Defesa (no goleiro, a luva). */
  readonly def: number
  /** Físico. */
  readonly fis: number
}

export interface SquadPlayer {
  readonly id: string
  readonly name: string
  readonly position: SquadPosition
  /** Posições secundárias — joga nelas com queda leve (nem todos têm). */
  readonly altPositions: readonly SquadPosition[]
  readonly age: number
  /** Teto de carreira: define até onde o jovem pode chegar. */
  readonly potential: Potential
  /** Idade em que ESTE jogador atinge o próprio auge (23-30). */
  readonly peakAge: number
  readonly shirt: number
  readonly attrs: FifaAttributes
  readonly overall: number
}

/** Saída persistida que antecipa a renovação de uma vaga do elenco. */
export const SQUAD_SIZE = 18

/**
 * Slot do protagonista no elenco, igual à LivePitch. Toda formação tem ATA
 * nesse índice, então o craque nunca cai no gol seja qual for o esquema.
 */
export const USER_SQUAD_INDEX = 9

/** Id fixo do SEU craque dentro de qualquer elenco. */
export const USER_PLAYER_ID = 'voce'

const BENCH_POSITIONS: readonly SquadPosition[] = ['GOL', 'ZAG', 'LE', 'VOL', 'MEI', 'PON', 'ATA']

const ATTR_KEYS = ['pac', 'fin', 'pas', 'dri', 'def', 'fis'] as const

/** Pesos do overall por posição (somam 1). */
const OVERALL_WEIGHTS: Record<SquadPosition, FifaAttributes> = {
  GOL: { def: 0.55, fis: 0.2, pas: 0.1, pac: 0.05, dri: 0.05, fin: 0.05 },
  ZAG: { def: 0.5, fis: 0.25, pac: 0.1, pas: 0.1, dri: 0.03, fin: 0.02 },
  LD: { pac: 0.3, def: 0.3, fis: 0.15, pas: 0.15, dri: 0.07, fin: 0.03 },
  LE: { pac: 0.3, def: 0.3, fis: 0.15, pas: 0.15, dri: 0.07, fin: 0.03 },
  VOL: { def: 0.35, pas: 0.25, fis: 0.2, dri: 0.1, pac: 0.07, fin: 0.03 },
  MEI: { pas: 0.35, dri: 0.25, fin: 0.12, pac: 0.1, def: 0.1, fis: 0.08 },
  PON: { pac: 0.3, dri: 0.3, fin: 0.2, pas: 0.12, fis: 0.05, def: 0.03 },
  ATA: { fin: 0.4, pac: 0.2, dri: 0.18, fis: 0.12, pas: 0.08, def: 0.02 },
}

/** Boost dos atributos que definem a posição e pena nos irrelevantes. */
const POSITION_SHAPE: Record<SquadPosition, { readonly strong: readonly (keyof FifaAttributes)[]; readonly weak: readonly (keyof FifaAttributes)[] }> = {
  GOL: { strong: ['def'], weak: ['fin', 'dri', 'pac'] },
  ZAG: { strong: ['def', 'fis'], weak: ['fin', 'dri'] },
  LD: { strong: ['pac', 'def'], weak: ['fin'] },
  LE: { strong: ['pac', 'def'], weak: ['fin'] },
  VOL: { strong: ['def', 'pas'], weak: ['fin'] },
  MEI: { strong: ['pas', 'dri'], weak: ['def'] },
  PON: { strong: ['pac', 'dri'], weak: ['def'] },
  ATA: { strong: ['fin', 'pac'], weak: ['def'] },
}

/** Vizinhos naturais de cada posição — candidatos a posição secundária. */
const ALT_CANDIDATES: Record<SquadPosition, readonly SquadPosition[]> = {
  GOL: [],
  ZAG: ['VOL', 'LD'],
  LD: ['ZAG', 'PON'],
  LE: ['ZAG', 'PON'],
  VOL: ['ZAG', 'MEI'],
  MEI: ['VOL', 'PON'],
  PON: ['ATA', 'MEI'],
  ATA: ['PON', 'MEI'],
}

/** Fração dos jogadores de linha que dominam uma segunda posição. */
const ALT_POSITION_SHARE = 0.45

const STRONG_BOOST = 8
const WEAK_PENALTY = 12
/** Qualidade-base do elenco pela divisão de ORIGEM (0=A..3=D). */
const DIVISION_QUALITY = [58, 52, 46, 40] as const
/** Seleção é um recorte dos melhores do país, não um clube comum. */
const NATION_QUALITY = 62
/** Nas seleções, cada estrela precisa separar de verdade potência e azarão. */
const NATION_PER_STAR = 6
const CLUB_PER_STAR = 4
/**
 * Distância entre o melhor e o pior jogador do MESMO clube. Estreito demais,
 * o elenco vira 18 clones da régua da divisão e nenhum garoto se destaca.
 */
const PLAYER_SPREAD = 9
const ATTR_SPREAD = 6
const MIN_ATTR = 35
const MAX_ATTR = 92

/** Escala dos atributos treináveis do craque (1-10) para a régua FIFA. */
const USER_ATTR_BASE = 45
const USER_ATTR_PER_LEVEL = 5

/**
 * Seu físico no auge (27-31 anos). Ritmo, drible e físico não são treináveis:
 * seguem a SUA curva de carreira, crescendo até o pico e caindo só depois dos
 * 32 — como a de qualquer jogador.
 *
 * Antes eram emprestados do jogador gerado que ocupava a sua vaga no elenco.
 * Como aquele NPC envelhecia por conta, seu overall despencava aos 26 quando
 * ele chegava aos 33, e dava saltos quando o clube o substituía por um garoto.
 */
const USER_PEAK_PHYSICAL: Pick<FifaAttributes, 'pac' | 'dri' | 'fis'> = {
  pac: 82,
  dri: 78,
  fis: 76,
}

const hashSeed = (input: string): number => {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const nextRoll = (state: number): readonly [number, number] => {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0
  return [next / 4294967296, next]
}

const clampAttr = (value: number): number => Math.max(MIN_ATTR, Math.min(MAX_ATTR, Math.round(value)))

const overallFor = (position: SquadPosition, attrs: FifaAttributes): number => {
  const weights = OVERALL_WEIGHTS[position]
  const weighted = ATTR_KEYS.reduce((sum, key) => sum + attrs[key] * weights[key], 0)
  return Math.round(weighted)
}

/**
 * Um país convoca os melhores disponíveis: a variação de idade e potencial
 * pode criar um veterano ou jovem abaixo do auge, mas não um jogador de Série
 * C no elenco de uma potência. O piso cresce por estrela e eleva todos os
 * atributos juntos, preservando o desenho da posição.
 */
const nationalOverallFloor = (strength: number): number => 63 + strength * 3

const raiseToOverallFloor = (
  position: SquadPosition,
  attrs: FifaAttributes,
  floor: number,
): FifaAttributes => {
  let raised = attrs
  while (overallFor(position, raised) < floor) {
    const next = Object.fromEntries(
      ATTR_KEYS.map((key) => [key, Math.min(MAX_ATTR, raised[key] + 1)]),
    ) as unknown as FifaAttributes
    if (ATTR_KEYS.every((key) => next[key] === raised[key])) break
    raised = next
  }
  return raised
}

/** Sorteio de potencial: poucos craques em formação, muitos medianos. */
const POTENTIAL_HIGH_SHARE = 0.15
const POTENTIAL_MEDIUM_SHARE = 0.55

/**
 * Quanto o TALENTO move o teto, por cima da régua do clube. Sem isto o clube
 * onde o jogador nasceu decidia tudo: uma joia da Série D tinha exatamente o
 * mesmo teto do lateral reserva do lado dela, e nenhum garoto podia furar o
 * nível da própria divisão.
 */
const POTENTIAL_PEAK_BONUS: Record<Potential, number> = { alto: 10, medio: 0, baixo: -6 }

const BASE_MIN_AGE = 17
/**
 * Elenco não nasce velho. Com o topo em 36, metade do time já entrava em
 * declínio no ano 1 e o clube inteiro apodrecia em bloco — a força caía
 * temporada após temporada e nenhuma carreira via o time crescer.
 */
const BASE_MAX_AGE = 33
/** Regens chegam da base: 16 a 21 anos. */
const REGEN_MIN_AGE = 16
const REGEN_MAX_AGE = 21

interface PeakPlayer {
  readonly attrs: FifaAttributes
  readonly baseAge: number
  readonly potential: Potential
  /** Ritmo de amadurecimento (0 = tardio, 1 = precoce). */
  readonly bloom: number
  readonly altPositions: readonly SquadPosition[]
  readonly nextState: number
}

/** Sorteia um jogador "de pico": atributos máximos, idade-base, talento e ritmo. */
const rollPeakPlayer = (
  state: number,
  position: SquadPosition,
  clubBase: number,
  minAge: number,
  maxAge: number,
): PeakPlayer => {
  const shape = POSITION_SHAPE[position]
  const [playerRoll, s1] = nextRoll(state)
  let current = s1
  const playerShift = (playerRoll - 0.5) * 2 * PLAYER_SPREAD

  // talento e ritmo vêm ANTES dos atributos: o teto de cada um depende deles
  const [potentialRoll, s2] = nextRoll(current)
  current = s2
  const potential: Potential =
    potentialRoll < POTENTIAL_HIGH_SHARE
      ? 'alto'
      : potentialRoll < POTENTIAL_HIGH_SHARE + POTENTIAL_MEDIUM_SHARE
        ? 'medio'
        : 'baixo'

  const [bloomRoll, s3] = nextRoll(current)
  current = s3

  const peakBase = clubBase + POTENTIAL_PEAK_BONUS[potential]
  const values = {} as Record<keyof FifaAttributes, number>
  for (const key of ATTR_KEYS) {
    const [attrRoll, sN] = nextRoll(current)
    current = sN
    const attrShift = (attrRoll - 0.5) * 2 * ATTR_SPREAD
    const shapeShift = shape.strong.includes(key)
      ? STRONG_BOOST
      : shape.weak.includes(key)
        ? -WEAK_PENALTY
        : 0
    values[key] = clampAttr(peakBase + playerShift + attrShift + shapeShift)
  }

  const [ageRoll, s4] = nextRoll(current)
  current = s4
  const baseAge = minAge + Math.floor(ageRoll * (maxAge - minAge + 1))

  const [altRoll, s5] = nextRoll(current)
  current = s5
  const candidates = ALT_CANDIDATES[position]
  const altPositions =
    candidates.length > 0 && altRoll < ALT_POSITION_SHARE
      ? [candidates[Math.floor((altRoll / ALT_POSITION_SHARE) * candidates.length) % candidates.length]]
      : []

  return { attrs: values, baseAge, potential, bloom: bloomRoll, altPositions, nextState: current }
}

/** Anos que o clube ainda banca depois de o jogador começar a cair. */
const YEARS_AFTER_DECLINE = 3

/**
 * Idade em que ESTE jogador perde a vaga para um garoto da base.
 *
 * Andar junto com o declínio de cada um é o que escalona a renovação: com a
 * saída presa nos 38 para todo mundo, o elenco inteiro envelhecia em bloco,
 * decaía junto e desabava de uma vez quando a leva toda se aposentava.
 */
const exitAgeOf = (peak: PeakPlayer): number =>
  Math.min(RETIRE_AGE, declineAgeFor(peak.bloom) + YEARS_AFTER_DECLINE)

const scaleAttrs = (peak: FifaAttributes, factor: number): FifaAttributes => ({
  pac: clampAttr(peak.pac * factor),
  fin: clampAttr(peak.fin * factor),
  pas: clampAttr(peak.pas * factor),
  dri: clampAttr(peak.dri * factor),
  def: clampAttr(peak.def * factor),
  fis: clampAttr(peak.fis * factor),
})

/**
 * Elenco do clube na temporada `careerYear`: todo mundo envelhece +1 por ano,
 * jovens crescem rumo ao potencial, veteranos decaem dos 32 em diante e quem
 * passa dos 38 se aposenta — um garoto da base (regen) herda a vaga.
 */
/** Prefixo que nationAsClub usa — seleção estrangeira tem nomes próprios. */
const NATION_PREFIX = 'nation-'

/**
 * Régua de qualidade de um clube: divisão manda, estrelas refinam.
 *
 * A divisão que conta é a que o clube disputa AGORA, não a que ele tinha no
 * catálogo. Sem isso o acesso não valia nada: o clube subia para a Série A e
 * seguia com elenco de Série D para sempre — e o seu título não mudava o time
 * que você recebia no ano seguinte.
 */
export const clubBaseQuality = (club: Club, division: number = club.division): number => {
  if (club.id.startsWith(NATION_PREFIX)) return NATION_QUALITY + club.strength * NATION_PER_STAR
  // divisionOf devolve -1 para quem está fora da pirâmide (clube continental,
  // seleção): aí a divisão de catálogo é a melhor informação que temos
  const known = division >= 0 && division < DIVISION_QUALITY.length
  const quality = DIVISION_QUALITY[known ? division : club.division] ?? DIVISION_QUALITY[3]
  return quality + club.strength * CLUB_PER_STAR
}

/**
 * Id da nacionalidade do "clube": seleção pelo prefixo, clube da Libertados
 * pelo país do catálogo continental. null = clube da liga brasileira.
 */
const nationalityOf = (clubId: string): string | null => {
  if (clubId.startsWith(NATION_PREFIX)) return clubId.slice(NATION_PREFIX.length)
  return continentalClubById(clubId)?.nationId ?? null
}

/**
 * Nomes do elenco. O gerador padrão é brasileiro (apelidos de várzea inclusos)
 * e serve aos clubes da liga e à seleção brasileira; as outras seleções puxam
 * da lista da própria nacionalidade.
 */
const squadNamesFor = (
  clubId: string,
  seedText: string,
  gender: PlayerGender,
): readonly string[] => {
  const nationality = nationalityOf(clubId)
  return nationality !== null && nationality !== 'brasil'
    ? foreignSquadFor(seedText, SQUAD_SIZE, nationality, gender)
    : squadFor(seedText, SQUAD_SIZE, gender)
}

/**
 * O mundo do jogo acompanha o gênero do atleta: numa carreira feminina, todos
 * os elencos e seleções são de jogadoras.
 */
export const squadPlayersFor = (
  club: Club,
  careerYear = 1,
  gender: PlayerGender = 'masculino',
  /** Divisão disputada nesta temporada. Sem ela, vale a do catálogo. */
  division: number = club.division,
): readonly SquadPlayer[] => {
  const names = squadNamesFor(club.id, `${club.id}-elenco`, gender)
  // cada clube monta o elenco para o PRÓPRIO esquema — no seu time você é o
  // técnico e pode mudar a forma por cima dos jogadores que herdou
  const positions = [...FORMATIONS[formationIdFor(club.id)].slots, ...BENCH_POSITIONS]
  const clubBase = clubBaseQuality(club, division)
  let state = hashSeed(`${club.id}-atributos`)

  /* Cada geração tem a própria lista de nomes, e listas diferentes podem
     sortear o mesmo nome. Como os slots renovam em anos distintos, o elenco
     acabava com dois "Pingo" — daí o registro de nomes já usados. */
  const generationNames = new Map<number, readonly string[]>()
  const namesOfGeneration = (generation: number): readonly string[] => {
    if (generation === 0) return names
    const cached = generationNames.get(generation)
    if (cached) return cached
    const list = squadNamesFor(club.id, `${club.id}-elenco-gen${generation}`, gender)
    generationNames.set(generation, list)
    return list
  }
  const used = new Set<string>()
  /** Nome do slot; se já houver alguém com ele, o próximo livre da lista. */
  const claimName = (generation: number, index: number): string => {
    const list = namesOfGeneration(generation)
    for (let step = 0; step < list.length; step++) {
      const candidate = list[(index + step) % list.length]
      if (candidate && !used.has(candidate)) {
        used.add(candidate)
        return candidate
      }
    }
    return `Jogador ${index + 1}`
  }

  return positions.map((position, index) => {
    const first = rollPeakPlayer(state, position, clubBase, BASE_MIN_AGE, BASE_MAX_AGE)
    state = first.nextState

    // gerações: cumprido o tempo dele, o regen assume a vaga no ano seguinte
    let generation = 0
    let peak = first
    let age = peak.baseAge + (careerYear - 1)
    let exitAge = exitAgeOf(peak)
    while (age > exitAge) {
      const yearsPastExit = age - exitAge
      generation++
      const regenState = hashSeed(`${club.id}-${index}-gen${generation}`)
      peak = rollPeakPlayer(regenState, position, clubBase, REGEN_MIN_AGE, REGEN_MAX_AGE)
      age = peak.baseAge + (yearsPastExit - 1)
      exitAge = exitAgeOf(peak)
    }
    const name = claimName(generation, index)

    const factor = ageFactor(age, peak.potential, peak.bloom)
    const agedAttrs = scaleAttrs(peak.attrs, factor)
    const attrs = club.id.startsWith(NATION_PREFIX)
      ? raiseToOverallFloor(position, agedAttrs, nationalOverallFloor(club.strength))
      : agedAttrs
    return {
      id: generation === 0 ? `${club.id}-${index}` : `${club.id}-${index}-g${generation}`,
      name,
      position,
      altPositions: peak.altPositions,
      age,
      potential: peak.potential,
      peakAge: peakAgeFor(peak.bloom),
      shirt: index + 1,
      attrs,
      overall: overallFor(position, attrs),
    }
  })
}

/**
 * O craque do jogador dentro do elenco: FIN/PAS/DEF vêm dos atributos REAIS
 * treinados no jogo; ritmo, drible e físico saem da SUA curva de idade.
 */
export const userAsSquadPlayer = (
  base: SquadPlayer,
  name: string,
  attributes: PlayerAttributes,
  position: SquadPosition = base.position,
  /** Sua idade real. Sem ela, herda a do jogador gerado no slot — que é outro. */
  age: number = base.age,
): SquadPlayer => {
  const scale = (level: number): number => USER_ATTR_BASE + level * USER_ATTR_PER_LEVEL
  // potencial 'alto': o protagonista da carreira tem o teto dos craques
  const physical = ageFactor(age, 'alto')
  const attrs: FifaAttributes = {
    pac: clampAttr(USER_PEAK_PHYSICAL.pac * physical),
    dri: clampAttr(USER_PEAK_PHYSICAL.dri * physical),
    fis: clampAttr(USER_PEAK_PHYSICAL.fis * physical),
    fin: scale(attributes.finalizacao),
    pas: scale(attributes.passe),
    def: scale(attributes.defesa),
  }
  return {
    ...base,
    id: USER_PLAYER_ID,
    name,
    position,
    age,
    altPositions: ALT_CANDIDATES[position],
    potential: 'alto',
    // o seu auge é o clássico: quem manda no resto é o treino, não o relógio
    peakAge: PEAK_AGE,
    attrs,
    overall: overallFor(position, attrs),
  }
}


/** Quão à vontade o jogador está numa posição. */
export type PositionFit = 'natural' | 'secundaria' | 'improvisado'

export const positionFit = (player: SquadPlayer, position: SquadPosition): PositionFit => {
  if (position === player.position) return 'natural'
  if (player.altPositions.includes(position)) return 'secundaria'
  return 'improvisado'
}

const SECONDARY_PENALTY = 2
const OUT_OF_POSITION_PENALTY = 8
/** Linha no gol (ou goleiro na linha) é outra profissão. */
const KEEPER_SWAP_PENALTY = 25
const MIN_EFFECTIVE_OVERALL = 25

/**
 * Overall EFETIVO numa posição: recalculado pelos pesos dela (um zagueiro tem
 * finalização baixa) e punido pelo improviso — sem bloqueio, só consequência.
 */
export const overallAt = (player: SquadPlayer, position: SquadPosition): number => {
  const fit = positionFit(player, position)
  const crossesKeeper = (position === 'GOL') !== (player.position === 'GOL')
  const penalty = crossesKeeper
    ? KEEPER_SWAP_PENALTY
    : fit === 'natural'
      ? 0
      : fit === 'secundaria'
        ? SECONDARY_PENALTY
        : OUT_OF_POSITION_PENALTY
  return Math.max(MIN_EFFECTIVE_OVERALL, overallFor(position, player.attrs) - penalty)
}

/** Força da escalação: média dos overalls efetivos nos slots da formação. */
export const lineupRating = (
  players: readonly (SquadPlayer | undefined)[],
  slots: readonly SquadPosition[],
): number => {
  const values = slots.map((slot, index) => {
    const player = players[index]
    return player ? overallAt(player, slot) : MIN_EFFECTIVE_OVERALL
  })
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}
