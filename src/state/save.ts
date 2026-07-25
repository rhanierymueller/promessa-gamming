import { clubById, type Club } from '../data/clubs'
import { nationById } from '../data/nations'
import {
  ATTRIBUTE_KEYS,
  DEFAULT_ATTRIBUTES,
  applyUpgrade,
  canUpgrade,
  trainingPointsForRating,
  upgradeCost,
  type AttributeKey,
  type PlayerAttributes,
} from '../engine/career/attributes'
import {
  DEFAULT_MORALE,
  clampMorale,
  driftMorale,
  isEventId,
  maybeEventForRound,
  resolveLifeEvent,
  type PendingLifeEvent,
} from '../engine/career/events'
import {
  dueMilestone,
  isMilestoneId,
  isPerkId,
  offerForMilestone,
  perkTrainingBonus,
  type PerkId,
  type PerkMilestoneId,
} from '../engine/career/perks'
import { createRival, rivalRoundGoals, type RivalState } from '../engine/career/rival'
import {
  applyPromotionRelegation,
  divisionOf,
  initialDivisions,
  type Divisions,
} from '../engine/pyramid/pyramid'
import { FORMATION_IDS, userSlotIndex, type FormationId, type PlayerFieldPosition } from '../engine/squad/formation'
import { allowanceFor, titlePrizeFor, type MarketPlayer, type Signing } from '../engine/market/market'
import { USER_PLAYER_ID, USER_SQUAD_INDEX } from '../engine/squad/players'
import { computeTable, createSeason, isSeasonOver } from '../engine/season/season'
import { createRng } from '../engine/rng'
import type { TournamentKind, TournamentState } from '../engine/tournament/tournament'
import { SEASON_TEAMS, type SeasonState } from '../engine/season/types'
import { isOffensiveName } from './moderation'

/**
 * Save do jogador com versão de schema — v1/v2 migram automaticamente para v3
 * (nacionalidade padrão Brasil + temporada nova).
 */

export const SAVE_VERSION = 18
const SAVE_KEY = 'promessa.save'
export const MAX_PLAYER_NAME = 16
const DEFAULT_SHIRT_NUMBER = 10
const DEFAULT_NATIONALITY = 'brasil'
/** Comemorações desenhadas disponíveis (sprites celeb_0..3). */
export const CELEBRATION_COUNT = 4
/** Catálogo de aparência (paletas visuais em game/appearance.ts). */
export const SKIN_TONE_COUNT = 5
export const HAIR_COLOR_COUNT = 4
export const KIT_COLOR_COUNT = 6

export const MAX_CLUB_NAME = 24

/** Só as últimas partidas ficam gravadas — o resto vira total da carreira. */
export const HISTORY_LIMIT = 10

export interface CareerTotals {
  readonly games: number
  readonly wins: number
  readonly draws: number
  readonly losses: number
  readonly goals: number
  readonly ratingSum: number
}

const EMPTY_CAREER: CareerTotals = { games: 0, wins: 0, draws: 0, losses: 0, goals: 0, ratingSum: 0 }

const addToCareer = (career: CareerTotals, record: MatchRecord): CareerTotals => ({
  games: career.games + 1,
  wins: career.wins + (record.teamGoals > record.opponentGoals ? 1 : 0),
  draws: career.draws + (record.teamGoals === record.opponentGoals ? 1 : 0),
  losses: career.losses + (record.teamGoals < record.opponentGoals ? 1 : 0),
  goals: career.goals + record.playerGoals,
  ratingSum: career.ratingSum + record.rating,
})

export const PLAYER_MIN_AGE = 16
export const PLAYER_MAX_AGE = 37
const DEFAULT_PLAYER_AGE = 18
const DEFAULT_POSITION: PlayerFieldPosition = 'ATA'
const DEFAULT_FORMATION: FormationId = '4-3-3'
/** Pontos extras distribuíveis na criação, além da base 3 em cada atributo. */
export const CREATE_EXTRA_POINTS = 10
const BASE_ATTR_TOTAL = 12

const FIELD_POSITIONS: readonly PlayerFieldPosition[] = ['LD', 'ZAG', 'LE', 'VOL', 'MEI', 'PON', 'ATA']

export interface SaveAccount {
  readonly email: string
  readonly username: string
}

export type PlayerGender = 'masculino' | 'feminino'

export interface PlayerAppearance {
  /** Índice do tom de pele (0 = original da arte). */
  readonly skin: number
  /** Índice da cor de cabelo (0 = original da arte). */
  readonly hair: number
  /** Índice da cor do uniforme (0 = amarelo original). */
  readonly kit: number
  readonly gender: PlayerGender
}

export const DEFAULT_APPEARANCE: PlayerAppearance = {
  skin: 0,
  hair: 0,
  kit: 0,
  gender: 'masculino',
}

export type Competition = 'liga' | 'amistoso' | 'selecao'

export interface MatchRecord {
  readonly opponentId: string
  readonly teamGoals: number
  readonly opponentGoals: number
  readonly rating: number
  readonly playerGoals: number
  readonly playedAt: number
  readonly competition: Competition
}

export interface PlayerSave {
  readonly version: typeof SAVE_VERSION
  readonly playerName: string
  readonly clubId: string
  readonly nationalityId: string
  readonly shirtNumber: number
  /** Ano da carreira (temporada 1, 2, 3…) — define o torneio do calendário. */
  readonly careerYear: number
  /** Já disputou o torneio de seleções desta temporada. */
  readonly tournamentPlayed: boolean
  readonly tournament: TournamentState | null
  readonly season: SeasonState
  readonly history: readonly MatchRecord[]
  readonly attributes: PlayerAttributes
  readonly trainingPoints: number
  /** Comemoração escolhida para os gols (índice em celeb_0..3). */
  readonly celebrationId: number
  /** Aparência do craque (pele, cabelo, gênero). */
  readonly appearance: PlayerAppearance
  /** Renomeações LOCAIS de clubes feitas pelo jogador (clubId → nome). */
  readonly customClubNames: Readonly<Record<string, string>>
  /** Escudos LOCAIS enviados pelo jogador (clubId → data URL 64px). */
  readonly customClubCrests: Readonly<Record<string, string>>
  /** Pirâmide atual: 4 divisões × 14 clubes (muda com acesso/queda). */
  readonly divisions: Divisions
  /** Resultado da última virada de temporada (banner na Home). */
  readonly divisionMovement: 'up' | 'down' | 'stay' | null
  /** Idade do craque na criação (16-40). */
  readonly playerAge: number
  /** Posição de linha escolhida (goleiro não). */
  readonly playerPosition: PlayerFieldPosition
  /** Conta online (sem senha — a senha vive só no Supabase). */
  readonly account: SaveAccount | null
  /** Formação tática do SEU time — você é o técnico. */
  readonly formation: FormationId
  /** Escalação: índice do elenco (0-17) em cada um dos 11 slots da formação. */
  readonly lineup: readonly number[]
  /** Totais da carreira — o histórico detalhado guarda só as últimas 10. */
  readonly career: CareerTotals
  /** Nomes LOCAIS dos SEUS jogadores (playerId → nome) — cada um editável UMA vez. */
  readonly customPlayerNames: Readonly<Record<string, string>>
  /** Cores LOCAIS dos clubes (clubId → {primary, secondary}). */
  readonly customClubColors: Readonly<Record<string, ClubColors>>
  /** Verba de transferências da temporada (renova pela divisão). */
  readonly budget: number
  /** Reforços contratados no mercado. */
  readonly signings: readonly Signing[]
  /** Sala de troféus: títulos conquistados com o ano. */
  readonly trophies: readonly Trophy[]
  /** Habilidades de RPG adquiridas nos marcos da carreira. */
  readonly perks: readonly PerkId[]
  /** Escolha de perk pendente (1 de até 3) — null sem marco aberto. */
  readonly perkOffer: PerkOffer | null
  /** Marcos já disparados (cada um oferece perk uma única vez). */
  readonly claimedMilestones: readonly PerkMilestoneId[]
  /** Moral do craque (0-100) — entra em campo na nota inicial. */
  readonly morale: number
  /** Evento de vida aguardando decisão (null = semana tranquila). */
  readonly pendingEvent: PendingLifeEvent | null
  /** Resultado do último evento — banner na Home até dispensar. */
  readonly eventNote: string | null
  /** O nêmesis: atacante rival que disputa a artilharia com você. */
  readonly rival: RivalState | null
}

export interface PerkOffer {
  readonly milestone: PerkMilestoneId
  readonly options: readonly PerkId[]
}

export type TrophyKind = 'serie-a' | 'serie-b' | 'serie-c' | 'serie-d' | TournamentKind

export interface Trophy {
  readonly kind: TrophyKind
  readonly year: number
}

const DIVISION_TROPHIES: readonly TrophyKind[] = ['serie-a', 'serie-b', 'serie-c', 'serie-d']

export interface ClubColors {
  readonly primary: string
  readonly secondary: string
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>
type RandomRoll = () => number

const seasonSeed = (roll: RandomRoll): number => Math.floor(roll() * 0xffffffff) >>> 0

export const sanitizePlayerName = (raw: string): string =>
  raw.trim().slice(0, MAX_PLAYER_NAME)

/** Escalação padrão: titulares 0-10 com o SEU craque no slot da posição dele. */
const defaultLineup = (formation: FormationId, position: PlayerFieldPosition): readonly number[] => {
  const lineup = Array.from({ length: 11 }, (_, index) => index)
  const slot = userSlotIndex(formation, position)
  lineup[USER_SQUAD_INDEX] = lineup[slot]
  lineup[slot] = USER_SQUAD_INDEX
  return lineup
}

const isValidCreateAttributes = (attributes: PlayerAttributes): boolean => {
  const values = ATTRIBUTE_KEYS.map((key) => attributes[key])
  const total = values.reduce((sum, value) => sum + value, 0)
  return (
    values.every((value) => Number.isInteger(value) && value >= 1 && value <= 10) &&
    total <= BASE_ATTR_TOTAL + CREATE_EXTRA_POINTS
  )
}

export interface CreateSaveInput {
  readonly playerName: string
  /** Clube existente OU deixe vazio e informe teamName para criar o seu. */
  readonly clubId?: string
  /** Nome do SEU time — entra na Série D no lugar de um clube (14 mantidos). */
  readonly teamName?: string
  readonly nationalityId?: string
  readonly playerAge?: number
  readonly playerPosition?: PlayerFieldPosition
  /** Atributos após distribuir os pontos extras da criação. */
  readonly attributes?: PlayerAttributes
  readonly account?: SaveAccount | null
}

export const createSave = (
  input: CreateSaveInput,
  roll: RandomRoll = Math.random,
): PlayerSave | null => {
  const name = sanitizePlayerName(input.playerName)
  const nationalityId = input.nationalityId ?? DEFAULT_NATIONALITY
  const age = input.playerAge ?? DEFAULT_PLAYER_AGE
  const position = input.playerPosition ?? DEFAULT_POSITION
  const attributes = input.attributes ?? DEFAULT_ATTRIBUTES
  if (name.length === 0 || !nationById(nationalityId)) return null
  if (isOffensiveName(name)) return null
  if (!Number.isInteger(age) || age < PLAYER_MIN_AGE || age > PLAYER_MAX_AGE) return null
  if (!FIELD_POSITIONS.includes(position)) return null
  if (!isValidCreateAttributes(attributes)) return null

  const divisions = initialDivisions()
  const teamName = input.teamName?.trim().slice(0, MAX_CLUB_NAME) ?? ''
  let clubId = input.clubId ?? ''
  let customClubNames: Readonly<Record<string, string>> = {}
  if (!clubById(clubId)) {
    if (teamName.length === 0 || isOffensiveName(teamName)) return null
    // o SEU time: um clube host da Série D veste o nome que você digitou
    const serieD = divisions[3]
    clubId = serieD[Math.floor(roll() * serieD.length) % serieD.length]
    customClubNames = { [clubId]: teamName }
  } else if (teamName.length > 0) {
    customClubNames = { [clubId]: teamName }
  }

  const account =
    input.account && input.account.email.trim() && input.account.username.trim()
      ? { email: input.account.email.trim(), username: input.account.username.trim() }
      : null

  return {
    version: SAVE_VERSION,
    playerName: name,
    clubId,
    nationalityId,
    shirtNumber: DEFAULT_SHIRT_NUMBER,
    careerYear: 1,
    tournamentPlayed: false,
    tournament: null,
    season: createSeason(clubId, seasonSeed(roll), divisions[divisionOf(divisions, clubId)]),
    history: [],
    attributes,
    trainingPoints: 0,
    celebrationId: 0,
    appearance: DEFAULT_APPEARANCE,
    customClubNames,
    customClubCrests: {},
    divisions,
    divisionMovement: null,
    playerAge: age,
    playerPosition: position,
    account,
    formation: DEFAULT_FORMATION,
    lineup: defaultLineup(DEFAULT_FORMATION, position),
    career: EMPTY_CAREER,
    customPlayerNames: {},
    customClubColors: {},
    budget: allowanceFor(divisionOf(divisions, clubId)),
    signings: [],
    trophies: [],
    perks: [],
    perkOffer: null,
    claimedMilestones: [],
    morale: DEFAULT_MORALE,
    pendingEvent: null,
    eventNote: null,
    rival: null,
  }
}

/** Checa marcos da carreira: dispara UMA oferta de perk por vez. */
const withMilestoneCheck = (
  save: PlayerSave,
  lastRating: number,
  promoted: boolean,
): PlayerSave => {
  if (save.perkOffer) return save
  const due = dueMilestone(
    {
      games: save.career.games,
      goals: save.career.goals,
      lastRating,
      trophiesCount: save.trophies.length,
      promoted,
    },
    save.claimedMilestones,
  )
  if (!due) return save
  const options = offerForMilestone(due, save.perks)
  const claimedMilestones = [...save.claimedMilestones, due]
  if (options.length === 0) return { ...save, claimedMilestones }
  return { ...save, claimedMilestones, perkOffer: { milestone: due, options } }
}

/** Escolhe um perk da oferta pendente — no-op se a opção não estiver nela. */
export const choosePerk = (save: PlayerSave, perkId: PerkId): PlayerSave => {
  if (!save.perkOffer || !save.perkOffer.options.includes(perkId)) return save
  if (save.perks.includes(perkId)) return { ...save, perkOffer: null }
  return { ...save, perks: [...save.perks, perkId], perkOffer: null }
}

/** Você é o técnico: muda o desenho tático mantendo o seu craque em campo. */
export const setFormation = (save: PlayerSave, formation: FormationId): PlayerSave => {
  if (!FORMATION_IDS.includes(formation)) return save
  const lineup = [...save.lineup]
  const currentSlot = lineup.indexOf(USER_SQUAD_INDEX)
  const wantedSlot = userSlotIndex(formation, save.playerPosition)
  if (currentSlot !== wantedSlot && currentSlot >= 0) {
    const displaced = lineup[wantedSlot]
    lineup[wantedSlot] = USER_SQUAD_INDEX
    lineup[currentSlot] = displaced
  }
  return { ...save, formation, lineup }
}

/**
 * Troca de escalação: coloca `squadIndex` (0-17) no slot `slotIndex`.
 * O seu craque não sai de campo; jogador já titular troca de slot.
 */
export const swapLineup = (save: PlayerSave, slotIndex: number, squadIndex: number): PlayerSave => {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= save.lineup.length) return save
  if (!Number.isInteger(squadIndex) || squadIndex < 0 || squadIndex > 17) return save
  if (save.lineup[slotIndex] === USER_SQUAD_INDEX) return save
  if (squadIndex === USER_SQUAD_INDEX) return save
  const lineup = [...save.lineup]
  const alreadyAt = lineup.indexOf(squadIndex)
  if (alreadyAt === slotIndex) return save
  if (alreadyAt >= 0) {
    lineup[alreadyAt] = lineup[slotIndex]
  }
  lineup[slotIndex] = squadIndex
  return { ...save, lineup }
}

export const setShirtNumber = (save: PlayerSave, shirtNumber: number): PlayerSave => ({
  ...save,
  shirtNumber: Math.min(99, Math.max(1, Math.round(shirtNumber))),
})

/** Escolhe a comemoração dos gols — ignora índices fora do catálogo. */
export const setCelebration = (save: PlayerSave, celebrationId: number): PlayerSave => {
  if (!Number.isInteger(celebrationId) || celebrationId < 0 || celebrationId >= CELEBRATION_COUNT) {
    return save
  }
  return { ...save, celebrationId }
}

const isValidIndex = (value: number, count: number): boolean =>
  Number.isInteger(value) && value >= 0 && value < count

/** Atualiza a aparência — ignora índices fora dos catálogos. */
export const setAppearance = (save: PlayerSave, appearance: PlayerAppearance): PlayerSave => {
  if (
    !isValidIndex(appearance.skin, SKIN_TONE_COUNT) ||
    !isValidIndex(appearance.hair, HAIR_COLOR_COUNT) ||
    !isValidIndex(appearance.kit, KIT_COLOR_COUNT) ||
    (appearance.gender !== 'masculino' && appearance.gender !== 'feminino')
  ) {
    return save
  }
  return { ...save, appearance }
}

/**
 * Renomeia um clube SÓ neste save (edição local do jogador). Nome vazio ou
 * igual ao original remove a personalização.
 */
export const renameClub = (save: PlayerSave, clubId: string, rawName: string): PlayerSave => {
  const club = clubById(clubId)
  if (!club) return save
  const name = rawName.trim().slice(0, MAX_CLUB_NAME)
  if (name.length > 0 && isOffensiveName(name)) return save
  const next: Record<string, string> = { ...save.customClubNames }
  if (name.length === 0 || name === club.name) {
    delete next[clubId]
  } else {
    next[clubId] = name
  }
  return { ...save, customClubNames: next }
}

export const MAX_SQUAD_PLAYER_NAME = 20

/**
 * Batiza um jogador do SEU time — vale só neste save e cada jogador pode ser
 * renomeado UMA única vez (escolha bem). O seu craque usa o nome da carreira.
 */
export const setPlayerName = (save: PlayerSave, playerId: string, rawName: string): PlayerSave => {
  if (playerId === USER_PLAYER_ID) return save
  // vale para o elenco do MEU clube e para reforços contratados no mercado
  if (!playerId.startsWith(`${save.clubId}-`) && !playerId.startsWith('mkt-')) return save
  if (save.customPlayerNames[playerId] !== undefined) return save
  const name = rawName.trim().slice(0, MAX_SQUAD_PLAYER_NAME)
  if (name.length === 0 || isOffensiveName(name)) return save
  return { ...save, customPlayerNames: { ...save.customPlayerNames, [playerId]: name } }
}

/** Aplica o estado do torneio; título de seleção dá TAÇA (sem dinheiro). */
export const withTournamentState = (save: PlayerSave, state: TournamentState): PlayerSave => {
  const becameChampion = state.stage === 'champion' && save.tournament?.stage !== 'champion'
  const updated: PlayerSave = {
    ...save,
    tournament: state,
    trophies: becameChampion
      ? [...save.trophies, { kind: state.kind, year: save.careerYear }]
      : save.trophies,
  }
  return becameChampion ? withMilestoneCheck(updated, 0, false) : updated
}

/** Contrata um jogador do mercado: desconta a verba e grava o reforço. */
export const signPlayer = (save: PlayerSave, player: MarketPlayer): PlayerSave => {
  if (player.price > save.budget) return save
  if (save.signings.some((signing) => signing.id === player.id)) return save
  const signing: Signing = {
    id: player.id,
    name: player.name,
    position: player.position,
    altPositions: player.altPositions,
    nationality: player.nationality,
    baseAge: player.baseAge,
    boughtYear: save.careerYear,
    potential: player.potential,
    peakAttrs: player.peakAttrs,
    price: player.price,
  }
  return { ...save, budget: save.budget - player.price, signings: [...save.signings, signing] }
}

/** Nome de exibição de um jogador do elenco, com o batismo local aplicado. */
export const squadPlayerDisplayName = (save: PlayerSave, playerId: string, original: string): string =>
  save.customPlayerNames[playerId] ?? original

const normalizePlayerNames = (value: unknown): Readonly<Record<string, string>> => {
  if (typeof value !== 'object' || value === null) return {}
  const result: Record<string, string> = {}
  for (const [playerId, name] of Object.entries(value as Record<string, unknown>)) {
    if (typeof name === 'string' && name.trim().length > 0) {
      result[playerId] = name.trim().slice(0, MAX_SQUAD_PLAYER_NAME)
    }
  }
  return result
}

/** Nome de exibição do clube, com a renomeação local aplicada. */
export const clubDisplayName = (save: PlayerSave, clubId: string): string =>
  save.customClubNames[clubId] ?? clubById(clubId)?.name ?? '???'

const abbrFor = (name: string): string => {
  const letters = name.normalize('NFD').replace(/[^a-zA-Z]/g, '').toUpperCase()
  return (letters + 'XXX').slice(0, 3)
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

/** Pinta um clube com as SUAS cores (local ao save); null volta ao original. */
export const setClubColors = (
  save: PlayerSave,
  clubId: string,
  primary: string | null,
  secondary?: string,
): PlayerSave => {
  if (!clubById(clubId)) return save
  if (primary === null) {
    const next = { ...save.customClubColors }
    delete next[clubId]
    return { ...save, customClubColors: next }
  }
  if (!HEX_COLOR.test(primary) || !secondary || !HEX_COLOR.test(secondary)) return save
  return {
    ...save,
    customClubColors: { ...save.customClubColors, [clubId]: { primary, secondary } },
  }
}

const normalizeBudget = (value: unknown, divisions: Divisions, clubId: string): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : allowanceFor(divisionOf(divisions, clubId))

const VALID_POSITIONS = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MEI', 'PON', 'ATA']

const isValidSigning = (value: unknown): value is Signing => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    VALID_POSITIONS.includes(candidate.position as string) &&
    typeof candidate.baseAge === 'number' &&
    typeof candidate.boughtYear === 'number' &&
    typeof candidate.price === 'number' &&
    typeof candidate.peakAttrs === 'object' &&
    candidate.peakAttrs !== null
  )
}

const normalizeSignings = (value: unknown): readonly Signing[] =>
  Array.isArray(value) ? value.filter(isValidSigning) : []

const VALID_TROPHIES: readonly string[] = [
  'serie-a', 'serie-b', 'serie-c', 'serie-d', 'copa-america', 'liga-nacoes', 'copa-mundo',
]

const normalizePerks = (value: unknown): readonly PerkId[] =>
  Array.isArray(value) ? [...new Set(value.filter(isPerkId))] : []

const normalizePerkOffer = (value: unknown, owned: readonly PerkId[]): PerkOffer | null => {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (!isMilestoneId(candidate.milestone) || !Array.isArray(candidate.options)) return null
  const options = candidate.options.filter(isPerkId).filter((id) => !owned.includes(id))
  return options.length > 0 ? { milestone: candidate.milestone, options } : null
}

const normalizeMilestones = (value: unknown): readonly PerkMilestoneId[] =>
  Array.isArray(value) ? [...new Set(value.filter(isMilestoneId))] : []

const normalizeRival = (value: unknown): RivalState | null => {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.name !== 'string' || candidate.name.length === 0) return null
  if (typeof candidate.clubId !== 'string' || !clubById(candidate.clubId)) return null
  const count = (raw: unknown): number =>
    typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0
  return {
    name: candidate.name,
    clubId: candidate.clubId,
    seasonGoals: count(candidate.seasonGoals),
    careerGoals: count(candidate.careerGoals),
    mySeasonGoals: count(candidate.mySeasonGoals),
  }
}

const normalizeMorale = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? clampMorale(value) : DEFAULT_MORALE

const normalizePendingEvent = (value: unknown): PendingLifeEvent | null => {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  return isEventId(candidate.templateId) && typeof candidate.seed === 'number'
    ? { templateId: candidate.templateId, seed: Math.floor(candidate.seed) }
    : null
}

const normalizeTrophies = (value: unknown): readonly Trophy[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is Trophy =>
          typeof entry === 'object' &&
          entry !== null &&
          VALID_TROPHIES.includes((entry as Trophy).kind) &&
          typeof (entry as Trophy).year === 'number',
      )
    : []

const normalizeClubColors = (value: unknown): Readonly<Record<string, ClubColors>> => {
  if (typeof value !== 'object' || value === null) return {}
  const result: Record<string, ClubColors> = {}
  for (const [clubId, colors] of Object.entries(value as Record<string, unknown>)) {
    if (typeof colors !== 'object' || colors === null || !clubById(clubId)) continue
    const candidate = colors as Record<string, unknown>
    if (
      typeof candidate.primary === 'string' &&
      typeof candidate.secondary === 'string' &&
      HEX_COLOR.test(candidate.primary) &&
      HEX_COLOR.test(candidate.secondary)
    ) {
      result[clubId] = { primary: candidate.primary, secondary: candidate.secondary }
    }
  }
  return result
}

/** Clube com nome/abreviação/cores de exibição personalizados aplicados. */
export const displayClub = (save: PlayerSave, club: Club): Club => {
  const customName = save.customClubNames[club.id]
  const customColors = save.customClubColors[club.id]
  if (!customName && !customColors) return club
  return {
    ...club,
    ...(customName ? { name: customName, abbr: abbrFor(customName) } : {}),
    ...(customColors ? { colors: customColors } : {}),
  }
}

const normalizePosition = (value: unknown): PlayerFieldPosition =>
  FIELD_POSITIONS.includes(value as PlayerFieldPosition) ? (value as PlayerFieldPosition) : DEFAULT_POSITION

const normalizeFormation = (value: unknown): FormationId =>
  FORMATION_IDS.includes(value as FormationId) ? (value as FormationId) : DEFAULT_FORMATION

const normalizeAccount = (value: unknown): SaveAccount | null => {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.email !== 'string' || typeof candidate.username !== 'string') return null
  const email = candidate.email.trim()
  const username = candidate.username.trim()
  return email.length > 0 && username.length > 0 ? { email, username } : null
}

const normalizeLineup = (
  value: unknown,
  formation: FormationId,
  position: PlayerFieldPosition,
): readonly number[] => {
  const fallback = defaultLineup(formation, position)
  if (!Array.isArray(value) || value.length !== 11) return fallback
  const numbers = value as unknown[]
  const valid = numbers.every(
    (entry) => typeof entry === 'number' && Number.isInteger(entry) && entry >= 0 && entry <= 17,
  )
  if (!valid) return fallback
  const lineup = numbers as number[]
  if (new Set(lineup).size !== 11 || !lineup.includes(USER_SQUAD_INDEX)) return fallback
  return [...lineup]
}

const isValidCareer = (value: unknown): value is CareerTotals => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return ['games', 'wins', 'draws', 'losses', 'goals', 'ratingSum'].every(
    (key) => typeof candidate[key] === 'number' && Number.isFinite(candidate[key]),
  )
}

/** Sem totais salvos (saves antigos), reconstrói a carreira do histórico. */
const normalizeCareer = (value: unknown, fullHistory: readonly MatchRecord[]): CareerTotals => {
  if (isValidCareer(value)) return value
  return fullHistory.reduce(addToCareer, EMPTY_CAREER)
}

const normalizeClubNames = (value: unknown): Readonly<Record<string, string>> => {
  if (typeof value !== 'object' || value === null) return {}
  const result: Record<string, string> = {}
  for (const [clubId, name] of Object.entries(value as Record<string, unknown>)) {
    if (typeof name === 'string' && name.trim().length > 0 && clubById(clubId)) {
      result[clubId] = name.trim().slice(0, MAX_CLUB_NAME)
    }
  }
  return result
}

const normalizeCrests = (value: unknown): Readonly<Record<string, string>> => {
  if (typeof value !== 'object' || value === null) return {}
  const result: Record<string, string> = {}
  for (const [clubId, dataUrl] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof dataUrl === 'string' &&
      dataUrl.startsWith('data:image/png;base64,') &&
      dataUrl.length <= 120_000 &&
      clubById(clubId)
    ) {
      result[clubId] = dataUrl
    }
  }
  return result
}

const normalizeDivisions = (value: unknown, clubId: string): Divisions => {
  const fallback = initialDivisions()
  if (!Array.isArray(value) || value.length !== fallback.length) return fallback
  const divisions = value as unknown[]
  const flat: string[] = []
  for (const division of divisions) {
    if (!Array.isArray(division) || division.length !== fallback[0].length) return fallback
    for (const id of division) {
      if (typeof id !== 'string' || !clubById(id)) return fallback
      flat.push(id)
    }
  }
  if (new Set(flat).size !== flat.length || !flat.includes(clubId)) return fallback
  return divisions as Divisions
}

const normalizeAppearance = (value: unknown): PlayerAppearance => {
  if (typeof value !== 'object' || value === null) return DEFAULT_APPEARANCE
  const raw = value as Record<string, unknown>
  return {
    skin:
      typeof raw.skin === 'number' && isValidIndex(raw.skin, SKIN_TONE_COUNT) ? raw.skin : 0,
    hair:
      typeof raw.hair === 'number' && isValidIndex(raw.hair, HAIR_COLOR_COUNT) ? raw.hair : 0,
    kit:
      typeof raw.kit === 'number' && isValidIndex(raw.kit, KIT_COLOR_COUNT) ? raw.kit : 0,
    gender: raw.gender === 'feminino' ? 'feminino' : 'masculino',
  }
}

export const recordMatch = (save: PlayerSave, record: MatchRecord): PlayerSave => {
  const isWin = record.teamGoals > record.opponentGoals
  const isLoss = record.teamGoals < record.opponentGoals
  const career = addToCareer(save.career, record)
  // a vida de craque só bate na porta entre rodadas da liga
  const eventSeed = (save.season.seed ^ Math.imul(career.games, 0x9e3779b9)) >>> 0
  const pendingEvent =
    save.pendingEvent ?? (record.competition === 'liga' ? maybeEventForRound(eventSeed) : null)
  // o nêmesis nasce no primeiro jogo de liga e marca os dele em paralelo
  const isLeague = record.competition === 'liga'
  const baseRival =
    save.rival ??
    (isLeague
      ? createRival(
          (save.season.seed ^ 0xabc1234) >>> 0,
          save.season.participants.filter((id) => id !== save.clubId),
        )
      : null)
  const rival =
    baseRival && isLeague
      ? (() => {
          const scored = rivalRoundGoals(save.season.seed, save.season.currentRound)
          return {
            ...baseRival,
            seasonGoals: baseRival.seasonGoals + scored,
            careerGoals: baseRival.careerGoals + scored,
            mySeasonGoals: baseRival.mySeasonGoals + record.playerGoals,
          }
        })()
      : baseRival
  const updated: PlayerSave = {
    ...save,
    history: [...save.history, record].slice(-HISTORY_LIMIT),
    career,
    trainingPoints:
      save.trainingPoints +
      trainingPointsForRating(record.rating) +
      perkTrainingBonus(save.perks, isWin),
    morale: driftMorale(save.morale, isWin, isLoss),
    pendingEvent,
    rival,
  }
  return withMilestoneCheck(updated, record.rating, false)
}

/** Decide o evento de vida pendente: moral (e às vezes treino) reagem. */
export const resolvePendingEvent = (save: PlayerSave, optionIndex: number): PlayerSave => {
  if (!save.pendingEvent) return save
  const result = resolveLifeEvent(save.pendingEvent.templateId, optionIndex, save.pendingEvent.seed)
  return {
    ...save,
    morale: clampMorale(save.morale + result.moraleDelta),
    trainingPoints: save.trainingPoints + result.trainingPoints,
    pendingEvent: null,
    eventNote: result.note,
  }
}

export const dismissEventNote = (save: PlayerSave): PlayerSave => ({ ...save, eventNote: null })

/** Gasta pontos de treino para subir um atributo — no-op se não puder pagar. */
export const trainAttribute = (save: PlayerSave, key: AttributeKey): PlayerSave => {
  if (!canUpgrade(save.attributes, key, save.trainingPoints)) return save
  return {
    ...save,
    attributes: applyUpgrade(save.attributes, key),
    trainingPoints: save.trainingPoints - upgradeCost(save.attributes[key]),
  }
}

export const applySeason = (save: PlayerSave, season: SeasonState): PlayerSave => ({
  ...save,
  season,
})

export const applyTournament = (save: PlayerSave, tournament: TournamentState | null): PlayerSave => ({
  ...save,
  tournament,
  tournamentPlayed: save.tournamentPlayed || tournament !== null,
})

/**
 * Vira o ano: aplica ACESSO/QUEDA na pirâmide (tabela real da sua divisão,
 * demais simuladas) e monta a temporada da nova divisão do clube.
 */
export const startNewSeason = (save: PlayerSave, roll: RandomRoll = Math.random): PlayerSave => {
  const playerDivision = divisionOf(save.divisions, save.clubId)
  const finalOrder = computeTable(save.season).map((row) => row.clubId)
  // título da divisão: prêmio em dinheiro + taça na estante
  const isChampion = isSeasonOver(save.season) && finalOrder[0] === save.clubId
  const shiftSeed = seasonSeed(roll)
  const shift = applyPromotionRelegation(
    save.divisions,
    playerDivision,
    finalOrder,
    save.clubId,
    createRng(shiftSeed),
  )
  const nextDivision = divisionOf(shift.value.divisions, save.clubId)
  const nextSeason = createSeason(save.clubId, seasonSeed(roll), shift.value.divisions[nextDivision])
  // o nêmesis te persegue: sempre arruma clube na SUA divisão
  const rival = save.rival
    ? {
        ...save.rival,
        clubId: nextSeason.participants.find((id) => id !== save.clubId) ?? save.rival.clubId,
        seasonGoals: 0,
        mySeasonGoals: 0,
      }
    : null
  const updated: PlayerSave = {
    ...save,
    careerYear: save.careerYear + 1,
    playerAge: save.playerAge + 1,
    tournamentPlayed: false,
    tournament: null,
    divisions: shift.value.divisions,
    divisionMovement: shift.value.movement,
    season: nextSeason,
    budget: save.budget + allowanceFor(nextDivision) + (isChampion ? titlePrizeFor(playerDivision) : 0),
    trophies: isChampion
      ? [...save.trophies, { kind: DIVISION_TROPHIES[playerDivision], year: save.careerYear }]
      : save.trophies,
    rival,
  }
  return withMilestoneCheck(updated, 0, shift.value.movement === 'up')
}

/** Envia (ou remove, com null) o escudo local de um clube. */
export const setClubCrest = (save: PlayerSave, clubId: string, dataUrl: string | null): PlayerSave => {
  if (!clubById(clubId)) return save
  const next: Record<string, string> = { ...save.customClubCrests }
  if (dataUrl === null || !dataUrl.startsWith('data:image/png;base64,') || dataUrl.length > 120_000) {
    delete next[clubId]
  } else {
    next[clubId] = dataUrl
  }
  return { ...save, customClubCrests: next }
}

const isMatchRecord = (value: unknown): value is Omit<MatchRecord, 'competition'> & { competition?: unknown } => {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.opponentId === 'string' &&
    typeof record.teamGoals === 'number' &&
    typeof record.opponentGoals === 'number' &&
    typeof record.rating === 'number' &&
    typeof record.playerGoals === 'number' &&
    typeof record.playedAt === 'number'
  )
}

const normalizeHistory = (raw: unknown): MatchRecord[] => {
  if (!Array.isArray(raw)) return []
  return raw.filter(isMatchRecord).map((record) => ({
    ...record,
    competition:
      record.competition === 'amistoso' || record.competition === 'selecao'
        ? record.competition
        : 'liga',
  }))
}

const isValidSeason = (value: unknown, clubId: string): value is SeasonState => {
  if (typeof value !== 'object' || value === null) return false
  const season = value as Record<string, unknown>
  return (
    typeof season.seed === 'number' &&
    season.playerClubId === clubId &&
    Array.isArray(season.participants) &&
    season.participants.length === SEASON_TEAMS &&
    typeof season.currentRound === 'number' &&
    Array.isArray(season.results)
  )
}

const normalizeAttributes = (value: unknown): PlayerAttributes => {
  if (typeof value !== 'object' || value === null) return DEFAULT_ATTRIBUTES
  const raw = value as Record<string, unknown>
  const result = { ...DEFAULT_ATTRIBUTES } as Record<AttributeKey, number>
  for (const key of ATTRIBUTE_KEYS) {
    const level = raw[key]
    if (typeof level === 'number' && level >= 1 && level <= 10) result[key] = Math.floor(level)
  }
  return result
}

const isValidTournament = (value: unknown): value is TournamentState => {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return (
    typeof t.kind === 'string' &&
    typeof t.playerNationId === 'string' &&
    Array.isArray(t.groupA) &&
    Array.isArray(t.groupB) &&
    typeof t.stage === 'string' &&
    Array.isArray(t.results)
  )
}

/** v1/v2/v3 → v4: preserva nome, clube, camisa e histórico; o resto ganha default. */
const migrateLegacy = (candidate: Record<string, unknown>): PlayerSave | null => {
  if (typeof candidate.playerName !== 'string' || typeof candidate.clubId !== 'string') return null
  const base = createSave({ playerName: candidate.playerName, clubId: candidate.clubId })
  if (!base) return null
  const withShirt =
    typeof candidate.shirtNumber === 'number' ? setShirtNumber(base, candidate.shirtNumber) : base
  const fullHistory = normalizeHistory(candidate.history)
  return {
    ...withShirt,
    history: fullHistory.slice(-HISTORY_LIMIT),
    career: fullHistory.reduce(addToCareer, EMPTY_CAREER),
  }
}

const parseCurrent = (candidate: Record<string, unknown>): PlayerSave | null => {
  if (typeof candidate.playerName !== 'string' || typeof candidate.clubId !== 'string') return null
  const name = sanitizePlayerName(candidate.playerName)
  if (name.length === 0 || !clubById(candidate.clubId)) return null
  const nationalityId =
    typeof candidate.nationalityId === 'string' && nationById(candidate.nationalityId)
      ? candidate.nationalityId
      : DEFAULT_NATIONALITY
  const divisions = normalizeDivisions(candidate.divisions, candidate.clubId)
  const season = isValidSeason(candidate.season, candidate.clubId)
    ? candidate.season
    : createSeason(
        candidate.clubId,
        seasonSeed(Math.random),
        divisions[divisionOf(divisions, candidate.clubId)],
      )
  const tournament = isValidTournament(candidate.tournament) ? candidate.tournament : null
  const attributes = normalizeAttributes(candidate.attributes)
  const trainingPoints =
    typeof candidate.trainingPoints === 'number' && candidate.trainingPoints >= 0
      ? Math.floor(candidate.trainingPoints)
      : 0
  const celebrationId =
    typeof candidate.celebrationId === 'number' &&
    Number.isInteger(candidate.celebrationId) &&
    candidate.celebrationId >= 0 &&
    candidate.celebrationId < CELEBRATION_COUNT
      ? candidate.celebrationId
      : 0
  const base: PlayerSave = {
    version: SAVE_VERSION,
    playerName: name,
    clubId: candidate.clubId,
    nationalityId,
    shirtNumber: typeof candidate.shirtNumber === 'number' ? candidate.shirtNumber : DEFAULT_SHIRT_NUMBER,
    careerYear:
      typeof candidate.careerYear === 'number' && candidate.careerYear >= 1
        ? Math.floor(candidate.careerYear)
        : 1,
    tournamentPlayed: candidate.tournamentPlayed === true,
    tournament,
    season,
    history: normalizeHistory(candidate.history).slice(-HISTORY_LIMIT),
    attributes,
    trainingPoints,
    celebrationId,
    appearance: normalizeAppearance(candidate.appearance),
    customClubNames: normalizeClubNames(candidate.customClubNames),
    customClubCrests: normalizeCrests(candidate.customClubCrests),
    divisions,
    divisionMovement:
      candidate.divisionMovement === 'up' ||
      candidate.divisionMovement === 'down' ||
      candidate.divisionMovement === 'stay'
        ? candidate.divisionMovement
        : null,
    playerAge:
      typeof candidate.playerAge === 'number' &&
      Number.isInteger(candidate.playerAge) &&
      candidate.playerAge >= PLAYER_MIN_AGE &&
      candidate.playerAge <= PLAYER_MAX_AGE
        ? candidate.playerAge
        : DEFAULT_PLAYER_AGE,
    playerPosition: normalizePosition(candidate.playerPosition),
    account: normalizeAccount(candidate.account),
    formation: normalizeFormation(candidate.formation),
    lineup: normalizeLineup(candidate.lineup, normalizeFormation(candidate.formation), normalizePosition(candidate.playerPosition)),
    career: normalizeCareer(candidate.career, normalizeHistory(candidate.history)),
    customPlayerNames: normalizePlayerNames(candidate.customPlayerNames),
    customClubColors: normalizeClubColors(candidate.customClubColors),
    budget: normalizeBudget(candidate.budget, divisions, candidate.clubId),
    signings: normalizeSignings(candidate.signings),
    trophies: normalizeTrophies(candidate.trophies),
    perks: normalizePerks(candidate.perks),
    perkOffer: normalizePerkOffer(candidate.perkOffer, normalizePerks(candidate.perks)),
    claimedMilestones: normalizeMilestones(candidate.claimedMilestones),
    morale: normalizeMorale(candidate.morale),
    pendingEvent: normalizePendingEvent(candidate.pendingEvent),
    eventNote: typeof candidate.eventNote === 'string' && candidate.eventNote.length > 0
      ? candidate.eventNote
      : null,
    rival: normalizeRival(candidate.rival),
  }
  return setShirtNumber(base, base.shirtNumber)
}

export const parseSave = (raw: string | null): PlayerSave | null => {
  if (!raw) return null
  try {
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return null
    const candidate = data as Record<string, unknown>
    if (candidate.version === 1 || candidate.version === 2 || candidate.version === 3) return migrateLegacy(candidate)
    if (
      candidate.version === 4 ||
      candidate.version === 5 ||
      candidate.version === 6 ||
      candidate.version === 7 ||
      candidate.version === 8 ||
      candidate.version === 9 ||
      candidate.version === 10 ||
      candidate.version === 11 ||
      candidate.version === 12 ||
      candidate.version === 13 ||
      candidate.version === 14 ||
      candidate.version === 15 ||
      candidate.version === 16 ||
      candidate.version === 17 ||
      candidate.version === SAVE_VERSION
    ) {
      return parseCurrent(candidate)
    }
    return null
  } catch {
    return null
  }
}

export const loadSave = (storage: StorageLike): PlayerSave | null =>
  parseSave(storage.getItem(SAVE_KEY))

export const persistSave = (storage: StorageLike, save: PlayerSave): void => {
  storage.setItem(SAVE_KEY, JSON.stringify(save))
}
