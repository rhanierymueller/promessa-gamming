import { describe, expect, test } from 'vitest'
import { clubById } from '../../data/clubs'
import { createSave, type PlayerSave } from '../../state/save'
import { myTeamPlayers, opponentTeamRating } from './myTeam'

/**
 * O elenco que você vê em campo tem de acompanhar a divisão que o clube
 * disputa AGORA — subir de série precisa aparecer no time, não só na tabela.
 */

const CLUB_ID = 'real-vila' // nasce na Série D
const CLUB = clubById(CLUB_ID)!

const saveNaDivisao = (division: number): PlayerSave => {
  const base = createSave({ playerName: 'Mueller', clubId: CLUB_ID })!
  const divisions = base.divisions.map((clubs) => clubs.filter((id) => id !== CLUB_ID))
  return {
    ...base,
    divisions: divisions.map((clubs, index) =>
      index === division ? [...clubs, CLUB_ID] : clubs,
    ) as PlayerSave['divisions'],
  }
}

const mediaDoElenco = (save: PlayerSave): number => {
  const squad = myTeamPlayers(save, CLUB)
  return squad.reduce((sum, player) => sum + player.overall, 0) / squad.length
}

describe('o elenco acompanha a divisão disputada', () => {
  test('subir da Série D para a A levanta o seu próprio elenco', () => {
    expect(mediaDoElenco(saveNaDivisao(0))).toBeGreaterThan(mediaDoElenco(saveNaDivisao(3)) + 8)
  })

  test('cada acesso vale um degrau no elenco', () => {
    const porDivisao = [0, 1, 2, 3].map((division) => mediaDoElenco(saveNaDivisao(division)))
    expect(porDivisao[0]).toBeGreaterThan(porDivisao[1])
    expect(porDivisao[1]).toBeGreaterThan(porDivisao[2])
    expect(porDivisao[2]).toBeGreaterThan(porDivisao[3])
  })

  test('o adversário promovido também chega mais forte', () => {
    expect(opponentTeamRating(CLUB, 1, 0)).toBeGreaterThan(opponentTeamRating(CLUB, 1, 3) + 8)
  })
})
