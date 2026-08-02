import { describe, expect, it } from 'vitest'
import { CATALOGO } from './catalog'
import { DESFECHOS, type Modificadores } from './outcomes'
import { NEUTRO, distribuicao } from './weights'

const soma = (d: Record<string, number>): number =>
  DESFECHOS.reduce((acc, desfecho) => acc + d[desfecho], 0)

const comNivel = (nivel: number): Modificadores => ({ ...NEUTRO, nivel })

const EXTREMOS: readonly Modificadores[] = [
  NEUTRO,
  { nivel: 1, bonusBom: 1, cortaContra: 1, taticaContra: 1.25, momentum: -0.5, edgeAtaque: -1, edgeDefesa: -1, travamento: 0 },
  { nivel: 10, bonusBom: 1.1, cortaContra: 0.75, taticaContra: 0.7, momentum: 1, edgeAtaque: 1, edgeDefesa: 1, travamento: 1 },
  { nivel: 5, bonusBom: 1.1, cortaContra: 0.75, taticaContra: 1.25, momentum: 1, edgeAtaque: -1, edgeDefesa: 1, travamento: 0.5 },
]

describe('distribuição de desfechos', () => {
  it('soma exatamente 1 em todo o catálogo, nível e contexto', () => {
    for (const jogada of CATALOGO) {
      for (let nivel = 1; nivel <= 10; nivel++) {
        for (const extremo of EXTREMOS) {
          const d = distribuicao(jogada, { ...extremo, nivel })
          expect(soma(d), `${jogada.id} n${nivel}`).toBeCloseTo(1, 12)
        }
      }
    }
  })

  it('nunca entrega 0% nem 100% — nada é impossível nem garantido', () => {
    for (const jogada of CATALOGO) {
      for (const extremo of EXTREMOS) {
        const d = distribuicao(jogada, extremo)
        for (const desfecho of DESFECHOS) {
          expect(d[desfecho], `${jogada.id}.${desfecho}`).toBeGreaterThan(0)
          expect(d[desfecho], `${jogada.id}.${desfecho}`).toBeLessThan(1)
        }
      }
    }
  })

  it('subir o atributo governante nunca reduz a chance de gol', () => {
    for (const jogada of CATALOGO) {
      for (let nivel = 1; nivel < 10; nivel++) {
        const antes = distribuicao(jogada, comNivel(nivel))
        const depois = distribuicao(jogada, comNivel(nivel + 1))
        expect(depois.gol, `${jogada.id} ${nivel}→${nivel + 1}`).toBeGreaterThan(antes.gol)
      }
    }
  })

  it('subir o atributo governante nunca aumenta o risco de tomar gol', () => {
    for (const jogada of CATALOGO) {
      for (let nivel = 1; nivel < 10; nivel++) {
        const antes = distribuicao(jogada, comNivel(nivel))
        const depois = distribuicao(jogada, comNivel(nivel + 1))
        expect(depois.contra, `${jogada.id} ${nivel}→${nivel + 1}`).toBeLessThan(antes.contra)
      }
    }
  })

  it('trata nível fora da faixa como nível de borda', () => {
    const jogada = CATALOGO[0]
    expect(distribuicao(jogada, comNivel(0))).toEqual(distribuicao(jogada, comNivel(1)))
    expect(distribuicao(jogada, comNivel(99))).toEqual(distribuicao(jogada, comNivel(10)))
  })

  it('recuar segura o contra-ataque e contra-ataque expõe', () => {
    const jogada = CATALOGO[0]
    const recuando = distribuicao(jogada, { ...NEUTRO, taticaContra: 0.7 })
    const expondo = distribuicao(jogada, { ...NEUTRO, taticaContra: 1.25 })
    expect(recuando.contra).toBeLessThan(expondo.contra)
  })

  it('frieza reduz o risco de contra-ataque', () => {
    const jogada = CATALOGO[0]
    const sem = distribuicao(jogada, NEUTRO)
    const com = distribuicao(jogada, { ...NEUTRO, cortaContra: 0.75 })
    expect(com.contra).toBeLessThan(sem.contra)
  })

  it('maestro empurra gol e criação', () => {
    const jogada = CATALOGO[0]
    const sem = distribuicao(jogada, NEUTRO)
    const com = distribuicao(jogada, { ...NEUTRO, bonusBom: 1.1 })
    expect(com.gol).toBeGreaterThan(sem.gol)
    expect(com.chance).toBeGreaterThan(sem.chance)
  })

  it('jogo travado seca gol e contra-ataque, sobrando jogada morta', () => {
    const jogada = CATALOGO[0]
    const aberto = distribuicao(jogada, NEUTRO)
    const travado = distribuicao(jogada, { ...NEUTRO, travamento: 1 })
    expect(travado.gol).toBeLessThan(aberto.gol)
    expect(travado.contra).toBeLessThan(aberto.contra)
    expect(travado.nada).toBeGreaterThan(aberto.nada)
  })

  it('vantagem de ataque sobe o gol, vantagem de defesa desce o contra', () => {
    const jogada = CATALOGO[0]
    const base = distribuicao(jogada, NEUTRO)
    expect(distribuicao(jogada, { ...NEUTRO, edgeAtaque: 1 }).gol).toBeGreaterThan(base.gol)
    expect(distribuicao(jogada, { ...NEUTRO, edgeDefesa: 1 }).contra).toBeLessThan(base.contra)
  })

  it('nenhuma decisão fica sem risco, por melhor que seja o cenário', () => {
    // todos os redutores no talo: craque, defesa dominando, recuado e embalado
    const protegido = {
      ...NEUTRO,
      nivel: 10,
      edgeDefesa: 1,
      travamento: 1,
      taticaContra: 0.5,
      momentum: 1,
    }
    for (const jogada of CATALOGO) {
      expect(distribuicao(jogada, protegido).contra).toBeGreaterThan(0.01)
    }
  })

  it('o piso não apaga a diferença entre a jogada ousada e a segura', () => {
    const protegido = { ...NEUTRO, nivel: 10, edgeDefesa: 1, travamento: 1, momentum: 1 }
    const ousada = CATALOGO.find((j) => j.faixa === 'alta')!
    const segura = CATALOGO.find((j) => j.faixa === 'baixa')!
    expect(distribuicao(ousada, protegido).contra).toBeGreaterThan(
      distribuicao(segura, protegido).contra,
    )
  })

  it('a frieza morde mesmo no cenário mais protegido — é o que a torna útil', () => {
    /*
     * Sem o piso, os redutores empilhados derrubavam o risco a ~1% e o perk
     * cortava um quarto de nada. O piso é aplicado ANTES do corte justamente
     * para a habilidade sempre valer alguma coisa.
     */
    const protegido = { ...NEUTRO, nivel: 10, edgeDefesa: 1, travamento: 1, momentum: 1 }
    const ousada = CATALOGO.find((j) => j.faixa === 'alta')!
    const sem = distribuicao(ousada, protegido).contra
    const com = distribuicao(ousada, { ...protegido, cortaContra: 0.75 }).contra
    expect(sem - com).toBeGreaterThan(0.01)
  })

  it('a jogada ousada tem saldo pior para o novato e melhor para o craque', () => {
    const ousada = CATALOGO.find((j) => j.faixa === 'alta')!
    const media = CATALOGO.find((j) => j.faixa === 'media' && j.atributo === ousada.atributo)!
    const saldo = (jogada: typeof ousada, nivel: number): number => {
      const d = distribuicao(jogada, comNivel(nivel))
      return d.gol - d.contra
    }
    expect(saldo(ousada, 1)).toBeLessThan(saldo(media, 1))
    expect(saldo(ousada, 10)).toBeGreaterThan(saldo(media, 10))
  })
})
