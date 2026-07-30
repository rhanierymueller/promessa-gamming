import { describe, expect, it } from 'vitest'
import { createRng } from '../rng'
import { CATALOGO, jogadaPorId } from './catalog'
import { DESFECHOS, type Desfecho } from './outcomes'
import { resolverDecisao } from './resolve'
import { NEUTRO, distribuicao } from './weights'

describe('resolução da decisão', () => {
  it('é determinística: mesma semente, mesmo desfecho', () => {
    const jogada = jogadaPorId('driblar-zaga')
    const a = resolverDecisao(jogada, NEUTRO, createRng(31))
    const b = resolverDecisao(jogada, NEUTRO, createRng(31))
    expect(a.value.desfecho).toBe(b.value.desfecho)
    expect(a.value.notaDelta).toBe(b.value.notaDelta)
  })

  it('sempre devolve um desfecho válido', () => {
    for (const jogada of CATALOGO) {
      for (let seed = 0; seed < 40; seed++) {
        const { value } = resolverDecisao(jogada, NEUTRO, createRng(seed))
        expect(DESFECHOS, `${jogada.id} seed ${seed}`).toContain(value.desfecho)
      }
    }
  })

  it('a frequência observada bate com a distribuição anunciada', () => {
    const jogada = jogadaPorId('driblar-zaga')
    const esperado = distribuicao(jogada, NEUTRO)
    const contagem: Record<string, number> = {}
    let rng = createRng(5)
    const N = 60000
    for (let i = 0; i < N; i++) {
      const passo = resolverDecisao(jogada, NEUTRO, rng)
      rng = passo.next
      contagem[passo.value.desfecho] = (contagem[passo.value.desfecho] ?? 0) + 1
    }
    for (const desfecho of DESFECHOS) {
      const observado = (contagem[desfecho] ?? 0) / N
      // o que a tela promete é o que o dado entrega
      expect(observado, desfecho).toBeCloseTo(esperado[desfecho], 2)
    }
  })

  it('avança o rng', () => {
    const jogada = jogadaPorId('toque-de-primeira')
    const passo = resolverDecisao(jogada, NEUTRO, createRng(11))
    expect(passo.next).not.toEqual(createRng(11))
  })

  it('nota recompensa a ousadia mais que a manutenção', () => {
    const ousada = jogadaPorId('driblar-zaga')
    const segura = jogadaPorId('segurar-a-bola')
    const notaDe = (jogada: typeof ousada, desfecho: Desfecho): number => {
      // resolve até cair no desfecho pedido, para ler a nota daquele caso
      let rng = createRng(1)
      for (let i = 0; i < 200000; i++) {
        const passo = resolverDecisao(jogada, NEUTRO, rng)
        rng = passo.next
        if (passo.value.desfecho === desfecho) return passo.value.notaDelta
      }
      throw new Error(`desfecho ${desfecho} não saiu para ${jogada.id}`)
    }
    expect(notaDe(ousada, 'gol')).toBeGreaterThan(notaDe(segura, 'gol'))
    expect(notaDe(ousada, 'chance')).toBeGreaterThan(notaDe(segura, 'chance'))
    // e cobra mais caro quando dá errado
    expect(notaDe(ousada, 'contra')).toBeLessThan(notaDe(segura, 'contra'))
  })

  it('manter a posse não é fracasso: jogada segura pontua no desfecho neutro', () => {
    const segura = jogadaPorId('recuar-pro-goleiro')
    let rng = createRng(3)
    for (let i = 0; i < 5000; i++) {
      const passo = resolverDecisao(segura, NEUTRO, rng)
      rng = passo.next
      if (passo.value.desfecho === 'nada') {
        expect(passo.value.notaDelta).toBeGreaterThan(0)
        return
      }
    }
    throw new Error('desfecho nada não saiu')
  })
})
