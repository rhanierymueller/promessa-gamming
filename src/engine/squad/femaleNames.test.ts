import { describe, expect, test } from 'vitest'
import { NATIONAL_NAMES } from '../../data/nationalNames'
import { FIRST_NAMES, FIRST_NAMES_F } from '../../data/squadNames'
import { CLUBS } from '../../data/clubs'
import { NATIONS, nationAsClub } from '../../data/nations'
import { squadPlayersFor } from './players'

const firstNameOf = (fullName: string): string => fullName.split(' ')[0]

describe('mundo feminino', () => {
  test('há tantos nomes femininos quanto masculinos', () => {
    expect(FIRST_NAMES_F.length).toBe(FIRST_NAMES.length)
    for (const nation of NATIONS) {
      const pool = NATIONAL_NAMES[nation.id]
      expect(pool.firstsF.length, `faltam nomes femininos para ${nation.name}`).toBe(
        pool.firsts.length,
      )
    }
  })

  test('carreira feminina gera elencos de jogadoras em todo clube', () => {
    for (const club of CLUBS.slice(0, 8)) {
      const elenco = squadPlayersFor(club, 3, 'feminino')
      const masculino = squadPlayersFor(club, 3, 'masculino')
      expect(elenco.map((p) => p.name)).not.toEqual(masculino.map((p) => p.name))
      expect(new Set(elenco.map((p) => p.name)).size).toBe(elenco.length)
    }
  })

  test('as seleções também: nome feminino E da nacionalidade certa', () => {
    const forasteiras: string[] = []
    for (const nation of NATIONS) {
      if (nation.id === 'brasil') continue
      const pool = NATIONAL_NAMES[nation.id].firstsF
      for (const player of squadPlayersFor(nationAsClub(nation), 1, 'feminino')) {
        if (!pool.includes(firstNameOf(player.name))) {
          forasteiras.push(`${nation.name}: ${player.name}`)
        }
      }
    }
    expect(forasteiras).toEqual([])
  })

  test('o padrão segue masculino — carreiras existentes não mudam', () => {
    expect(squadPlayersFor(CLUBS[0], 3)).toEqual(squadPlayersFor(CLUBS[0], 3, 'masculino'))
  })
})
