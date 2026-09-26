import { describe, expect, it } from 'vitest'
import { NOTA_POR_FAIXA, notaDe } from './nota'
import { DESFECHOS, FAIXAS } from './outcomes'

describe('nota por desfecho', () => {
  it('cobre toda faixa e todo desfecho com um número finito', () => {
    for (const faixa of FAIXAS) {
      for (const desfecho of DESFECHOS) {
        expect(Number.isFinite(notaDe(faixa, desfecho)), `${faixa}.${desfecho}`).toBe(true)
      }
    }
  })

  it('lê a tabela: notaDe é só um acesso, sem cálculo escondido', () => {
    expect(notaDe('alta', 'gol')).toBe(NOTA_POR_FAIXA.alta.gol)
    expect(notaDe('baixa', 'contra')).toBe(NOTA_POR_FAIXA.baixa.contra)
  })

  it('dentro de cada faixa, gol > chance > nada > perdeu > contra', () => {
    for (const faixa of FAIXAS) {
      const n = NOTA_POR_FAIXA[faixa]
      expect(n.gol, faixa).toBeGreaterThan(n.chance)
      expect(n.chance, faixa).toBeGreaterThan(n.nada)
      expect(n.nada, faixa).toBeGreaterThan(n.perdeu)
      expect(n.perdeu, faixa).toBeGreaterThan(n.contra)
    }
  })

  it('a ousadia paga mais quando dá certo e cobra mais quando dá errado', () => {
    // é o que substitui o cronômetro: jogar seguro a temporada toda não evolui o craque
    for (const desfecho of ['gol', 'chance'] as const) {
      expect(notaDe('alta', desfecho), desfecho).toBeGreaterThan(notaDe('media', desfecho))
      expect(notaDe('media', desfecho), desfecho).toBeGreaterThan(notaDe('baixa', desfecho))
    }
    for (const desfecho of ['perdeu', 'contra'] as const) {
      expect(notaDe('alta', desfecho), desfecho).toBeLessThan(notaDe('media', desfecho))
      expect(notaDe('media', desfecho), desfecho).toBeLessThan(notaDe('baixa', desfecho))
    }
  })

  it('manter a posse pontua só na jogada segura, e pouco', () => {
    expect(notaDe('baixa', 'nada')).toBeGreaterThan(0)
    expect(notaDe('baixa', 'nada')).toBeLessThan(notaDe('baixa', 'chance'))
    expect(notaDe('media', 'nada')).toBe(0)
    // a jogada ousada que morre sem dano ainda custa: era para decidir e não decidiu
    expect(notaDe('alta', 'nada')).toBeLessThan(0)
  })

  it('bons desfechos sobem a nota e maus descem, em toda faixa', () => {
    for (const faixa of FAIXAS) {
      expect(notaDe(faixa, 'gol'), faixa).toBeGreaterThan(0)
      expect(notaDe(faixa, 'chance'), faixa).toBeGreaterThan(0)
      expect(notaDe(faixa, 'perdeu'), faixa).toBeLessThan(0)
      expect(notaDe(faixa, 'contra'), faixa).toBeLessThan(0)
    }
  })

  it('nenhum desfecho isolado vira a nota de uma partida', () => {
    // a escala da nota é 3..10: um lance mexe, não decide sozinho
    for (const faixa of FAIXAS) {
      for (const desfecho of DESFECHOS) {
        expect(Math.abs(notaDe(faixa, desfecho)), `${faixa}.${desfecho}`).toBeLessThanOrEqual(1.2)
      }
    }
  })
})
