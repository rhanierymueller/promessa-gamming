import { describe, expect, it } from 'vitest'
import { createRng } from '../rng'
import { massaDeRisco } from './catalog'
import { FAIXAS } from './outcomes'
import { QUANTAS_OPCOES, sortearJogadas } from './draw'

const sortear = (seed: number) => sortearJogadas(createRng(seed)).value

describe('sorteio das opções', () => {
  it('entrega sempre cinco jogadas', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(sortear(seed).length, `seed ${seed}`).toBe(QUANTAS_OPCOES)
    }
  })

  it('nunca repete jogada no mesmo lance', () => {
    for (let seed = 0; seed < 200; seed++) {
      const ids = sortear(seed).map((jogada) => jogada.id)
      expect(new Set(ids).size, `seed ${seed}`).toBe(ids.length)
    }
  })

  it('cobre as três faixas em todo sorteio', () => {
    for (let seed = 0; seed < 200; seed++) {
      const faixas = new Set(sortear(seed).map((jogada) => jogada.faixa))
      for (const faixa of FAIXAS) {
        expect(faixas, `seed ${seed} sem faixa ${faixa}`).toContain(faixa)
      }
    }
  })

  it('ordena do lance mais decisivo para o mais conservador', () => {
    for (let seed = 0; seed < 50; seed++) {
      const riscos = sortear(seed).map(massaDeRisco)
      const ordenado = [...riscos].sort((a, b) => b - a)
      expect(riscos, `seed ${seed}`).toEqual(ordenado)
    }
  })

  it('é determinístico: mesma semente, mesmo menu', () => {
    expect(sortear(42).map((j) => j.id)).toEqual(sortear(42).map((j) => j.id))
  })

  it('varia o menu entre lances', () => {
    const menus = new Set(
      Array.from({ length: 60 }, (_, seed) => sortear(seed).map((j) => j.id).join('|')),
    )
    expect(menus.size).toBeGreaterThan(10)
  })

  it('avança o rng para o próximo lance não repetir', () => {
    const primeiro = sortearJogadas(createRng(7))
    const segundo = sortearJogadas(primeiro.next)
    expect(segundo.value.map((j) => j.id)).not.toEqual(primeiro.value.map((j) => j.id))
  })

  it('dá chance a toda jogada do catálogo ao longo de muitos lances', () => {
    const vistas = new Set<string>()
    let rng = createRng(99)
    for (let i = 0; i < 400; i++) {
      const sorteio = sortearJogadas(rng)
      rng = sorteio.next
      for (const jogada of sorteio.value) vistas.add(jogada.id)
    }
    expect(vistas.size).toBe(14)
  })
})
