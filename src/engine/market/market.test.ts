import { describe, expect, test } from 'vitest'
import {
  allowanceFor,
  formatMoney,
  marketPoolFor,
  priceRangeFor,
  squadWithSignings,
  starsFor,
  type Signing,
} from './market'
import { ageValueMultiplier } from './valuation'
import { CLUBS } from '../../data/clubs'
import { NATIONAL_NAMES } from '../../data/nationalNames'
import { squadPlayersFor } from '../squad/players'

describe('allowanceFor — verba por divisão', () => {
  test('Série D 500 mil, C 800 mil, B 12 mi, A 20 mi', () => {
    expect(allowanceFor(3)).toBe(500_000)
    expect(allowanceFor(2)).toBe(800_000)
    expect(allowanceFor(1)).toBe(12_000_000)
    expect(allowanceFor(0)).toBe(20_000_000)
    expect(allowanceFor(9)).toBe(500_000)
  })
})

describe('priceRangeFor — preço segue o overall', () => {
  test('cada faixa de qualidade tem o seu preço', () => {
    expect(priceRangeFor(48)).toEqual({ min: 200_000, max: 390_000 })
    expect(priceRangeFor(58)).toEqual({ min: 200_000, max: 390_000 })
    expect(priceRangeFor(60)).toEqual({ min: 400_000, max: 800_000 })
    expect(priceRangeFor(65)).toEqual({ min: 1_500_000, max: 8_000_000 })
    expect(priceRangeFor(72)).toEqual({ min: 8_000_000, max: 15_000_000 })
    expect(priceRangeFor(78)).toEqual({ min: 15_000_000, max: 25_000_000 })
    expect(priceRangeFor(85)).toEqual({ min: 30_000_000, max: 150_000_000 })
  })
})

describe('starsFor — estrelas do overall (0.5 a 5)', () => {
  test('mapa crescente com meias estrelas', () => {
    expect(starsFor(45)).toBe(1)
    expect(starsFor(58)).toBe(2)
    expect(starsFor(67)).toBe(3)
    expect(starsFor(77)).toBe(4)
    expect(starsFor(88)).toBe(5)
    expect(starsFor(72)).toBeGreaterThan(starsFor(60))
  })
})

describe('formatMoney', () => {
  test('mil e milhões em pt-BR', () => {
    expect(formatMoney(500_000)).toBe('R$ 500 mil')
    expect(formatMoney(1_500_000)).toBe('R$ 1,5 mi')
    expect(formatMoney(12_000_000)).toBe('R$ 12 mi')
    expect(formatMoney(150_000_000)).toBe('R$ 150 mi')
  })
})

describe('marketPoolFor — o leque de jogadores', () => {
  const pool = marketPoolFor(1234, 1)

  test('é determinístico e tem variedade de posições e nacionalidades', () => {
    expect(marketPoolFor(1234, 1)).toEqual(pool)
    expect(pool.length).toBeGreaterThanOrEqual(40)
    expect(new Set(pool.map((p) => p.position)).size).toBeGreaterThanOrEqual(6)
    expect(new Set(pool.map((p) => p.nationality)).size).toBeGreaterThanOrEqual(4)
  })

  test('preço parte da faixa do overall e é corrigido pela idade', () => {
    for (const player of pool) {
      expect(player.age).toBeGreaterThanOrEqual(16)
      expect(player.age).toBeLessThanOrEqual(36)
      // a faixa do overall é a BASE; idade e potencial esticam ou encolhem
      const range = priceRangeFor(player.overall)
      const multiplier = ageValueMultiplier(player.age, player.potential)
      const middle = (range.min + range.max) / 2
      // piso de mercado pode elevar o preço do jogador mais desvalorizado
      expect(player.price).toBeGreaterThanOrEqual(Math.min(100_000, middle * multiplier * 0.8))
      expect(player.price).toBeLessThanOrEqual(Math.max(150_000, middle * multiplier * 1.25))
    }
  })

  test('mesmo overall: o mais jovem custa mais que o veterano', () => {
    // Arrange: agrupa por overall e compara os extremos de idade
    const byOverall = new Map<number, typeof pool[number][]>()
    for (const player of pool) {
      byOverall.set(player.overall, [...(byOverall.get(player.overall) ?? []), player])
    }
    let comparados = 0
    for (const grupo of byOverall.values()) {
      if (grupo.length < 2) continue
      const ordenado = [...grupo].sort((a, b) => a.age - b.age)
      const jovem = ordenado[0]
      const veterano = ordenado[ordenado.length - 1]
      if (veterano.age - jovem.age < 8) continue
      comparados++
      expect(jovem.price).toBeGreaterThan(veterano.price)
    }
    // o pool precisa ter oferecido pelo menos um par para a comparação valer
    expect(comparados).toBeGreaterThan(0)
  })

  test('tem baratos e tem estrelas caras', () => {
    expect(pool.some((p) => p.price <= 390_000)).toBe(true)
    expect(pool.some((p) => p.price >= 8_000_000)).toBe(true)
  })

  test('ninguém sai de graça, nem o veterano mais desvalorizado', () => {
    for (const player of pool) {
      expect(player.price).toBeGreaterThanOrEqual(100_000)
    }
  })
})

describe('squadWithSignings — contratado ocupa uma vaga da posição dele', () => {
  const club = CLUBS[0]
  const base = squadPlayersFor(club, 1)
  const signing: Signing = {
    id: 'mkt-teste',
    name: 'Reforço Caro',
    position: 'ZAG',
    altPositions: [],
    nationality: 'brasil',
    baseAge: 24,
    boughtYear: 1,
    potential: 'alto',
    peakAttrs: { pac: 80, fin: 50, pas: 70, dri: 60, def: 88, fis: 85 },
    price: 5_000_000,
  }

  test('ocupa uma vaga de zagueiro e mantém 18 jogadores', () => {
    /*
     * A vaga sai da POSIÇÃO, não de quem é o mais fraco: escolher pelo
     * overall movia o reforço de índice a cada temporada e desmanchava a
     * escalação do jogador. Ver signingSlot.test.ts.
     */
    // Act
    const squad = squadWithSignings(base, [signing], 1)

    // Assert
    expect(squad).toHaveLength(base.length)
    const reforco = squad.find((player) => player.id === 'mkt-teste')!
    expect(reforco.name).toBe('Reforço Caro')
    expect(reforco.age).toBe(24)
    const slot = squad.findIndex((player) => player.id === 'mkt-teste')
    expect(base[slot].position).toBe('ZAG')
  })

  test('contratado envelhece com as temporadas e se aposenta aos 38', () => {
    // Act
    const older = squadWithSignings(base, [signing], 6)
    const retired = squadWithSignings(base, [{ ...signing, baseAge: 36 }], 4)

    // Assert
    expect(older.find((player) => player.id === 'mkt-teste')!.age).toBe(29)
    expect(retired.some((player) => player.id === 'mkt-teste')).toBe(false)
  })
})

describe('nomes por nacionalidade e galácticos', () => {
  const pool = marketPoolFor(777, 2)

  test('o pool é GRANDE e sem nomes repetidos', () => {
    expect(pool.length).toBeGreaterThanOrEqual(150)
    expect(new Set(pool.map((p) => p.name)).size).toBe(pool.length)
  })

  test('estrangeiro tem nome da terra dele — nada de belga João Silva', () => {
    for (const player of pool) {
      if (player.nationality === 'brasil' || player.id.startsWith('mkt-lenda')) continue
      const first = player.name.split(' ')[0]
      expect(NATIONAL_NAMES[player.nationality].firsts).toContain(first)
    }
  })

  test('galácticos curados: Ronaldo do Brasil e Ronaldo de Portugal, jovens e altíssimos', () => {
    const ronaldoBr = pool.find((p) => p.name === 'Ronaldo Bezerra')!
    const ronaldoPt = pool.find((p) => p.name === 'Ronaldo Vilela')!
    expect(ronaldoBr.nationality).toBe('brasil')
    expect(ronaldoBr.overall).toBeGreaterThanOrEqual(88)
    expect(ronaldoPt.nationality).toBe('portugal')
    expect(ronaldoPt.overall).toBeGreaterThanOrEqual(88)
    for (const legend of pool.filter((p) => p.id.startsWith('mkt-lenda'))) {
      expect(legend.age).toBeLessThanOrEqual(30)
      expect(legend.overall).toBeGreaterThanOrEqual(86)
      expect(legend.price).toBeGreaterThanOrEqual(30_000_000)
    }
  })
})
