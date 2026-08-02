import { clubById } from '../../data/clubs'
import { distribute, clubSeed, type ScorerRow } from '../season/scorers'
import { squadPlayersFor } from '../squad/players'
import type { PlayerGender } from '../../state/save'
import type { LibertadosState } from './types'

/**
 * Artilharia da Copa Libertados, na mesma ideia da artilharia do torneio de
 * seleções: os gols de cada clube já existem nos resultados, e são repartidos
 * entre os jogadores dele conforme a posição. Os SEUS gols são fato e entram
 * inteiros.
 *
 * Diferença para a artilharia de seleções: aqui os "times" já são clubes de
 * verdade (`clubById`), então o elenco sai direto de `squadPlayersFor` — sem
 * o passo extra de transformar seleção em clube.
 */

export interface LibertadosScorersInput {
  readonly state: LibertadosState
  readonly careerYear: number
  readonly playerName: string
  /** Gols que VOCÊ fez na competição — são fato, não sorteio. */
  readonly userGoals: number
  readonly gender?: PlayerGender
}

/** Gols marcados por cada clube, somando todos os jogos da edição. */
const goalsByClub = (state: LibertadosState): Map<string, number> => {
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

export const libertadosScorers = (
  input: LibertadosScorersInput,
  limit = 10,
): readonly ScorerRow[] => {
  const { state, careerYear, playerName, userGoals, gender = 'masculino' } = input
  const rows: ScorerRow[] = []

  for (const [clubId, goals] of goalsByClub(state)) {
    const club = clubById(clubId)
    if (!club || goals <= 0) continue
    const squad = squadPlayersFor(club, careerYear, gender)
    const seed = clubSeed(state.seed, clubId)

    if (clubId === state.playerClubId) {
      // os seus gols são fato; só o resto do clube entra no sorteio
      const mine = Math.min(userGoals, goals)
      if (mine > 0) {
        rows.push({ playerId: 'voce', name: playerName, clubId, goals: mine, isUser: true })
      }
      for (const [playerId, marcados] of distribute(squad, goals - mine, seed)) {
        const player = squad.find((entry) => entry.id === playerId)!
        rows.push({ playerId, name: player.name, clubId, goals: marcados, isUser: false })
      }
      continue
    }

    for (const [playerId, marcados] of distribute(squad, goals, seed)) {
      const player = squad.find((entry) => entry.id === playerId)!
      rows.push({ playerId, name: player.name, clubId, goals: marcados, isUser: false })
    }
  }

  return rows
    .filter((row) => row.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
    .slice(0, limit)
}
