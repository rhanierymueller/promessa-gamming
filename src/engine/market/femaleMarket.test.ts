import { describe, expect, test } from 'vitest'
import { NATIONAL_NAMES } from '../../data/nationalNames'
import { FIRST_NAMES_F } from '../../data/squadNames'
import { marketPoolFor } from './market'

const firstNameOf = (nome: string): string => nome.split(' ')[0]

describe('mercado da carreira feminina', () => {
  const masculino = marketPoolFor(777, 2, 'masculino')
  const feminino = marketPoolFor(777, 2, 'feminino')

  test('tem a MESMA quantidade de jogadoras que de jogadores', () => {
    expect(feminino.length).toBe(masculino.length)
  })

  test('as regras de qualidade não mudam: mesmas posições, idades e overalls', () => {
    // só o nome muda — potencial, evolução e preço seguem a mesma tabela
    expect(feminino.map((p) => p.position)).toEqual(masculino.map((p) => p.position))
    expect(feminino.map((p) => p.age)).toEqual(masculino.map((p) => p.age))
    expect(feminino.map((p) => p.overall)).toEqual(masculino.map((p) => p.overall))
    expect(feminino.map((p) => p.potential)).toEqual(masculino.map((p) => p.potential))
    expect(feminino.map((p) => p.price)).toEqual(masculino.map((p) => p.price))
  })

  test('nome de jogadora, e da nacionalidade certa', () => {
    const forasteiras: string[] = []
    for (const player of feminino) {
      if (player.id.startsWith('mkt-lenda')) continue
      const esperados =
        player.nationality === 'brasil'
          ? [...FIRST_NAMES_F, ...NATIONAL_NAMES.brasil.firstsF]
          : NATIONAL_NAMES[player.nationality].firstsF
      if (!esperados.includes(firstNameOf(player.name))) {
        forasteiras.push(`${player.nationality}: ${player.name}`)
      }
    }
    expect(forasteiras).toEqual([])
  })

  test('as estrelas do mercado também são jogadoras, com os mesmos tetos', () => {
    const lendasM = masculino.filter((p) => p.id.startsWith('mkt-lenda'))
    const lendasF = feminino.filter((p) => p.id.startsWith('mkt-lenda'))
    expect(lendasF.length).toBe(lendasM.length)
    expect(lendasF.map((p) => p.overall)).toEqual(lendasM.map((p) => p.overall))
    expect(lendasF.map((p) => p.name)).not.toEqual(lendasM.map((p) => p.name))
  })

  test('sem nomes repetidos no leque', () => {
    expect(new Set(feminino.map((p) => p.name)).size).toBe(feminino.length)
  })

  test('o padrão continua masculino — carreiras existentes não mudam', () => {
    expect(marketPoolFor(777, 2)).toEqual(masculino)
  })
})
