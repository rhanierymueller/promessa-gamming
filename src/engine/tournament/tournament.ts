import { NATIONS, nationById, type Confederation } from '../../data/nations'
import { createRng, nextFloat, type RngResult, type RngState } from '../rng'
import { roundRobinFixtures } from '../season/roundrobin'
import { computeStandings, type ScoredMatch } from '../season/season'

/**
 * Torneios de seleção: fase de grupos (todos contra todos) e mata-mata com os
 * dois primeiros de cada grupo. Empate no mata-mata vai aos pênaltis. O
 * jogador disputa TODOS os jogos da sua seleção; o resto é simulado.
 *
 * O tamanho da chave sai do número de grupos: a Copa do Mundo tem OITO grupos
 * (32 seleções) e vai das oitavas à final; os torneios continentais têm dois
 * grupos e começam direto na semifinal.
 */
export type TournamentKind = 'copa-america' | 'liga-nacoes' | 'copa-mundo'
export type TournamentStage =
  | 'groups'
  | 'r16'
  | 'quarter'
  | 'semi'
  | 'final'
  | 'champion'
  | 'eliminated'

export type KnockoutStage = Extract<TournamentStage, 'r16' | 'quarter' | 'semi' | 'final'>

/** Da chave mais larga para a final — a ordem em que o mata-mata acontece. */
export const KNOCKOUT_ORDER: readonly KnockoutStage[] = ['r16', 'quarter', 'semi', 'final']

export const STAGE_NAMES: Record<TournamentStage, string> = {
  groups: 'Fase de grupos',
  r16: 'Oitavas de final',
  quarter: 'Quartas de final',
  semi: 'Semifinal',
  final: 'Final',
  champion: 'Campeão',
  eliminated: 'Eliminado',
}

/** Quantos grupos cada competição tem. */
export const GROUP_COUNT: Record<TournamentKind, number> = {
  'copa-mundo': 8,
  'copa-america': 2,
  'liga-nacoes': 2,
}

/** Letra do grupo na tabela: 0 → A, 1 → B… */
export const groupLetter = (index: number): string => String.fromCharCode(65 + index)

export const TOURNAMENT_NAMES: Record<TournamentKind, string> = {
  'copa-america': 'Copa América',
  'liga-nacoes': 'Liga das Nações',
  'copa-mundo': 'Copa do Mundo',
}

export const GROUP_SIZE = 4
export const GROUP_ROUNDS = GROUP_SIZE - 1

export interface TournamentMatch extends ScoredMatch {
  readonly stage: 'groups' | KnockoutStage
  readonly round: number
  /** Vencedor nos pênaltis quando o placar terminou empatado no mata-mata. */
  readonly penaltyWinnerId?: string
}

export interface TournamentState {
  readonly kind: TournamentKind
  readonly seed: number
  readonly playerNationId: string
  /** Grupos na ordem A, B, C… O jogador está sempre no primeiro. */
  readonly groups: readonly (readonly string[])[]
  readonly stage: TournamentStage
  readonly round: number
  readonly results: readonly TournamentMatch[]
  readonly championId: string | null
}

export const continentalKindFor = (confederation: Confederation): TournamentKind =>
  confederation === 'europa' ? 'liga-nacoes' : 'copa-america'

/** De quantos em quantos anos vem cada competição. */
const WORLD_CUP_CYCLE = 4
const CONTINENTAL_CYCLE = 2

/**
 * Calendário das seleções, em dezembro: Copa do Mundo de quatro em quatro
 * anos e o torneio continental de dois em dois. Ano que não cai em nenhum
 * ciclo é temporada só de clube — devolve null.
 */
export const tournamentKindForYear = (
  careerYear: number,
  confederation: Confederation,
): TournamentKind | null => {
  if (careerYear % WORLD_CUP_CYCLE === 0) return 'copa-mundo'
  if (careerYear % CONTINENTAL_CYCLE === 0) return continentalKindFor(confederation)
  return null
}

const drawFrom = (pool: string[], count: number, rng: RngState): RngResult<string[]> => {
  const drawn: string[] = []
  let current = rng
  const rest = [...pool]
  while (drawn.length < count && rest.length > 0) {
    const roll = nextFloat(current)
    current = roll.next
    drawn.push(rest.splice(Math.floor(roll.value * rest.length) % rest.length, 1)[0])
  }
  return { value: drawn, next: current }
}

export const createTournament = (
  kind: TournamentKind,
  playerNationId: string,
  seed: number,
): TournamentState => {
  const player = nationById(playerNationId)
  if (!player) throw new Error(`seleção desconhecida: ${playerNationId}`)
  const pool =
    kind === 'copa-mundo'
      ? NATIONS.filter((n) => n.id !== playerNationId).map((n) => n.id)
      : NATIONS.filter((n) => n.id !== playerNationId && n.confederation === player.confederation).map((n) => n.id)

  const count = GROUP_COUNT[kind]
  const rng = createRng(seed)
  const drawn = drawFrom(pool, GROUP_SIZE * count - 1, rng)
  if (drawn.value.length < GROUP_SIZE * count - 1) {
    throw new Error(`seleções insuficientes para ${TOURNAMENT_NAMES[kind]}`)
  }

  // o jogador abre o grupo A; o resto do sorteio preenche na ordem
  const groups: string[][] = [[playerNationId]]
  for (const id of drawn.value) {
    if (groups[groups.length - 1].length === GROUP_SIZE) groups.push([])
    groups[groups.length - 1].push(id)
  }

  return {
    kind,
    seed,
    playerNationId,
    groups,
    stage: 'groups',
    round: 0,
    results: [],
    championId: null,
  }
}

/** Onde o mata-mata começa: 16 classificados → oitavas; 4 → semifinal. */
export const firstKnockoutStage = (state: TournamentState): KnockoutStage => {
  const qualifiers = state.groups.length * 2
  if (qualifiers >= 16) return 'r16'
  if (qualifiers >= 8) return 'quarter'
  if (qualifiers >= 4) return 'semi'
  return 'final'
}

const stageAfter = (stage: KnockoutStage): KnockoutStage | 'champion' => {
  const index = KNOCKOUT_ORDER.indexOf(stage)
  return index === KNOCKOUT_ORDER.length - 1 ? 'champion' : KNOCKOUT_ORDER[index + 1]
}

const stageBefore = (stage: KnockoutStage): KnockoutStage | null => {
  const index = KNOCKOUT_ORDER.indexOf(stage)
  return index <= 0 ? null : KNOCKOUT_ORDER[index - 1]
}

const groupResults = (state: TournamentState, group: readonly string[]): readonly TournamentMatch[] =>
  state.results.filter((r) => r.stage === 'groups' && group.includes(r.homeId))

const groupQualifiers = (state: TournamentState, group: readonly string[]): readonly string[] =>
  computeStandings(group, groupResults(state, group))
    .slice(0, 2)
    .map((row) => row.clubId)

export const groupStandings = (state: TournamentState, group: readonly string[]) =>
  computeStandings(group, groupResults(state, group))

const matchWinner = (match: TournamentMatch): string => {
  if (match.penaltyWinnerId) return match.penaltyWinnerId
  return match.homeGoals > match.awayGoals ? match.homeId : match.awayId
}

/**
 * Cruzamento clássico: o 1º de um grupo pega o 2º do grupo vizinho. Os
 * confrontos "de cima" (A1×B2, C1×D2…) vêm primeiro e os "de baixo"
 * (B1×A2, D1×C2…) depois, para os dois primeiros de um mesmo grupo só se
 * reencontrarem na final.
 */
const seededQualifiers = (state: TournamentState): readonly string[] => {
  const byGroup = state.groups.map((group) => groupQualifiers(state, group))
  const upper: string[] = []
  const lower: string[] = []
  for (let i = 0; i + 1 < byGroup.length; i += 2) {
    const [first1, second1] = byGroup[i]
    const [first2, second2] = byGroup[i + 1]
    upper.push(first1, second2)
    lower.push(first2, second1)
  }
  return [...upper, ...lower]
}

/** Os confrontos de um estágio do mata-mata, na ordem da chave. */
export const knockoutPairs = (
  state: TournamentState,
  stage: KnockoutStage,
): readonly [string, string][] => {
  const previous = stageBefore(stage)
  const teams =
    stage === firstKnockoutStage(state) || previous === null
      ? seededQualifiers(state)
      : state.results.filter((r) => r.stage === previous).map(matchWinner)
  const pairs: [string, string][] = []
  for (let i = 0; i + 1 < teams.length; i += 2) pairs.push([teams[i], teams[i + 1]])
  return pairs
}

const isKnockout = (stage: TournamentStage): stage is KnockoutStage =>
  KNOCKOUT_ORDER.includes(stage as KnockoutStage)

/** O confronto atual do jogador, ou null se o torneio terminou para ele. */
export const playerTournamentFixture = (state: TournamentState): { homeId: string; awayId: string } | null => {
  if (state.stage === 'groups') {
    const fixture = roundRobinFixtures(state.groups[0], state.round).find(
      (f) => f.homeId === state.playerNationId || f.awayId === state.playerNationId,
    )
    return fixture ?? null
  }
  if (!isKnockout(state.stage)) return null
  const pair = knockoutPairs(state, state.stage).find((p) => p.includes(state.playerNationId))
  return pair ? { homeId: pair[0], awayId: pair[1] } : null
}

export const playerTournamentOpponentId = (state: TournamentState): string | null => {
  const fixture = playerTournamentFixture(state)
  if (!fixture) return null
  return fixture.homeId === state.playerNationId ? fixture.awayId : fixture.homeId
}

const simulateNationGoals = (nationId: string, rng: RngState): RngResult<number> => {
  const strength = nationById(nationId)?.strength ?? 4
  const spread = nextFloat(rng)
  const luck = nextFloat(spread.next)
  const expected = 0.5 + strength * 0.28 + (spread.value * 2 - 1) * 1.2 + (luck.value - 0.5)
  return { value: Math.max(0, Math.min(5, Math.round(expected))), next: luck.next }
}

const simulateMatch = (
  stage: 'groups' | KnockoutStage,
  round: number,
  homeId: string,
  awayId: string,
  /** Jogo que precisa sair com vencedor: mata-mata ou torneio sem empate. */
  decisive: boolean,
  rng: RngState,
): RngResult<TournamentMatch> => {
  const home = simulateNationGoals(homeId, rng)
  const away = simulateNationGoals(awayId, home.next)
  let current = away.next
  let penaltyWinnerId: string | undefined
  if (decisive && home.value === away.value) {
    const coin = nextFloat(current)
    current = coin.next
    penaltyWinnerId = coin.value < 0.5 ? homeId : awayId
  }
  return {
    value: { stage, round, homeId, awayId, homeGoals: home.value, awayGoals: away.value, penaltyWinnerId },
    next: current,
  }
}

export interface TournamentAdvance {
  readonly state: TournamentState
  /** Empate do jogador no mata-mata: quem levou nos pênaltis. */
  readonly playerPenaltyWon: boolean | null
}

/**
 * Fecha o jogo atual do jogador (placar real) e simula o resto da etapa.
 * Empate do jogador no mata-mata é decidido nos pênaltis via RNG.
 */
export const advanceTournament = (
  state: TournamentState,
  playerGoalsFor: number,
  playerGoalsAgainst: number,
  rng: RngState,
  /**
   * Rede de segurança para um mata-mata que chegue aqui ainda empatado. Na
   * prática o desempate acontece DENTRO da partida, no lance dos dados, e o
   * placar já vem decidido — mas o torneio não pode depender disso para
   * fechar a chave.
   */
  playerShootoutWon?: boolean,
): RngResult<TournamentAdvance> => {
  const fixture = playerTournamentFixture(state)
  if (!fixture || state.stage === 'champion' || state.stage === 'eliminated') {
    return { value: { state, playerPenaltyWon: null }, next: rng }
  }
  const playerIsHome = fixture.homeId === state.playerNationId
  // fase de grupos aceita empate normalmente; mata-mata precisa de vencedor
  const decisive = state.stage !== 'groups'
  let current = rng
  let playerPenaltyWon: boolean | null = null
  let penaltyWinnerId: string | undefined

  if (decisive && playerGoalsFor === playerGoalsAgainst) {
    const coin = nextFloat(current)
    current = coin.next
    playerPenaltyWon = playerShootoutWon ?? coin.value < 0.5
    penaltyWinnerId = playerPenaltyWon
      ? state.playerNationId
      : fixture.homeId === state.playerNationId ? fixture.awayId : fixture.homeId
  }

  const playerMatch: TournamentMatch = {
    stage: state.stage as 'groups' | KnockoutStage,
    round: state.round,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    homeGoals: playerIsHome ? playerGoalsFor : playerGoalsAgainst,
    awayGoals: playerIsHome ? playerGoalsAgainst : playerGoalsFor,
    penaltyWinnerId,
  }
  const results: TournamentMatch[] = [playerMatch]

  if (state.stage === 'groups') {
    // todos os outros jogos da rodada, no seu grupo e em todos os demais
    for (const group of state.groups) {
      for (const other of roundRobinFixtures(group, state.round)) {
        if (other.homeId === state.playerNationId || other.awayId === state.playerNationId) continue
        const sim = simulateMatch('groups', state.round, other.homeId, other.awayId, decisive, current)
        current = sim.next
        results.push(sim.value)
      }
    }
  } else if (isKnockout(state.stage)) {
    // os outros confrontos da mesma chave: alguém precisa esperar o jogador
    for (const [homeId, awayId] of knockoutPairs(state, state.stage)) {
      if (homeId === state.playerNationId || awayId === state.playerNationId) continue
      const sim = simulateMatch(state.stage, 0, homeId, awayId, true, current)
      current = sim.next
      results.push(sim.value)
    }
  }

  const withResults: TournamentState = { ...state, results: [...state.results, ...results] }
  const playerWon =
    playerGoalsFor > playerGoalsAgainst || playerPenaltyWon === true

  const opponentId =
    fixture.homeId === state.playerNationId ? fixture.awayId : fixture.homeId

  let nextState: TournamentState
  if (state.stage === 'groups') {
    const nextRound = state.round + 1
    if (nextRound < GROUP_ROUNDS) {
      nextState = { ...withResults, round: nextRound }
    } else {
      const qualified = groupQualifiers(withResults, state.groups[0]).includes(state.playerNationId)
      nextState = {
        ...withResults,
        round: 0,
        stage: qualified ? firstKnockoutStage(withResults) : 'eliminated',
      }
    }
  } else if (isKnockout(state.stage)) {
    if (!playerWon) {
      nextState = { ...withResults, stage: 'eliminated' }
    } else {
      const next = stageAfter(state.stage)
      nextState =
        next === 'champion'
          ? { ...withResults, stage: 'champion', championId: state.playerNationId }
          : { ...withResults, stage: next }
    }
    // perder a final dá o título ao adversário; nas outras fases o campeão
    // ainda será decidido pelos jogos simulados
    if (state.stage === 'final' && !playerWon) {
      nextState = { ...nextState, championId: opponentId }
    }
  } else {
    nextState = withResults
  }

  return { value: { state: nextState, playerPenaltyWon }, next: current }
}
