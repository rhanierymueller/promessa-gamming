import { describe, expect, test } from 'vitest'
import { NATIONS } from '../../data/nations'
import { marketPoolFor } from '../market/market'
import { initialDivisions } from '../pyramid/pyramid'
import { SQUAD_SIZE } from './players'
import { nationalSquadFor } from './nationalSquad'

/**
 * A seleção não é um elenco gerado do nada: é a NATA do jogo. Quem está em
 * campo pela seleção precisa ser dos melhores overalls disponíveis — inclusive
 * jogadores que ainda estão à venda no mercado.
 */

const divisions = initialDivisions()
const market = marketPoolFor(4242, 1)

describe('convocação da seleção', () => {
  test('convoca um elenco completo', () => {
    expect(nationalSquadFor('brasil', divisions, 1, market)).toHaveLength(SQUAD_SIZE)
  })

  test('os titulares da seleção são MELHORES que os de qualquer clube', () => {
    // Arrange
    const selecao = nationalSquadFor('brasil', divisions, 1, market)
    const mediaSelecao =
      selecao.slice(0, 11).reduce((sum, p) => sum + p.overall, 0) / 11

    // Assert: acima do teto de um elenco de Série A
    expect(mediaSelecao).toBeGreaterThan(75)
  })

  test('tem goleiro, defesa, meio e ataque — não é só atacante', () => {
    // Arrange
    const posicoes = new Set(nationalSquadFor('brasil', divisions, 1, market).map((p) => p.position))

    // Assert
    expect(posicoes).toContain('GOL')
    expect(posicoes).toContain('ZAG')
    expect(posicoes).toContain('MEI')
    expect(posicoes).toContain('ATA')
  })

  test('ninguém é convocado duas vezes', () => {
    const selecao = nationalSquadFor('brasil', divisions, 1, market)
    expect(new Set(selecao.map((p) => p.id)).size).toBe(SQUAD_SIZE)
  })

  test('jogador do MERCADO pode ser convocado', () => {
    // Arrange: os melhores do mercado são craques 80+
    const selecao = nationalSquadFor('brasil', divisions, 1, market)

    // Assert: pelo menos um convocado veio do mercado (id começa com mkt-)
    expect(selecao.some((p) => p.id.startsWith('mkt-'))).toBe(true)
  })

  test('é determinístico: a mesma temporada convoca os mesmos', () => {
    expect(nationalSquadFor('brasil', divisions, 1, market)).toEqual(
      nationalSquadFor('brasil', divisions, 1, market),
    )
  })

  test('o goleiro titular é o melhor goleiro disponível', () => {
    // Arrange
    const selecao = nationalSquadFor('brasil', divisions, 1, market)
    const goleiros = selecao.filter((p) => p.position === 'GOL')

    // Assert: o do slot 0 é o melhor entre os convocados
    expect(selecao[0].position).toBe('GOL')
    expect(selecao[0].overall).toBe(Math.max(...goleiros.map((g) => g.overall)))
  })

  test('nação sem jogadores suficientes ainda monta elenco (sem quebrar)', () => {
    // Arrange: nação com pouquíssimos candidatos reais no mercado
    const outra = nationalSquadFor('belgica', divisions, 1, market)

    // Assert
    expect(outra).toHaveLength(SQUAD_SIZE)
    expect(outra.every((p) => p.overall > 0)).toBe(true)
  })
})

describe('equilíbrio entre seleções', () => {
  const starterAverage = (nationId: string): number => {
    const starters = nationalSquadFor(nationId, divisions, 1, market).slice(0, 11)
    return starters.reduce((sum, player) => sum + player.overall, 0) / starters.length
  }

  test('as potências estrangeiras têm titulares de nível internacional', () => {
    for (const nationId of ['argentina', 'espanha', 'franca', 'alemanha']) {
      const starters = nationalSquadFor(nationId, divisions, 1, market).slice(0, 11)
      expect(starterAverage(nationId)).toBeGreaterThan(80)
      expect(Math.min(...starters.map((player) => player.overall))).toBeGreaterThanOrEqual(75)
    }
  })

  test('a média das faixas respeita as estrelas da seleção', () => {
    const tierAverage = (strength: number): number => {
      const nations = NATIONS.filter((nation) => nation.strength === strength && nation.id !== 'brasil')
      return nations.reduce((sum, nation) => sum + starterAverage(nation.id), 0) / nations.length
    }

    expect(tierAverage(5)).toBeGreaterThan(tierAverage(4))
    expect(tierAverage(4)).toBeGreaterThan(tierAverage(3))
    expect(tierAverage(3)).toBeGreaterThan(tierAverage(2))
  })

  test('nenhum convocado fica abaixo do piso da sua faixa', () => {
    for (const nation of NATIONS) {
      const squad = nationalSquadFor(nation.id, divisions, 1, market)
      const floor = 60 + nation.strength * 3
      expect(Math.min(...squad.map((player) => player.overall))).toBeGreaterThanOrEqual(floor)
    }
  })
})

describe('o craque convocado', () => {
  const craque = {
    id: 'voce',
    name: 'Mueller',
    position: 'ATA' as const,
    altPositions: [],
    age: 21,
    potential: 'alto' as const,
    shirt: 10,
    peakAge: 27,
    attrs: { pac: 60, fin: 62, pas: 58, dri: 60, def: 40, fis: 55 },
    overall: 58,
  }

  test('entra na seleção mesmo com overall MUITO abaixo dos convocados', () => {
    // Arrange: 58 de overall num grupo que tem gente de 90+
    const selecao = nationalSquadFor('brasil', divisions, 1, market, craque)

    // Assert
    expect(selecao.some((p) => p.id === 'voce')).toBe(true)
  })

  test('joga na POSIÇÃO dele, entre os titulares', () => {
    // Act
    const selecao = nationalSquadFor('brasil', divisions, 1, market, craque)
    const index = selecao.findIndex((p) => p.id === 'voce')

    // Assert
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeLessThan(11)
    expect(selecao[index].position).toBe('ATA')
  })

  test('ele não ocupa duas vagas nem some com o elenco', () => {
    const selecao = nationalSquadFor('brasil', divisions, 1, market, craque)
    expect(selecao.filter((p) => p.id === 'voce')).toHaveLength(1)
    expect(selecao).toHaveLength(SQUAD_SIZE)
    expect(new Set(selecao.map((p) => p.id)).size).toBe(SQUAD_SIZE)
  })

  test('sem convocação, a seleção segue só com os melhores', () => {
    const selecao = nationalSquadFor('brasil', divisions, 1, market, null)
    expect(selecao.some((p) => p.id === 'voce')).toBe(false)
  })

  test('o resto da seleção continua sendo a nata', () => {
    // Arrange: só a vaga dele cai de nível, o resto não
    const selecao = nationalSquadFor('brasil', divisions, 1, market, craque)
    const outros = selecao.slice(0, 11).filter((p) => p.id !== 'voce')

    // Assert
    expect(Math.min(...outros.map((p) => p.overall))).toBeGreaterThan(75)
  })
})

describe('o overall do craque na seleção é o MESMO do clube', () => {
  test('vestir a camisa da seleção não infla o jogador', () => {
    // Arrange: o craque como ele é no clube dele
    const craqueNoClube = {
      id: 'voce',
      name: 'Mueller',
      position: 'ATA' as const,
      altPositions: [],
      age: 22,
      potential: 'alto' as const,
      peakAge: 27,
      shirt: 10,
      attrs: { pac: 35, fin: 60, pas: 60, dri: 35, def: 60, fis: 35 },
      overall: 48,
    }

    // Act
    const selecao = nationalSquadFor('brasil', divisions, 1, market, craqueNoClube)
    const eu = selecao.find((p) => p.id === 'voce')!

    // Assert: nada de herdar o físico do craque gerado da seleção
    expect(eu.overall).toBe(craqueNoClube.overall)
    expect(eu.attrs).toEqual(craqueNoClube.attrs)
  })
})
