import { describe, expect, test } from 'vitest'
import { NATIONAL_NAMES } from '../../data/nationalNames'
import { NATIONS, nationAsClub, nationById } from '../../data/nations'
import { squadPlayersFor } from './players'

/*
 * A seleção da Austrália não pode escalar Zeca, Serrote e Café. O elenco das
 * seleções vinha do gerador genérico — que é brasileiro de propósito, para os
 * clubes da liga — em vez das listas por nacionalidade.
 */

const firstNameOf = (fullName: string): string => fullName.split(' ')[0]

describe('elenco das seleções tem nomes da terra', () => {
  test('todo estrangeiro sai da lista da própria nacionalidade', () => {
    const forasteiros: string[] = []

    for (const nation of NATIONS) {
      if (nation.id === 'brasil') continue
      const pool = NATIONAL_NAMES[nation.id]
      for (const player of squadPlayersFor(nationAsClub(nation), 1)) {
        if (!pool.firsts.includes(firstNameOf(player.name))) {
          forasteiros.push(`${nation.name}: ${player.name}`)
        }
      }
    }

    expect(forasteiros).toEqual([])
  })

  test('o Brasil mantém os apelidos de várzea', () => {
    // o gerador genérico é brasileiro e dá o tempero do jogo — só ele fica
    const brasil = squadPlayersFor(nationAsClub(nationById('brasil')!), 1)
    expect(brasil).toHaveLength(18)
    expect(new Set(brasil.map((p) => p.name)).size).toBe(brasil.length)
  })

  test('nomes não se repetem dentro da seleção', () => {
    for (const nation of NATIONS) {
      const nomes = squadPlayersFor(nationAsClub(nation), 1).map((p) => p.name)
      expect(new Set(nomes).size, `repetido em ${nation.name}`).toBe(nomes.length)
    }
  })

  test('a regeneração de elenco também respeita a nacionalidade', () => {
    // temporada distante: os veteranos se aposentaram e vieram os garotos
    const noruega = nationById('noruega')!
    const pool = NATIONAL_NAMES.noruega
    for (const player of squadPlayersFor(nationAsClub(noruega), 25)) {
      expect(pool.firsts).toContain(firstNameOf(player.name))
    }
  })

  test('clube da liga continua com nome brasileiro', () => {
    const nomes = squadPlayersFor(
      { id: 'real-vila', name: 'Real da Vila', abbr: 'RVL', city: 'SP', nickname: '', colors: { primary: '#000', secondary: '#fff' }, strength: 2, division: 3 },
      1,
    )
    expect(nomes).toHaveLength(18)
  })
})
