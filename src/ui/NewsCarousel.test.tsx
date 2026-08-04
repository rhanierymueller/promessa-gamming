import { describe, expect, test } from 'vitest'
import { nearestIndex } from './NewsCarousel'

/** Trilha de quatro cartões de 300px, como a Home monta. */
const OFFSETS = [0, 300, 600, 900]

describe('cartão sob os olhos no carrossel', () => {
  test('parado no começo, é o primeiro', () => {
    expect(nearestIndex(OFFSETS, 0)).toBe(0)
  })

  test('encaixado num cartão, é aquele cartão', () => {
    expect(nearestIndex(OFFSETS, 600)).toBe(2)
  })

  test('no meio do arrasto, vale o mais PERTO — não o que já passou', () => {
    /*
     * É isto que faz o pontinho acender junto com o gesto, em vez de só depois
     * que o carrossel encaixa. Arredondar sempre para baixo deixaria o
     * indicador um cartão atrás durante todo o movimento.
     */
    expect(nearestIndex(OFFSETS, 140)).toBe(0)
    expect(nearestIndex(OFFSETS, 160)).toBe(1)
  })

  test('puxado além da ponta, para no último — a lista não dá volta', () => {
    // o toque estica a rolagem além do fim; o índice não pode sair da lista
    expect(nearestIndex(OFFSETS, 1200)).toBe(3)
    expect(nearestIndex(OFFSETS, -80)).toBe(0)
  })

  test('uma notícia só: não há para onde ir', () => {
    expect(nearestIndex([0], 45)).toBe(0)
  })
})
