import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { advanceTournament, createTournament } from './tournament'
import { tournamentScorers } from './tournamentScorers'

/** Joga algumas rodadas para haver gols no torneio. */
const comGols = () => {
  let state = createTournament('copa-mundo', 'brasil', 7)
  let rng = createRng(3)
  for (let i = 0; i < 3; i++) {
    const step = advanceTournament(state, 3, 1, rng)
    state = step.value.state
    rng = step.next
  }
  return state
}

describe('artilharia do torneio', () => {
  const tournament = comGols()
  const base = { tournament, careerYear: 4, playerName: 'Mueller', userGoals: 5 }

  test('lista sai ordenada do maior para o menor', () => {
    const rows = tournamentScorers(base)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].goals).toBeGreaterThanOrEqual(rows[i].goals)
    }
  })

  test('os SEUS gols são fato, não sorteio', () => {
    const eu = tournamentScorers(base).find((row) => row.isUser)
    expect(eu?.goals).toBe(5)
    expect(eu?.name).toBe('Mueller')
  })

  test('ninguém aparece com zero gol', () => {
    for (const row of tournamentScorers(base)) expect(row.goals).toBeGreaterThan(0)
  })

  test('os gols repartidos não passam do que a seleção marcou', () => {
    const meus = tournamentScorers(base, 99).filter((r) => r.clubId === 'brasil')
    const total = tournament.results
      .filter((m) => m.homeId === 'brasil' || m.awayId === 'brasil')
      .reduce((sum, m) => sum + (m.homeId === 'brasil' ? m.homeGoals : m.awayGoals), 0)
    expect(meus.reduce((sum, r) => sum + r.goals, 0)).toBeLessThanOrEqual(total)
  })

  test('é determinístico: mesma competição, mesma artilharia', () => {
    expect(tournamentScorers(base)).toEqual(tournamentScorers(base))
  })

  test('torneio sem jogo ainda não tem artilheiro', () => {
    const novo = createTournament('copa-mundo', 'brasil', 7)
    expect(tournamentScorers({ ...base, tournament: novo, userGoals: 0 })).toEqual([])
  })
})
