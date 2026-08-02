import { describe, expect, test } from 'vitest'
import {
  addAward,
  hasAward,
  MVP_MIN_GAMES,
  MVP_RATING,
  MVP_TIER,
  wonGoldenBoot,
  wonMvp,
  type Award,
} from './awards'

const chuteira: Award = { kind: 'chuteira', competition: 'liga', year: 1, value: 12 }

describe('chuteira de ouro', () => {
  test('vai para quem fez MAIS gols que o segundo colocado', () => {
    expect(wonGoldenBoot(12, 9)).toBe(true)
  })

  test('empate na artilharia não rende prêmio', () => {
    expect(wonGoldenBoot(9, 9)).toBe(false)
  })

  test('quem não marcou não leva, nem numa competição sem gols', () => {
    expect(wonGoldenBoot(0, 0)).toBe(false)
  })
})

describe('melhor jogador', () => {
  test('precisa de campanha e de nota alta', () => {
    expect(wonMvp(MVP_MIN_GAMES, MVP_RATING)).toBe(true)
  })

  test('nota alta em poucos jogos não conta — não se decide um torneio de um jogo', () => {
    expect(wonMvp(MVP_MIN_GAMES - 1, 9.5)).toBe(false)
  })

  test('campanha longa com nota mediana também não', () => {
    expect(wonMvp(20, MVP_RATING - 0.1)).toBe(false)
  })
})

describe('estante de prêmios', () => {
  test('o mesmo prêmio não entra duas vezes na mesma temporada', () => {
    const uma = addAward([], chuteira)
    const outra = addAward(uma, { ...chuteira, value: 99 })
    expect(outra).toHaveLength(1)
  })

  test('a mesma chuteira em ANOS diferentes são dois prêmios', () => {
    const acumulado = addAward(addAward([], chuteira), { ...chuteira, year: 2 })
    expect(acumulado).toHaveLength(2)
  })

  test('chuteira e melhor jogador convivem na mesma competição e ano', () => {
    const acumulado = addAward(addAward([], chuteira), {
      ...chuteira,
      kind: 'melhor-jogador',
      value: 8.2,
    })
    expect(acumulado).toHaveLength(2)
  })

  test('hasAward acha o que já está lá e ignora o resto', () => {
    const acumulado = addAward([], chuteira)
    expect(hasAward(acumulado, 'chuteira', 'liga', 1)).toBe(true)
    expect(hasAward(acumulado, 'chuteira', 'liga', 2)).toBe(false)
    expect(hasAward(acumulado, 'melhor-jogador', 'liga', 1)).toBe(false)
  })
})

describe('tier da estatueta', () => {
  test('toda competição tem um tier de arte', () => {
    for (const competition of [
      'liga',
      'copa-brasil',
      'libertados',
      'copa-america',
      'liga-nacoes',
      'copa-mundo',
    ] as const) {
      expect(MVP_TIER[competition]).toBeDefined()
    }
  })

  test('as decisões grandes levam ouro', () => {
    expect(MVP_TIER['copa-mundo']).toBe('gold')
    expect(MVP_TIER.libertados).toBe('gold')
  })
})
