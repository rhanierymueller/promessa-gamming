import { nationAsClub, nationById } from '../../data/nations'
import { distribute, clubSeed, type ScorerRow } from '../season/scorers'
import { squadPlayersFor } from '../squad/players'
import type { PlayerGender } from '../../state/save'
import type { TournamentState } from './tournament'

/**
 * Artilharia do torneio de seleções, na mesma ideia da artilharia das séries:
 * os gols de cada seleção já existem nos resultados, e são repartidos entre os
 * jogadores dela conforme a posição. Os SEUS gols são fato e entram inteiros.
 *
 * Sem isto a tela da Copa mostrava só a classificação — no meio de uma
 * competição em que a artilharia é metade da conversa.
 */

export interface TournamentScorersInput {
  readonly tournament: TournamentState
  readonly careerYear: number
  readonly playerName: string
  /** Gols que VOCÊ fez no torneio — são fato, não sorteio. */
  readonly userGoals: number
  readonly gender?: PlayerGender
}

/** Gols marcados por cada seleção, somando todos os jogos do torneio. */
const goalsByNation = (state: TournamentState): Map<string, number> => {
  const total = new Map<string, number>()
  const add = (id: string, goals: number): void => {
    total.set(id, (total.get(id) ?? 0) + goals)
  }
  for (const match of state.results) {
    add(match.homeId, match.homeGoals)
    add(match.awayId, match.awayGoals)
  }
  return total
}

export const tournamentScorers = (
  input: TournamentScorersInput,
  limit = 10,
): readonly ScorerRow[] => {
  const { tournament, careerYear, playerName, userGoals, gender = 'masculino' } = input
  const rows: ScorerRow[] = []

  for (const [nationId, goals] of goalsByNation(tournament)) {
    const nation = nationById(nationId)
    if (!nation || goals <= 0) continue
    const squad = squadPlayersFor(nationAsClub(nation), careerYear, gender)
    const seed = clubSeed(tournament.seed, nationId)

    if (nationId === tournament.playerNationId) {
      // os seus gols são fato; só o resto da seleção entra no sorteio
      const mine = Math.min(userGoals, goals)
      if (mine > 0) {
        rows.push({ playerId: 'voce', name: playerName, clubId: nationId, goals: mine, isUser: true })
      }
      for (const [playerId, marcados] of distribute(squad, goals - mine, seed)) {
        const player = squad.find((entry) => entry.id === playerId)!
        rows.push({ playerId, name: player.name, clubId: nationId, goals: marcados, isUser: false })
      }
      continue
    }

    for (const [playerId, marcados] of distribute(squad, goals, seed)) {
      const player = squad.find((entry) => entry.id === playerId)!
      rows.push({ playerId, name: player.name, clubId: nationId, goals: marcados, isUser: false })
    }
  }

  return rows
    .filter((row) => row.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
    .slice(0, limit)
}
