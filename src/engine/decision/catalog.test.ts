import { describe, expect, it } from 'vitest'
import { ATTRIBUTE_KEYS } from '../career/attributes'
import { CATALOGO, jogadaPorId, jogadasDaFaixa } from './catalog'
import { DESFECHOS, FAIXAS } from './outcomes'

describe('catálogo de jogadas', () => {
  it('tem jogadas suficientes para sortear cinco sem repetir', () => {
    expect(CATALOGO.length).toBeGreaterThanOrEqual(14)
  })

  it('não repete id', () => {
    const ids = CATALOGO.map((jogada) => jogada.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('nunca tem peso zero — nenhum desfecho é impossível', () => {
    for (const jogada of CATALOGO) {
      for (const desfecho of DESFECHOS) {
        expect(jogada.pesos[desfecho], `${jogada.id}.${desfecho}`).toBeGreaterThan(0)
      }
    }
  })

  it('governa cada jogada por um atributo treinável', () => {
    for (const jogada of CATALOGO) {
      expect(ATTRIBUTE_KEYS, jogada.id).toContain(jogada.atributo)
    }
  })

  it('povoa as três faixas com pelo menos uma jogada cada', () => {
    for (const faixa of FAIXAS) {
      expect(jogadasDaFaixa(faixa).length, faixa).toBeGreaterThan(0)
    }
  })

  it('classifica a faixa de forma coerente com o risco dos pesos', () => {
    // massa de risco = gol + contra: é o que separa jogada decisiva de jogada de manutenção
    const risco = (id: string): number => {
      const jogada = jogadaPorId(id as never)
      const total = DESFECHOS.reduce((acc, d) => acc + jogada.pesos[d], 0)
      return (jogada.pesos.gol + jogada.pesos.contra) / total
    }
    const maiorDe = (faixa: 'alta' | 'media' | 'baixa'): number =>
      Math.max(...jogadasDaFaixa(faixa).map((j) => risco(j.id)))
    const menorDe = (faixa: 'alta' | 'media' | 'baixa'): number =>
      Math.min(...jogadasDaFaixa(faixa).map((j) => risco(j.id)))

    expect(menorDe('alta')).toBeGreaterThan(maiorDe('media'))
    expect(menorDe('media')).toBeGreaterThan(maiorDe('baixa'))
  })

  it('acha jogada por id', () => {
    const alvo = CATALOGO[0]
    expect(jogadaPorId(alvo.id)).toBe(alvo)
  })

  it('cobre os três atributos que fazem sentido no lance', () => {
    const atributos = new Set(CATALOGO.map((jogada) => jogada.atributo))
    expect(atributos).toContain('finalizacao')
    expect(atributos).toContain('passe')
    expect(atributos).toContain('cobranca')
  })
})
