import { clubById } from '../data/clubs'
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
import { createSeason } from '../engine/season/season'
import type { TournamentState } from '../engine/tournament/tournament'
import { SEASON_TEAMS, type SeasonState } from '../engine/season/types'

/**
 * Save do jogador com versão de schema — v1/v2 migram automaticamente para v3
 * (nacionalidade padrão Brasil + temporada nova).
 */

export const SAVE_VERSION = 7
const SAVE_KEY = 'promessa.save'
export const MAX_PLAYER_NAME = 16
const DEFAULT_SHIRT_NUMBER = 10
const DEFAULT_NATIONALITY = 'brasil'
/** Comemorações desenhadas disponíveis (sprites celeb_0..3). */
export const CELEBRATION_COUNT = 4

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
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>
type RandomRoll = () => number

const seasonSeed = (roll: RandomRoll): number => Math.floor(roll() * 0xffffffff) >>> 0

export const sanitizePlayerName = (raw: string): string =>
  raw.trim().slice(0, MAX_PLAYER_NAME)

export const createSave = (
  playerName: string,
  clubId: string,
  nationalityId: string = DEFAULT_NATIONALITY,
  roll: RandomRoll = Math.random,
): PlayerSave | null => {
  const name = sanitizePlayerName(playerName)
  if (name.length === 0 || !clubById(clubId) || !nationById(nationalityId)) return null
  return {
    version: SAVE_VERSION,
    playerName: name,
    clubId,
    nationalityId,
    shirtNumber: DEFAULT_SHIRT_NUMBER,
    careerYear: 1,
    tournamentPlayed: false,
    tournament: null,
    season: createSeason(clubId, seasonSeed(roll)),
    history: [],
    attributes: DEFAULT_ATTRIBUTES,
    trainingPoints: 0,
    celebrationId: 0,
  }
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

export const recordMatch = (save: PlayerSave, record: MatchRecord): PlayerSave => ({
  ...save,
  history: [...save.history, record],
  trainingPoints: save.trainingPoints + trainingPointsForRating(record.rating),
})

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

export const startNewSeason = (save: PlayerSave, roll: RandomRoll = Math.random): PlayerSave => ({
  ...save,
  careerYear: save.careerYear + 1,
  tournamentPlayed: false,
  tournament: null,
  season: createSeason(save.clubId, seasonSeed(roll)),
})

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
  const base = createSave(candidate.playerName, candidate.clubId)
  if (!base) return null
  const withShirt =
    typeof candidate.shirtNumber === 'number' ? setShirtNumber(base, candidate.shirtNumber) : base
  return { ...withShirt, history: normalizeHistory(candidate.history) }
}

const parseCurrent = (candidate: Record<string, unknown>): PlayerSave | null => {
  if (typeof candidate.playerName !== 'string' || typeof candidate.clubId !== 'string') return null
  const name = sanitizePlayerName(candidate.playerName)
  if (name.length === 0 || !clubById(candidate.clubId)) return null
  const nationalityId =
    typeof candidate.nationalityId === 'string' && nationById(candidate.nationalityId)
      ? candidate.nationalityId
      : DEFAULT_NATIONALITY
  const season = isValidSeason(candidate.season, candidate.clubId)
    ? candidate.season
    : createSeason(candidate.clubId, seasonSeed(Math.random))
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
    history: normalizeHistory(candidate.history),
    attributes,
    trainingPoints,
    celebrationId,
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
