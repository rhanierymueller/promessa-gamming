import { describe, expect, it, vi } from 'vitest'
import { createRng, nextFloat } from '../rng'
import { chanceDeTerminarEmGol } from './assist'
import { CATALOGO, jogadaPorId } from './catalog'
import { notaDe } from './nota'
import { DESFECHOS, type Desfecho } from './outcomes'
import { jogarDecisao, ladoDoGol, resolverDecisao } from './resolve'
import { NEUTRO, distribuicao } from './weights'

// o rng real continua valendo; só um teste força um valor impossível (1.0)
vi.mock('../rng', async (importOriginal) => {
  const real = await importOriginal<typeof import('../rng')>()
  return { ...real, nextFloat: vi.fn(real.nextFloat) }
})

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

  it('a nota do desfecho é a da faixa da jogada, sem ajuste escondido', () => {
    for (const jogada of CATALOGO) {
      let rng = createRng(13)
      for (let i = 0; i < 30; i++) {
        const passo = resolverDecisao(jogada, NEUTRO, rng)
        rng = passo.next
        expect(passo.value.notaDelta, jogada.id).toBe(notaDe(jogada.faixa, passo.value.desfecho))
      }
    }
  })

  it('uma sobra de ponto flutuante cai no último desfecho em vez de deixar o lance sem resultado', () => {
    // nextFloat nunca devolve 1.0; forçar esse valor exercita a saída de segurança
    vi.mocked(nextFloat).mockReturnValueOnce({ value: 1, next: createRng(999) })
    const jogada = jogadaPorId('driblar-zaga')
    const passo = resolverDecisao(jogada, NEUTRO, createRng(1))
    expect(passo.value.desfecho).toBe(DESFECHOS[DESFECHOS.length - 1])
    expect(passo.value.notaDelta).toBe(notaDe('alta', 'contra'))
    expect(passo.next).toEqual(createRng(999))
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

describe('lance completo: desfecho + rolagem do time', () => {
  const N = 40000

  it('é determinístico: mesma semente, mesmo lance', () => {
    const jogada = jogadaPorId('toque-de-primeira')
    const a = jogarDecisao(jogada, NEUTRO, createRng(77))
    const b = jogarDecisao(jogada, NEUTRO, createRng(77))
    expect(a.value).toEqual(b.value)
    expect(a.next).toEqual(b.next)
  })

  it('só rola a assistência quando a chance foi criada', () => {
    const jogada = jogadaPorId('cavar-a-falta')
    let rng = createRng(21)
    let vistaChance = false
    let vistoOutro = false
    for (let i = 0; i < 400; i++) {
      const passo = resolverDecisao(jogada, NEUTRO, rng)
      const lance = jogarDecisao(jogada, NEUTRO, rng)
      expect(lance.value.resolucao).toEqual(passo.value)
      if (passo.value.desfecho === 'chance') {
        vistaChance = true
        // consumiu um sorteio a mais: o do ataque do time
        expect(lance.next).not.toEqual(passo.next)
      } else {
        vistoOutro = true
        expect(lance.value.assistConvertida).toBe(false)
        expect(lance.next).toEqual(passo.next)
      }
      rng = lance.next
    }
    expect(vistaChance).toBe(true)
    expect(vistoOutro).toBe(true)
  })

  it('o número da tela é o que o dado entrega: gol seu ou do companheiro', () => {
    // é o teste que falharia se a tela somasse gol + chance sem descontar a conversão
    const jogada = jogadaPorId('cavar-a-falta')
    const mod = { ...NEUTRO, nivel: 3, edgeAtaque: 0.4 }
    const anunciado = chanceDeTerminarEmGol(distribuicao(jogada, mod), mod.edgeAtaque)
    let rng = createRng(8)
    let gols = 0
    for (let i = 0; i < N; i++) {
      const lance = jogarDecisao(jogada, mod, rng)
      rng = lance.next
      const { desfecho } = lance.value.resolucao
      if (desfecho === 'gol' || (desfecho === 'chance' && lance.value.assistConvertida)) gols++
    }
    expect(gols / N).toBeCloseTo(anunciado, 2)
  })

  it('a conversão observada da chance criada bate com a anunciada para o elenco', () => {
    const jogada = jogadaPorId('cruzamento-rasteiro')
    const mod = { ...NEUTRO, edgeAtaque: -0.6 }
    let rng = createRng(3)
    let chances = 0
    let convertidas = 0
    for (let i = 0; i < N; i++) {
      const lance = jogarDecisao(jogada, mod, rng)
      rng = lance.next
      if (lance.value.resolucao.desfecho !== 'chance') continue
      chances++
      if (lance.value.assistConvertida) convertidas++
    }
    expect(chances).toBeGreaterThan(1000)
    expect(convertidas / chances).toBeCloseTo(0.42 + -0.6 * 0.25, 1)
  })
})

describe('lado do gol', () => {
  it('gol é seu, contra é deles, o resto não mexe no placar sozinho', () => {
    expect(ladoDoGol('gol')).toBe('team')
    expect(ladoDoGol('contra')).toBe('opponent')
    // a chance criada só vira gol pela rolagem do time — não é decidida aqui
    expect(ladoDoGol('chance')).toBeNull()
    expect(ladoDoGol('nada')).toBeNull()
    expect(ladoDoGol('perdeu')).toBeNull()
  })
})
