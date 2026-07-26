import { describe, expect, test } from 'vitest'
import { matchupEdges, sectorEdge, tightness } from './sectorDuel'

const time = (def: number, mei: number, ata: number) => ({ def, mei, ata })

describe('confronto de setores', () => {
  test('setores iguais não dão vantagem a ninguém', () => {
    expect(sectorEdge(70, 70)).toBe(0)
  })

  test('setor melhor dá vantagem; pior dá desvantagem', () => {
    expect(sectorEdge(80, 60)).toBeGreaterThan(0)
    expect(sectorEdge(60, 80)).toBeLessThan(0)
  })

  test('a vantagem satura: 40 de diferença não vale o dobro de 30', () => {
    expect(sectorEdge(99, 30)).toBe(1)
    expect(sectorEdge(30, 99)).toBe(-1)
  })

  test('meu ataque mede contra a DEFESA deles, não contra o ataque', () => {
    // ataque 85 contra defesa 60 ameaça, mesmo que eles ataquem melhor que eu
    const e = matchupEdges(time(60, 60, 85), time(60, 60, 95))
    expect(e.attack).toBeGreaterThan(0)
  })

  test('minha defesa mede contra o ATAQUE deles', () => {
    const e = matchupEdges(time(85, 60, 60), time(60, 60, 60))
    expect(e.defense).toBeGreaterThan(0)
  })

  test('meio contra meio decide quem constrói', () => {
    expect(matchupEdges(time(60, 85, 60), time(60, 60, 60)).midfield).toBeGreaterThan(0)
  })
})

describe('jogo pegado', () => {
  test('defesa muito boa contra ataque muito bom trava a partida', () => {
    const travado = tightness(time(88, 70, 70), time(70, 70, 88))
    expect(travado).toBeGreaterThan(0.5)
  })

  test('dois times fracos não travam nada — sobra espaço', () => {
    expect(tightness(time(50, 50, 50), time(50, 50, 50))).toBe(0)
  })

  test('ataque bom contra defesa fraca abre o jogo, mesmo com nomes grandes', () => {
    // 90 de ataque contra 55 de defesa: o duelo que importa é fraco
    const aberto = tightness(time(55, 90, 90), time(55, 90, 90))
    expect(aberto).toBeLessThan(0.4)
  })

  test('o resultado fica sempre entre 0 e 1', () => {
    for (const n of [30, 50, 70, 90, 99]) {
      const t = tightness(time(n, n, n), time(n, n, n))
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(1)
    }
  })
})
