import { describe, expect, it } from 'vitest'
import { createRng } from '../rng'
import { chanceDeConverter, rolarAssistencia } from './assist'

describe('conversão da chance criada', () => {
  it('converte menos de metade num confronto equilibrado', () => {
    expect(chanceDeConverter(0)).toBeCloseTo(0.42, 10)
  })

  it('ataque melhor que a defesa deles converte mais', () => {
    expect(chanceDeConverter(0.5)).toBeGreaterThan(chanceDeConverter(0))
    expect(chanceDeConverter(0)).toBeGreaterThan(chanceDeConverter(-0.5))
  })

  it('nem o pior ataque desperdiça tudo, nem o melhor converte sempre', () => {
    expect(chanceDeConverter(-1)).toBeGreaterThan(0)
    expect(chanceDeConverter(1)).toBeLessThan(1)
    // e o clamp segura valores fora da faixa esperada de edge
    expect(chanceDeConverter(-99)).toBe(chanceDeConverter(-1))
    expect(chanceDeConverter(99)).toBe(chanceDeConverter(1))
  })

  it('cobre a faixa de elenco fraco a elenco forte que o design promete', () => {
    expect(chanceDeConverter(-0.5)).toBeCloseTo(0.295, 3)
    expect(chanceDeConverter(0.5)).toBeCloseTo(0.545, 3)
  })

  it('a frequência observada bate com a chance anunciada', () => {
    let rng = createRng(17)
    let convertidas = 0
    const N = 40000
    for (let i = 0; i < N; i++) {
      const roll = rolarAssistencia(0.5, rng)
      rng = roll.next
      if (roll.value) convertidas++
    }
    expect(convertidas / N).toBeCloseTo(chanceDeConverter(0.5), 2)
  })

  it('é determinística e avança o rng', () => {
    const a = rolarAssistencia(0, createRng(9))
    const b = rolarAssistencia(0, createRng(9))
    expect(a.value).toBe(b.value)
    expect(a.next).not.toEqual(createRng(9))
  })
})
