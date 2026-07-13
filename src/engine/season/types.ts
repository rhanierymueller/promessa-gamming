export const SEASON_TEAMS = 10
export const SEASON_ROUNDS = SEASON_TEAMS - 1 // um jogo contra cada adversário

export interface SeasonFixture {
  readonly homeId: string
  readonly awayId: string
}

export interface SeasonMatchResult {
  readonly round: number
  readonly homeId: string
  readonly awayId: string
  readonly homeGoals: number
  readonly awayGoals: number
}

export interface SeasonState {
  readonly seed: number
  /** 10 clubes: o do jogador + 9 sorteados. */
  readonly participants: readonly string[]
  readonly playerClubId: string
  /** Próxima rodada a ser jogada (0-based); >= SEASON_ROUNDS = temporada encerrada. */
  readonly currentRound: number
  readonly results: readonly SeasonMatchResult[]
}

export interface TableRow {
  readonly clubId: string
  readonly points: number
  readonly played: number
  readonly wins: number
  readonly draws: number
  readonly losses: number
  readonly goalsFor: number
  readonly goalsAgainst: number
}
