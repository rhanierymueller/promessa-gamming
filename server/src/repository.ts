import { randomUUID } from 'node:crypto'

export interface Player {
  readonly id: string
  readonly name: string
  readonly clubId: string
  readonly createdAt: number
}

export interface MatchResult {
  readonly id: string
  readonly playerId: string
  readonly opponentId: string
  readonly teamGoals: number
  readonly opponentGoals: number
  readonly rating: number
  readonly playerGoals: number
  readonly playedAt: number
}

export interface LeaderboardEntry {
  readonly playerId: string
  readonly name: string
  readonly clubId: string
  readonly matches: number
  readonly avgRating: number
  readonly goals: number
}

export interface CreatePlayerInput {
  readonly name: string
  readonly clubId: string
}

export interface CreateMatchInput {
  readonly opponentId: string
  readonly teamGoals: number
  readonly opponentGoals: number
  readonly rating: number
  readonly playerGoals: number
}

/** Contrato de persistência — a implementação em memória é trocável por banco. */
export interface GameRepository {
  createPlayer(input: CreatePlayerInput): Promise<Player>
  findPlayerById(id: string): Promise<Player | null>
  createMatch(playerId: string, input: CreateMatchInput): Promise<MatchResult>
  findMatchesByPlayer(playerId: string): Promise<readonly MatchResult[]>
  leaderboard(limit: number): Promise<readonly LeaderboardEntry[]>
}

export const createInMemoryRepository = (): GameRepository => {
  const players = new Map<string, Player>()
  const matches = new Map<string, MatchResult[]>()

  return {
    async createPlayer(input) {
      const player: Player = { id: randomUUID(), createdAt: Date.now(), ...input }
      players.set(player.id, player)
      matches.set(player.id, [])
      return player
    },

    async findPlayerById(id) {
      return players.get(id) ?? null
    },

    async createMatch(playerId, input) {
      const result: MatchResult = { id: randomUUID(), playerId, playedAt: Date.now(), ...input }
      matches.set(playerId, [...(matches.get(playerId) ?? []), result])
      return result
    },

    async findMatchesByPlayer(playerId) {
      return matches.get(playerId) ?? []
    },

    async leaderboard(limit) {
      const entries: LeaderboardEntry[] = []
      for (const player of players.values()) {
        const played = matches.get(player.id) ?? []
        if (played.length === 0) continue
        entries.push({
          playerId: player.id,
          name: player.name,
          clubId: player.clubId,
          matches: played.length,
          avgRating: Math.round((played.reduce((sum, m) => sum + m.rating, 0) / played.length) * 10) / 10,
          goals: played.reduce((sum, m) => sum + m.playerGoals, 0),
        })
      }
      return entries.sort((a, b) => b.avgRating - a.avgRating).slice(0, limit)
    },
  }
}
