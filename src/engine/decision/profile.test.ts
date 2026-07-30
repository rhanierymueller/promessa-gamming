import { describe, expect, it } from 'vitest'
import { createRng } from '../rng'
import { massaDeRisco } from './catalog'
import { sortearJogadas } from './draw'
import { escolhaDoPerfil, PERFIS } from './profile'

describe('perfil de escolha', () => {
  it('ousado pega o lance mais decisivo, cauteloso o mais conservador', () => {
    for (let seed = 0; seed < 60; seed++) {
      const opcoes = sortearJogadas(createRng(seed)).value
      const ousado = escolhaDoPerfil(opcoes, 'ousado')
      const cauteloso = escolhaDoPerfil(opcoes, 'cauteloso')
      expect(massaDeRisco(ousado), `seed ${seed}`).toBeGreaterThan(massaDeRisco(cauteloso))
    }
  })

  it('equilibrado fica entre os dois', () => {
    for (let seed = 0; seed < 60; seed++) {
      const opcoes = sortearJogadas(createRng(seed)).value
      const meio = massaDeRisco(escolhaDoPerfil(opcoes, 'equilibrado'))
      expect(meio, `seed ${seed}`).toBeLessThanOrEqual(massaDeRisco(escolhaDoPerfil(opcoes, 'ousado')))
      expect(meio, `seed ${seed}`).toBeGreaterThanOrEqual(massaDeRisco(escolhaDoPerfil(opcoes, 'cauteloso')))
    }
  })

  it('sempre escolhe uma jogada do menu oferecido', () => {
    const opcoes = sortearJogadas(createRng(4)).value
    for (const perfil of PERFIS) {
      expect(opcoes).toContain(escolhaDoPerfil(opcoes, perfil))
    }
  })

  it('recusa menu vazio em vez de devolver undefined', () => {
    expect(() => escolhaDoPerfil([], 'equilibrado')).toThrow(/vazio/)
  })
})
