import { clubById, type Club } from '../data/clubs'
import {
  addDays,
  PRESEASON_DAYS,
  roundDate,
  type CalendarDate,
} from '../engine/career/calendar'
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
  isPerfectRating,
  isPerkId,
  perkOptionsFor,
  PERFECT_GAMES_FOR_PERK,
  perkTrainingBonus,
  type PerkId,
} from '../engine/career/perks'
import { playerAgeInSeason } from '../engine/squad/aging'
import { createRival, rivalRoundGoals, type RivalState } from '../engine/career/rival'
import {
  addAward,
  wonGoldenBoot,
  wonMvp,
  type Award,
} from '../engine/career/awards'
import { createCopaBrasil } from '../engine/copaBrasil/copaBrasil'
import type { CopaBrasilState } from '../engine/copaBrasil/types'
import {
  applyPromotionRelegation,
  divisionOf,
  initialDivisions,
  simulateDivisionOrder,
  type Divisions,
} from '../engine/pyramid/pyramid'
import type { LibertadosState } from '../engine/libertados/types'
import { createLibertados, simulateEdition } from '../engine/libertados/libertados'
import { FORMATION_IDS, FORMATIONS, userSlotIndex, type FormationId, type PlayerFieldPosition } from '../engine/squad/formation'
import {
  allowanceFor,
  saleValueFor,
  titlePrizeFor,
  type MarketPlayer,
  type PlayerSale,
  type Signing,
} from '../engine/market/market'
import { overallAt, SQUAD_SIZE, USER_PLAYER_ID, USER_SQUAD_INDEX, type SquadPlayer } from '../engine/squad/players'
import { computeTable, createSeason, isSeasonOver } from '../engine/season/season'
import { createRng } from '../engine/rng'
import type { TournamentKind, TournamentState } from '../engine/tournament/tournament'
import { SEASON_ROUNDS, SEASON_TEAMS, type SeasonState } from '../engine/season/types'
import { seasonScorers } from '../engine/season/scorers'
import type { CompetitionId } from '../engine/career/schedule'
import { parseConsent, type ConsentRecord } from './consent'
import { isOffensiveName } from './moderation'

/**
 * Save do jogador com versão de schema — v1/v2 migram automaticamente para v3
 * (nacionalidade padrão Brasil + temporada nova).
 */

export const SAVE_VERSION = 23
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
/** Cidade/região do clube: cabe num rodapé de card sem quebrar linha. */
export const MAX_CLUB_CITY = 22
/** A sigla do placar tem três casas — nem mais, nem menos. */
export const CLUB_ABBR_LENGTH = 3

/** Só as últimas partidas ficam gravadas — o resto vira total da carreira. */
export const HISTORY_LIMIT = 10

export interface CareerTotals {
  readonly games: number
  readonly wins: number
  readonly draws: number
  readonly losses: number
  readonly goals: number
  /** Gols que o SEU TIME sofreu — o outro lado da campanha. */
  readonly goalsAgainst: number
  readonly ratingSum: number
}

const EMPTY_CAREER: CareerTotals = { games: 0, wins: 0, draws: 0, losses: 0, goals: 0, goalsAgainst: 0, ratingSum: 0 }

const addToCareer = (career: CareerTotals, record: MatchRecord): CareerTotals => ({
  games: career.games + 1,
  wins: career.wins + (record.teamGoals > record.opponentGoals ? 1 : 0),
  draws: career.draws + (record.teamGoals === record.opponentGoals ? 1 : 0),
  losses: career.losses + (record.teamGoals < record.opponentGoals ? 1 : 0),
  goals: career.goals + record.playerGoals,
  goalsAgainst: career.goalsAgainst + record.opponentGoals,
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

export type Competition = 'liga' | 'amistoso' | 'selecao' | 'libertados' | 'copa-brasil'

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
  /** O dia em que a carreira está — o relógio que o botão de avançar move. */
  readonly currentDate: CalendarDate
  /** Já disputou o torneio de seleções desta temporada. */
  readonly tournamentPlayed: boolean
  readonly tournament: TournamentState | null
  /** Edição da Copa Libertados em andamento — null fora do torneio. */
  readonly libertados: LibertadosState | null
  /** Copa do Brasil da temporada — mata-mata com a pirâmide inteira. */
  readonly copaBrasil: CopaBrasilState | null
  /** Vaga conquistada na temporada passada: joga a Libertados deste ano. */
  readonly libertadosQualified: boolean
  /** Campeões continentais recentes, com ou sem você. */
  readonly continentalChampions: readonly ContinentalTitle[]
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
  /**
   * Escalação da SELEÇÃO, separada da do clube: são elencos diferentes e
   * mexer num não pode desarrumar o outro.
   */
  readonly nationalLineup: readonly number[]
  /** Esquema tático da seleção — você também é o técnico dela. */
  readonly nationalFormation: FormationId
  /** Totais da carreira — o histórico detalhado guarda só as últimas 10. */
  readonly career: CareerTotals
  /** Nomes LOCAIS dos SEUS jogadores (playerId → nome) — cada um editável UMA vez. */
  readonly customPlayerNames: Readonly<Record<string, string>>
  /** Cores LOCAIS dos clubes (clubId → {primary, secondary}). */
  readonly customClubColors: Readonly<Record<string, ClubColors>>
  /** Cidade/região rebatizada pelo jogador (clubId → nome). */
  readonly customClubCities: Readonly<Record<string, string>>
  /** Sigla de três letras escolhida pelo jogador (clubId → sigla). */
  readonly customClubAbbrs: Readonly<Record<string, string>>
  /** Verba de transferências da temporada (renova pela divisão). */
  readonly budget: number
  /** Reforços contratados no mercado. */
  readonly signings: readonly Signing[]
  /** Vendas concluídas; preservam o saldo e renovam a vaga do elenco. */
  readonly playerSales: readonly PlayerSale[]
  /** Sala de troféus: títulos conquistados com o ano. */
  readonly trophies: readonly Trophy[]
  /** Prêmios individuais: chuteira de artilheiro e melhor jogador. */
  readonly awards: readonly Award[]
  /** Habilidades de RPG adquiridas nos marcos da carreira. */
  readonly perks: readonly PerkId[]
  /** Escolha de perk pendente (1 de até 3) — null sem marco aberto. */
  readonly perkOffer: PerkOffer | null
  /** Atuações nota 10 desde a última habilidade escolhida. */
  readonly perfectGames: number
  /** Moral do craque (0-100) — entra em campo na nota inicial. */
  readonly morale: number
  /** Evento de vida aguardando decisão (null = semana tranquila). */
  readonly pendingEvent: PendingLifeEvent | null
  /** Resultado do último evento — banner na Home até dispensar. */
  /**
   * Desfecho da última entrevista. Guardado, mas já não vira aviso na Home —
   * o retorno agora acontece dentro da própria modal da zona mista.
   */
  readonly eventNote: string | null
  /** O nêmesis: atacante rival que disputa a artilharia com você. */
  readonly rival: RivalState | null
  /**
   * Quando este save foi gravado (epoch ms). É o critério de desempate da
   * sincronização entre aparelhos: vence o mais recente.
   */
  readonly savedAt: number
  /**
   * Aceite dos termos: qual versão e quando. É a prova de consentimento que a
   * LGPD exige — sem ela, não há como demonstrar que houve concordância.
   */
  readonly consent: ConsentRecord | null
}

export interface PerkOffer {
  readonly options: readonly PerkId[]
}

export type TrophyKind =
  | 'serie-a'
  | 'serie-b'
  | 'serie-c'
  | 'serie-d'
  | TournamentKind
  | 'libertados'
  | 'copa-brasil'

export interface Trophy {
  readonly kind: TrophyKind
  readonly year: number
}

export interface ContinentalTitle {
  readonly year: number
  readonly clubId: string
}

/**
 * Prêmio do título continental — acima do da Série A, como o peso da taça.
 * Dinheiro pesado o bastante para mudar o mercado: veja `continentalTitleYears`
 * e o reforço de campeão em `engine/market/aiTransfers.ts`.
 */
export const LIBERTADOS_PRIZE = 50_000_000

/**
 * Prêmio da Copa do Brasil. Abaixo do continental, acima do título de Série A:
 * é a taça que um clube pequeno pode levantar, e o dinheiro dela muda o ano
 * seguinte de quem está embaixo.
 */
export const COPA_BRASIL_PRIZE = 30_000_000
/** Quantos clubes da Série A vão à Libertados. */
export const LIBERTADOS_SPOTS = 4
/** Quantos campeões continentais o save guarda. */
const CONTINENTAL_HISTORY_LIMIT = 10

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
  /**
   * Gênero da atleta ou do atleta. Escolhido UMA vez, na criação: ele decide
   * a arte, os nomes gerados no mundo inteiro e a concordância dos textos —
   * trocar no meio da carreira reescreveria tudo isso.
   */
  readonly gender?: PlayerGender
  /** Aceite dos termos registrado no cadastro. */
  readonly consent?: ConsentRecord | null
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
    // a pré-temporada dá alguns dias de calendário antes do primeiro jogo
    currentDate: addDays(roundDate(1, 0), -PRESEASON_DAYS),
    tournamentPlayed: false,
    tournament: null,
    libertados: null,
    libertadosQualified: false,
    // a Copa do Brasil abre já no ano 1: o clube do jogador está sempre nela
    copaBrasil: createCopaBrasil(seasonSeed(roll), 1, clubId, divisions),
    continentalChampions: [],
    savedAt: 0,
    consent: input.consent ?? null,
    season: createSeason(clubId, seasonSeed(roll), divisions[divisionOf(divisions, clubId)]),
    history: [],
    attributes,
    trainingPoints: 0,
    celebrationId: 0,
    appearance: { ...DEFAULT_APPEARANCE, gender: input.gender ?? DEFAULT_APPEARANCE.gender },
    customClubNames,
    customClubCrests: {},
    divisions,
    divisionMovement: null,
    playerAge: age,
    playerPosition: position,
    account,
    formation: DEFAULT_FORMATION,
    lineup: defaultLineup(DEFAULT_FORMATION, position),
    nationalLineup: Array.from({ length: 11 }, (_, index) => index),
    nationalFormation: DEFAULT_FORMATION,
    career: EMPTY_CAREER,
    customPlayerNames: {},
    customClubColors: {},
    customClubCities: {},
    customClubAbbrs: {},
    budget: allowanceFor(divisionOf(divisions, clubId)),
    signings: [],
    playerSales: [],
    trophies: [],
    awards: [],
    perks: [],
    perkOffer: null,
    perfectGames: 0,
    morale: DEFAULT_MORALE,
    pendingEvent: null,
    eventNote: null,
    rival: null,
  }
}

/** Checa marcos da carreira: dispara UMA oferta de perk por vez. */
/**
 * Conta a atuação e abre a escolha de habilidade na quinta nota 10.
 * A contagem só zera quando o jogador ESCOLHE (ver choosePerk).
 */
const withPerkCheck = (save: PlayerSave, lastRating: number): PlayerSave => {
  if (!isPerfectRating(lastRating)) return save
  const perfectGames = save.perfectGames + 1
  if (save.perkOffer || perfectGames < PERFECT_GAMES_FOR_PERK) return { ...save, perfectGames }
  const options = perkOptionsFor(save.perks)
  // catálogo esgotado: segue contando, mas não há o que oferecer
  if (options.length === 0) return { ...save, perfectGames }
  return { ...save, perfectGames, perkOffer: { options } }
}

/** Escolhe um perk da oferta pendente — no-op se a opção não estiver nela. */
export const choosePerk = (save: PlayerSave, perkId: PerkId): PlayerSave => {
  if (!save.perkOffer || !save.perkOffer.options.includes(perkId)) return save
  if (save.perks.includes(perkId)) return { ...save, perkOffer: null }
  // ciclo reiniciado: a próxima habilidade custa outras cinco notas 10
  return { ...save, perks: [...save.perks, perkId], perkOffer: null, perfectGames: 0 }
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
 *
 * O craque troca de posição à vontade com quem já está em campo — o que ele
 * não pode é SAIR do time: nenhum reserva toma a vaga dele.
 */
export const swapLineup = (save: PlayerSave, slotIndex: number, squadIndex: number): PlayerSave => {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= save.lineup.length) return save
  if (!Number.isInteger(squadIndex) || squadIndex < 0 || squadIndex > 17) return save
  const lineup = [...save.lineup]
  const alreadyAt = lineup.indexOf(squadIndex)
  if (alreadyAt === slotIndex) return save
  // a vaga do craque só troca com quem já é titular
  if (lineup[slotIndex] === USER_SQUAD_INDEX && alreadyAt < 0) return save
  if (alreadyAt >= 0) {
    lineup[alreadyAt] = lineup[slotIndex]
  }
  lineup[slotIndex] = squadIndex
  return { ...save, lineup }
}

/**
 * Troca na seleção — mesma regra do clube: o seu craque não sai de campo e
 * quem já era titular apenas muda de vaga.
 */
export const swapNationalLineup = (
  save: PlayerSave,
  slotIndex: number,
  squadIndex: number,
): PlayerSave => {
  const lineup = [...save.nationalLineup]
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= lineup.length) return save
  if (!Number.isInteger(squadIndex) || squadIndex < 0 || squadIndex > 17) return save
  const alreadyAt = lineup.indexOf(squadIndex)
  if (alreadyAt === slotIndex) return save
  if (alreadyAt >= 0) lineup[alreadyAt] = lineup[slotIndex]
  lineup[slotIndex] = squadIndex
  return { ...save, nationalLineup: lineup }
}

/**
 * Troca o esquema da seleção. A escalação volta ao padrão porque os slots
 * mudam de posição entre formações — manter os índices deixaria zagueiro na
 * ponta sem o jogador ter pedido.
 */
export const setNationalFormation = (save: PlayerSave, formation: FormationId): PlayerSave => ({
  ...save,
  nationalFormation: formation,
  nationalLineup: Array.from({ length: 11 }, (_, index) => index),
})

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
/**
 * Ajusta a aparência. O GÊNERO é preservado de propósito: ele se escolhe UMA
 * vez, no cadastro, porque define a arte, os nomes de todo o mundo do jogo e a
 * concordância dos textos — trocar no meio da carreira reescreveria tudo isso.
 */
export const setAppearance = (save: PlayerSave, appearance: PlayerAppearance): PlayerSave => {
  if (
    !isValidIndex(appearance.skin, SKIN_TONE_COUNT) ||
    !isValidIndex(appearance.hair, HAIR_COLOR_COUNT) ||
    !isValidIndex(appearance.kit, KIT_COLOR_COUNT) ||
    (appearance.gender !== 'masculino' && appearance.gender !== 'feminino')
  ) {
    return save
  }
  return { ...save, appearance: { ...appearance, gender: save.appearance.gender } }
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
  return updated
}

/** O clube está na Libertados nesta temporada? Decide o ritmo do calendário. */
export const isInLibertados = (save: PlayerSave): boolean => save.libertados !== null

/**
 * Anos em que este clube foi campeão continental. Alimenta o reforço de
 * pós-título do mercado da IA (`engine/market/aiTransfers.ts`): o cofre de
 * `LIBERTADOS_PRIZE` compra um craque na janela seguinte ao título — por
 * baixo dos panos, sem tela dedicada.
 */
export const continentalTitleYears = (save: PlayerSave, clubId: string): readonly number[] =>
  save.continentalChampions.filter((title) => title.clubId === clubId).map((title) => title.year)

/**
 * Aplica o estado da Libertados. Título dá TAÇA e prêmio em dinheiro; o campeão
 * da edição — seja quem for — entra no histórico continental. Os dois só
 * acontecem uma vez, para reaplicar o mesmo estado não pagar de novo.
 */
export const withLibertadosState = (save: PlayerSave, state: LibertadosState): PlayerSave => {
  const becameChampion = state.stage === 'champion' && save.libertados?.stage !== 'champion'
  const alreadyLogged = save.continentalChampions.some((title) => title.year === state.year)
  const logChampion = state.championId !== null && !alreadyLogged

  return {
    ...save,
    libertados: state,
    trophies: becameChampion
      ? [...save.trophies, { kind: 'libertados', year: save.careerYear }]
      : save.trophies,
    budget: becameChampion ? save.budget + LIBERTADOS_PRIZE : save.budget,
    continentalChampions: logChampion
      ? [...save.continentalChampions, { year: state.year, clubId: state.championId! }].slice(
          -CONTINENTAL_HISTORY_LIMIT,
        )
      : save.continentalChampions,
  }
}

/**
 * Aplica o estado da Copa do Brasil. O título entra na estante uma vez só —
 * reaplicar o mesmo estado não pode render uma segunda taça.
 */
export const withCopaBrasilState = (save: PlayerSave, state: CopaBrasilState): PlayerSave => {
  const becameChampion =
    state.stage === 'champion' &&
    state.championId === save.clubId &&
    save.copaBrasil?.stage !== 'champion'
  return {
    ...save,
    copaBrasil: state,
    trophies: becameChampion
      ? [...save.trophies, { kind: 'copa-brasil', year: save.careerYear }]
      : save.trophies,
    budget: becameChampion ? save.budget + COPA_BRASIL_PRIZE : save.budget,
  }
}

/** Fecha o card de fim da Copa do Brasil; a taça já entrou na estante. */
export const dismissCopaBrasil = (save: PlayerSave): PlayerSave =>
  save.copaBrasil ? { ...save, copaBrasil: null } : save

/** Guarda ou dispensa a edição sem mexer no histórico já registrado. */
export const applyLibertados = (
  save: PlayerSave,
  state: LibertadosState | null,
): PlayerSave => (state === null ? { ...save, libertados: null } : withLibertadosState(save, state))

/** Contrata um jogador do mercado: desconta a verba e grava o reforço. */
export const signPlayer = (save: PlayerSave, player: MarketPlayer): PlayerSave => {
  if (player.price > save.budget) return save
  if (save.signings.some((signing) => signing.id === player.id)) return save
  const openSale =
    save.playerSales.find(
      (sale) => sale.filledByPlayerId === undefined && sale.position === player.position,
    ) ?? save.playerSales.find((sale) => sale.filledByPlayerId === undefined)
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
    ...(openSale ? { slotIndex: openSale.slotIndex } : {}),
  }
  return {
    ...save,
    budget: save.budget - player.price,
    signings: [...save.signings, signing],
    playerSales: openSale
      ? save.playerSales.map((sale) =>
          sale === openSale ? { ...sale, filledByPlayerId: player.id } : sale,
        )
      : save.playerSales,
  }
}

/** Valor líquido exibido e creditado — uma única fonte para UI e save. */
export const playerSaleValue = (save: PlayerSave, player: SquadPlayer): number => {
  const signing = save.signings.find((entry) => entry.id === player.id)
  const sameSeasonMaximum = signing?.boughtYear === save.careerYear
    ? signing.price * 0.75
    : Number.POSITIVE_INFINITY
  return saleValueFor(player, sameSeasonMaximum)
}

/**
 * Vende um jogador do clube e credita a oferta na verba. O protagonista não
 * pode ser vendido e cada slot faz no máximo uma negociação por temporada,
 * fechando o atalho de vender infinitas promoções da base no mesmo ano.
 */
export const sellPlayer = (
  save: PlayerSave,
  player: SquadPlayer,
  slotIndex: number,
  squad: readonly SquadPlayer[],
): PlayerSave => {
  if (player.id === USER_PLAYER_ID) return save
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= SQUAD_SIZE) return save
  if (squad[slotIndex]?.id !== player.id) return save
  if (save.playerSales.some((sale) => sale.playerId === player.id)) return save
  const openSlots = new Set(
    save.playerSales
      .filter((sale) => sale.filledByPlayerId === undefined)
      .map((sale) => sale.slotIndex),
  )
  // Com 11 atletas disponíveis não há como disputar a próxima partida.
  if (SQUAD_SIZE - openSlots.size <= 11) return save

  const lineup = [...save.lineup]
  const starterSlot = lineup.indexOf(slotIndex)
  if (starterSlot >= 0) {
    const used = new Set(lineup)
    const position = FORMATIONS[save.formation].slots[starterSlot]
    const replacement = squad
      .map((candidate, index) => ({ candidate, index }))
      .filter(({ index }) => !used.has(index) && !openSlots.has(index) && index !== slotIndex)
      .sort(
        (a, b) =>
          overallAt(b.candidate, position) - overallAt(a.candidate, position) ||
          a.index - b.index,
      )[0]
    if (!replacement) return save
    lineup[starterSlot] = replacement.index
  }

  const price = playerSaleValue(save, player)
  const customPlayerNames = { ...save.customPlayerNames }
  delete customPlayerNames[player.id]
  const sale: PlayerSale = {
    playerId: player.id,
    soldYear: save.careerYear,
    price,
    slotIndex,
    position: player.position,
  }
  return {
    ...save,
    budget: save.budget + price,
    playerSales: [...save.playerSales, sale],
    customPlayerNames,
    lineup,
  }
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
/**
 * Idade ATUAL do craque: a da criação mais uma por temporada. É a única
 * fonte da idade — Perfil e elenco leem daqui.
 */
export const currentPlayerAge = (save: PlayerSave): number =>
  playerAgeInSeason(save.playerAge, save.careerYear)

export const clubDisplayName = (save: PlayerSave, clubId: string): string =>
  save.customClubNames[clubId] ?? clubById(clubId)?.name ?? '???'

/**
 * Renomeia a cidade/região do clube. Vazio ou igual ao original apaga o
 * apelido — mesma regra do nome, para o campo em branco sempre significar
 * "volte ao de fábrica".
 */
export const setClubCity = (save: PlayerSave, clubId: string, rawCity: string): PlayerSave => {
  const club = clubById(clubId)
  if (!club) return save
  const city = rawCity.trim().slice(0, MAX_CLUB_CITY)
  if (city.length > 0 && isOffensiveName(city)) return save
  const next: Record<string, string> = { ...save.customClubCities }
  if (city.length === 0 || city === club.city) delete next[clubId]
  else next[clubId] = city
  return { ...save, customClubCities: next }
}

/**
 * Troca a sigla de três letras — a que aparece no placar e na tabela.
 *
 * Só entra com as três casas cheias: sigla pela metade quebraria o alinhamento
 * do placar, e aceitar uma ou duas letras deixaria o jogador achando que
 * salvou algo que o jogo ignora.
 */
export const setClubAbbr = (save: PlayerSave, clubId: string, rawAbbr: string): PlayerSave => {
  const club = clubById(clubId)
  if (!club) return save
  const abbr = rawAbbr
    .normalize('NFD')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, CLUB_ABBR_LENGTH)
  const next: Record<string, string> = { ...save.customClubAbbrs }
  if (abbr.length < CLUB_ABBR_LENGTH || abbr === club.abbr) delete next[clubId]
  else next[clubId] = abbr
  return { ...save, customClubAbbrs: next }
}

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

const normalizePlayerSale = (value: unknown): PlayerSale | null => {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.playerId !== 'string' ||
    typeof candidate.soldYear !== 'number' ||
    !Number.isInteger(candidate.soldYear) ||
    candidate.soldYear < 1 ||
    typeof candidate.price !== 'number' ||
    !Number.isFinite(candidate.price) ||
    candidate.price < 0 ||
    typeof candidate.slotIndex !== 'number' ||
    !Number.isInteger(candidate.slotIndex) ||
    candidate.slotIndex < 0 ||
    candidate.slotIndex >= SQUAD_SIZE
  ) return null
  return {
    playerId: candidate.playerId,
    soldYear: candidate.soldYear,
    price: candidate.price,
    slotIndex: candidate.slotIndex,
    position: VALID_POSITIONS.includes(candidate.position as string)
      ? candidate.position as PlayerSale['position']
      : 'ATA',
    ...(typeof candidate.filledByPlayerId === 'string'
      ? { filledByPlayerId: candidate.filledByPlayerId }
      : {}),
  }
}

const normalizePlayerSales = (value: unknown): readonly PlayerSale[] => {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.map(normalizePlayerSale).filter((sale): sale is PlayerSale => sale !== null).filter((sale) => {
    if (seen.has(sale.playerId)) return false
    seen.add(sale.playerId)
    return true
  })
}

/*
 * Precisa listar TODO `TrophyKind`. Uma taça fora daqui é silenciosamente
 * descartada ao carregar o save: a Copa do Brasil ficou de fora quando a
 * competição entrou, e o título sumia da estante no primeiro recarregamento —
 * sem erro, sem aviso.
 */
const VALID_TROPHIES: readonly TrophyKind[] = [
  'serie-a',
  'serie-b',
  'serie-c',
  'serie-d',
  'copa-america',
  'liga-nacoes',
  'copa-mundo',
  'libertados',
  'copa-brasil',
]

const normalizePerks = (value: unknown): readonly PerkId[] =>
  Array.isArray(value) ? [...new Set(value.filter(isPerkId))] : []

const normalizePerkOffer = (value: unknown, owned: readonly PerkId[]): PerkOffer | null => {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (!Array.isArray(candidate.options)) return null
  const options = candidate.options.filter(isPerkId).filter((id) => !owned.includes(id))
  return options.length > 0 ? { options } : null
}

const normalizePerfectGames = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? Math.min(value, PERFECT_GAMES_FOR_PERK)
    : 0

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
  const customCity = save.customClubCities[club.id]
  const customAbbr = save.customClubAbbrs[club.id]
  if (!customName && !customColors && !customCity && !customAbbr) return club
  return {
    ...club,
    // o apelido é do clube ORIGINAL: rebatizado, ele não vale mais e o nome
    // novo assume (senão a saudação segue chamando o time pelo nome antigo)
    ...(customName ? { name: customName, abbr: abbrFor(customName), nickname: customName } : {}),
    // a sigla escolhida à mão vem DEPOIS do nome: quem digitou as três letras
    // quer aquelas três, não as que o nome novo geraria sozinho
    ...(customAbbr ? { abbr: customAbbr } : {}),
    ...(customCity ? { city: customCity } : {}),
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

/** Escalação da seleção: 11 índices distintos de 0 a 17, senão volta ao padrão. */
const normalizeNationalLineup = (value: unknown): readonly number[] => {
  const fallback = Array.from({ length: 11 }, (_, index) => index)
  if (!Array.isArray(value) || value.length !== 11) return fallback
  const valid = value.every(
    (item) => Number.isInteger(item) && (item as number) >= 0 && (item as number) <= 17,
  )
  if (!valid || new Set(value).size !== 11) return fallback
  return value as number[]
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
  return ['games', 'wins', 'draws', 'losses', 'goals', 'goalsAgainst', 'ratingSum'].every(
    (key) => typeof candidate[key] === 'number' && Number.isFinite(candidate[key]),
  )
}

/**
 * Sem totais salvos — ou salvos antes de existir "gols sofridos" — reconstrói
 * a carreira do histórico. O que estiver fora das últimas 10 partidas não volta,
 * mas o número passa a crescer certo daqui em diante.
 */
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

const normalizeClubCities = (value: unknown): Readonly<Record<string, string>> => {
  if (typeof value !== 'object' || value === null) return {}
  const result: Record<string, string> = {}
  for (const [clubId, city] of Object.entries(value as Record<string, unknown>)) {
    if (typeof city === 'string' && city.trim().length > 0 && clubById(clubId)) {
      result[clubId] = city.trim().slice(0, MAX_CLUB_CITY)
    }
  }
  return result
}

/** Sigla só entra com as três letras: nada de meia sigla vinda de save torto. */
const normalizeClubAbbrs = (value: unknown): Readonly<Record<string, string>> => {
  if (typeof value !== 'object' || value === null) return {}
  const result: Record<string, string> = {}
  for (const [clubId, abbr] of Object.entries(value as Record<string, unknown>)) {
    if (typeof abbr !== 'string' || !clubById(clubId)) continue
    const clean = abbr.replace(/[^a-zA-Z]/g, '').toUpperCase()
    if (clean.length === CLUB_ABBR_LENGTH) result[clubId] = clean
  }
  return result
}

/** Prêmios individuais de save antigo: entram vazios em vez de quebrar. */
const normalizeAwards = (value: unknown): readonly Award[] => {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is Award =>
      typeof entry === 'object' &&
      entry !== null &&
      (entry as Award).kind !== undefined &&
      typeof (entry as Award).competition === 'string' &&
      typeof (entry as Award).year === 'number',
  )
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

/**
 * O dia da carreira num save antigo: sem relógio gravado, o jogador entra no
 * dia da rodada que ele tem para jogar. Assim quem estava no meio da temporada
 * não cai numa data qualquer nem precisa avançar semanas para voltar ao jogo.
 */
const normalizeCurrentDate = (
  value: unknown,
  careerYear: number,
  season: SeasonState,
  inLibertados: boolean,
): CalendarDate => {
  const raw = value as Partial<CalendarDate> | undefined
  if (
    raw &&
    typeof raw.year === 'number' &&
    typeof raw.month === 'number' &&
    typeof raw.day === 'number' &&
    raw.month >= 0 &&
    raw.month <= 11 &&
    raw.day >= 1 &&
    raw.day <= 31
  ) {
    return { year: raw.year, month: raw.month, day: raw.day }
  }
  const round = Math.min(season.currentRound, SEASON_ROUNDS - 1)
  return roundDate(careerYear, round, inLibertados)
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
  return withPerkCheck(updated, record.rating)
}

/** Decide o evento de vida pendente: moral (e às vezes treino) reagem. */
export const resolvePendingEvent = (save: PlayerSave, optionIndex: number): PlayerSave => {
  if (!save.pendingEvent) return save
  const result = resolveLifeEvent(save.pendingEvent.templateId, optionIndex, save.pendingEvent.seed, save.appearance.gender)
  return {
    ...save,
    morale: clampMorale(save.morale + result.moraleDelta),
    trainingPoints: save.trainingPoints + result.trainingPoints,
    pendingEvent: null,
    eventNote: result.note,
  }
}

/**
 * Sai da zona mista sem falar. Não é uma quarta opção disfarçada: não move
 * moral, não rende treino e não gera manchete — o silêncio custa nada e não
 * ganha nada, e é isso que faz dele uma saída honesta em vez de a escolha
 * ótima de quem não quer arriscar.
 */
export const declinePendingEvent = (save: PlayerSave): PlayerSave =>
  save.pendingEvent ? { ...save, pendingEvent: null, eventNote: null } : save

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

/** Como o craque foi numa competição, pelo histórico da temporada. */
interface SeasonRun {
  readonly games: number
  readonly goals: number
  readonly averageRating: number
}

const runOf = (save: PlayerSave, competition: Competition): SeasonRun => {
  const played = save.history.filter((record) => record.competition === competition)
  if (played.length === 0) return { games: 0, goals: 0, averageRating: 0 }
  return {
    games: played.length,
    goals: played.reduce((sum, record) => sum + record.playerGoals, 0),
    averageRating: played.reduce((sum, record) => sum + record.rating, 0) / played.length,
  }
}

/** Da competição do histórico para a do calendário. */
const awardCompetitionFor = (competition: Competition): CompetitionId | null => {
  if (competition === 'liga') return 'liga'
  if (competition === 'libertados') return 'libertados'
  if (competition === 'copa-brasil') return 'copa-brasil'
  return null
}

/**
 * Apura os prêmios INDIVIDUAIS da temporada que termina.
 *
 * Roda na virada do ano de propósito: é o único momento em que todas as
 * competições já acabaram e o histórico está completo. Apurar a cada apito
 * exigiria saber, em cada partida, se aquela era a última da competição.
 *
 * O artilheiro sai do sorteio de gols que já alimenta a artilharia da tela;
 * o melhor jogador, da sua nota média na competição.
 */
const withSeasonAwards = (save: PlayerSave): PlayerSave => {
  let awards = save.awards

  for (const competition of ['liga', 'libertados', 'copa-brasil'] as const) {
    const id = awardCompetitionFor(competition)
    if (!id) continue
    const run = runOf(save, competition)
    if (run.games === 0) continue

    // artilharia: o melhor rival da competição sai da mesma fonte da tela
    const rivals = seasonScorers(
      {
        season: save.season,
        careerYear: save.careerYear,
        userClubId: save.clubId,
        userName: save.playerName,
        userGoals: run.goals,
        customNames: save.customPlayerNames,
        gender: save.appearance.gender,
      },
      20,
    ).filter((row) => !row.isUser)
    const bestRival = rivals.length > 0 ? Math.max(...rivals.map((row) => row.goals)) : 0

    if (competition === 'liga' && wonGoldenBoot(run.goals, bestRival)) {
      awards = addAward(awards, {
        kind: 'chuteira',
        competition: id,
        year: save.careerYear,
        value: run.goals,
      })
    }
    if (wonMvp(run.games, run.averageRating)) {
      awards = addAward(awards, {
        kind: 'melhor-jogador',
        competition: id,
        year: save.careerYear,
        value: Math.round(run.averageRating * 10) / 10,
      })
    }
  }

  return awards === save.awards ? save : { ...save, awards }
}

/**
 * Vira o ano: aplica ACESSO/QUEDA na pirâmide (tabela real da sua divisão,
 * demais simuladas) e monta a temporada da nova divisão do clube.
 */
export const startNewSeason = (base: PlayerSave, roll: RandomRoll = Math.random): PlayerSave => {
  // os prêmios são apurados ANTES de qualquer coisa: a partir daqui o
  // histórico começa a ser o do ano novo
  const save = withSeasonAwards(base)
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

  /*
   * Libertados do ano que vem: os 4 primeiros da Série A. A tabela da SUA
   * divisão é real; se você não está na Série A, a ordem dela é simulada.
   */
  const serieAOrder =
    playerDivision === 0
      ? finalOrder
      : simulateDivisionOrder(save.divisions[0], createRng(shiftSeed ^ 0x2c1b3a5f)).value
  const qualifiers = serieAOrder.slice(0, LIBERTADOS_SPOTS)
  const nextQualified = qualifiers.includes(save.clubId)
  const nextYear = save.careerYear + 1
  const editionSeed = seasonSeed(roll)
  const nextLibertados = nextQualified
    ? createLibertados(editionSeed, nextYear, save.clubId, qualifiers)
    : null

  /*
   * Ano sem você: a edição que se encerra agora roda simulada, para o
   * continente ter campeão de qualquer jeito. Com você, o campeão já foi
   * registrado quando o torneio terminou.
   *
   * Quem disputou essa edição saiu da Série A do ano PASSADO, e aquela tabela
   * não fica guardada — então ela é reconstruída pela seed do próprio ano.
   * Reaproveitar os classificados recém-apurados colocaria na edição que
   * acabou justamente os clubes que só entram na próxima.
   *
   * A guarda por ano é o que impede um segundo campeão para a mesma
   * temporada: dispensar o card de fim de torneio zera `save.libertados`, e
   * sem ela a virada do ano trataria uma edição já disputada como ano sem
   * jogador, simulando uma segunda por cima.
   */
  const alreadyLogged = save.continentalChampions.some(
    (title) => title.year === save.careerYear,
  )
  const pastQualifiers = simulateDivisionOrder(
    save.divisions[0],
    createRng((editionSeed ^ 0x7f4a7c15) >>> 0),
  ).value.slice(0, LIBERTADOS_SPOTS)
  const finishedEdition =
    save.libertados || alreadyLogged
      ? null
      : simulateEdition(
          createLibertados(editionSeed ^ 0x2545f491, save.careerYear, null, pastQualifiers),
          createRng(editionSeed ^ 0x1b873593),
        ).value
  const continentalChampions =
    finishedEdition?.championId
      ? [
          ...save.continentalChampions,
          { year: save.careerYear, clubId: finishedEdition.championId },
        ].slice(-CONTINENTAL_HISTORY_LIMIT)
      : save.continentalChampions

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
    // o relógio volta para a pré-temporada do ano novo. Sem isto a carreira
    // continuaria no dezembro que acabou de passar, com todos os jogos do ano
    // seguinte na traseira do calendário e o avanço de dias sem destino.
    currentDate: addDays(roundDate(nextYear, 0, nextQualified), -PRESEASON_DAYS),
    // playerAge é a idade de CRIAÇÃO e não muda: currentPlayerAge já soma as
    // temporadas por cima dela. Somar aqui também envelhecia dois anos por ano.
    tournamentPlayed: false,
    tournament: null,
    libertados: nextLibertados,
    libertadosQualified: nextQualified,
    // toda temporada tem a sua Copa do Brasil, com sorteio novo
    copaBrasil: createCopaBrasil(editionSeed ^ 0x5bf03635, nextYear, save.clubId, shift.value.divisions),
    continentalChampions,
    divisions: shift.value.divisions,
    divisionMovement: shift.value.movement,
    season: nextSeason,
    budget: save.budget + allowanceFor(nextDivision) + (isChampion ? titlePrizeFor(playerDivision) : 0),
    trophies: isChampion
      ? [...save.trophies, { kind: DIVISION_TROPHIES[playerDivision], year: save.careerYear }]
      : save.trophies,
    rival,
  }
  return updated
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
      record.competition === 'amistoso' ||
      record.competition === 'selecao' ||
      record.competition === 'libertados'
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

/**
 * Até a v18 a virada de temporada somava um ano em playerAge, que já era
 * somado de novo por currentPlayerAge — o craque envelhecia dois anos por
 * temporada. Devolve a idade de criação para quem carrega um save antigo.
 */
const fixInflatedAge = (candidate: Record<string, unknown>): Record<string, unknown> => {
  const version = candidate.version
  if (typeof version !== 'number' || version >= 19) return candidate
  const age = candidate.playerAge
  const year = candidate.careerYear
  if (typeof age !== 'number' || typeof year !== 'number') return candidate
  const seasons = Math.max(0, year - 1)
  return { ...candidate, playerAge: Math.max(PLAYER_MIN_AGE, age - seasons) }
}

const isValidTournament = (value: unknown): value is TournamentState => {
  if (typeof value !== 'object' || value === null) return false
  const t = value as Record<string, unknown>
  return (
    typeof t.kind === 'string' &&
    typeof t.playerNationId === 'string' &&
    // formato de grupos em lista: save antigo (groupA/groupB) é descartado
    // em vez de quebrar a tela do torneio no meio da carreira
    Array.isArray(t.groups) &&
    t.groups.length > 0 &&
    t.groups.every((group) => Array.isArray(group)) &&
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

const isValidLibertados = (value: unknown): value is LibertadosState => {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return (
    typeof state.seed === 'number' &&
    typeof state.year === 'number' &&
    Array.isArray(state.groups) &&
    state.groups.length > 0 &&
    state.groups.every((group) => Array.isArray(group)) &&
    typeof state.stage === 'string' &&
    Array.isArray(state.results)
  )
}

const isValidCopaBrasil = (value: unknown): value is CopaBrasilState => {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return (
    typeof state.seed === 'number' &&
    typeof state.year === 'number' &&
    Array.isArray(state.bracket) &&
    state.bracket.length > 0 &&
    typeof state.stage === 'string' &&
    Array.isArray(state.results)
  )
}

const normalizeContinentalChampions = (value: unknown): readonly ContinentalTitle[] => {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (entry): entry is ContinentalTitle =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as ContinentalTitle).year === 'number' &&
        typeof (entry as ContinentalTitle).clubId === 'string',
    )
    .slice(-CONTINENTAL_HISTORY_LIMIT)
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
  const parsedFormation = normalizeFormation(candidate.formation)
  const parsedPosition = normalizePosition(candidate.playerPosition)
  const playerSales = normalizePlayerSales(candidate.playerSales)
  const parsedLineup = [...normalizeLineup(candidate.lineup, parsedFormation, parsedPosition)]
  const openSaleSlots = new Set(
    playerSales
      .filter((sale) => sale.filledByPlayerId === undefined)
      .map((sale) => sale.slotIndex),
  )
  const usedLineupIndices = new Set(parsedLineup)
  parsedLineup.forEach((squadIndex, lineupSlot) => {
    if (!openSaleSlots.has(squadIndex)) return
    const replacement = Array.from({ length: SQUAD_SIZE }, (_, index) => index)
      .find((index) => !usedLineupIndices.has(index) && !openSaleSlots.has(index))
    if (replacement === undefined) return
    usedLineupIndices.delete(squadIndex)
    usedLineupIndices.add(replacement)
    parsedLineup[lineupSlot] = replacement
  })
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
    currentDate: normalizeCurrentDate(
      candidate.currentDate,
      typeof candidate.careerYear === 'number' ? candidate.careerYear : 1,
      season,
      isValidLibertados(candidate.libertados),
    ),
    savedAt: typeof candidate.savedAt === 'number' ? candidate.savedAt : 0,
    consent: parseConsent(candidate.consent),
    tournament,
    libertados: isValidLibertados(candidate.libertados) ? candidate.libertados : null,
    /* save antigo não tem Copa do Brasil: a edição do ano é criada na hora,
       para quem já estava jogando entrar na competição sem virar o ano */
    copaBrasil: isValidCopaBrasil(candidate.copaBrasil)
      ? candidate.copaBrasil
      : createCopaBrasil(
          season.seed ^ 0x5bf03635,
          typeof candidate.careerYear === 'number' ? candidate.careerYear : 1,
          candidate.clubId as string,
          divisions,
        ),
    libertadosQualified: candidate.libertadosQualified === true,
    continentalChampions: normalizeContinentalChampions(candidate.continentalChampions),
    season,
    history: normalizeHistory(candidate.history).slice(-HISTORY_LIMIT),
    attributes,
    trainingPoints,
    celebrationId,
    appearance: normalizeAppearance(candidate.appearance),
    customClubNames: normalizeClubNames(candidate.customClubNames),
    customClubCities: normalizeClubCities(candidate.customClubCities),
    customClubAbbrs: normalizeClubAbbrs(candidate.customClubAbbrs),
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
    playerPosition: parsedPosition,
    account: normalizeAccount(candidate.account),
    formation: parsedFormation,
    lineup: parsedLineup,
    nationalLineup: normalizeNationalLineup(candidate.nationalLineup),
    nationalFormation: normalizeFormation(candidate.nationalFormation),
    career: normalizeCareer(candidate.career, normalizeHistory(candidate.history)),
    customPlayerNames: normalizePlayerNames(candidate.customPlayerNames),
    customClubColors: normalizeClubColors(candidate.customClubColors),
    budget: normalizeBudget(candidate.budget, divisions, candidate.clubId),
    signings: normalizeSignings(candidate.signings),
    playerSales,
    trophies: normalizeTrophies(candidate.trophies),
    awards: normalizeAwards(candidate.awards),
    perks: normalizePerks(candidate.perks),
    perkOffer: normalizePerkOffer(candidate.perkOffer, normalizePerks(candidate.perks)),
    perfectGames: normalizePerfectGames(candidate.perfectGames),
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
      candidate.version === 18 ||
      candidate.version === 19 ||
      candidate.version === 20 ||
      candidate.version === 21 ||
      candidate.version === 22 ||
      candidate.version === SAVE_VERSION
    ) {
      return parseCurrent(fixInflatedAge(candidate))
    }
    return null
  } catch {
    return null
  }
}

export const loadSave = (storage: StorageLike): PlayerSave | null =>
  parseSave(storage.getItem(SAVE_KEY))

export const persistSave = (
  storage: StorageLike,
  save: PlayerSave,
  now: number = Date.now(),
): PlayerSave => {
  // carimba na gravação: é assim que a sincronização sabe qual aparelho jogou
  // por último, sem depender do relógio do servidor
  const stamped: PlayerSave = { ...save, savedAt: now }
  storage.setItem(SAVE_KEY, JSON.stringify(stamped))
  return stamped
}
