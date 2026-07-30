import { describe, expect, it } from 'vitest'
import { DEFAULT_ATTRIBUTES } from '../career/attributes'
import { jogadaPorId } from './catalog'
import { modificadoresPara, type ContextoDaJogada } from './context'
import { distribuicao } from './weights'

const BASE: ContextoDaJogada = {
  attributes: DEFAULT_ATTRIBUTES,
  perks: [],
  tatica: 'equilibrado',
  momentum: 0,
  edges: { attack: 0, defense: 0, midfield: 0 },
  travamento: 0,
}

describe('contexto da jogada', () => {
  it('pega o nível do atributo que a jogada declara', () => {
    const attributes = { finalizacao: 9, passe: 2, cobranca: 5, defesa: 1 }
    const contexto = { ...BASE, attributes }
    expect(modificadoresPara(jogadaPorId('chutar-de-fora'), contexto).nivel).toBe(9)
    expect(modificadoresPara(jogadaPorId('toque-de-primeira'), contexto).nivel).toBe(2)
    expect(modificadoresPara(jogadaPorId('cavar-a-falta'), contexto).nivel).toBe(5)
  })

  it('a mesma build premia jogadas diferentes', () => {
    const matador = { ...BASE, attributes: { finalizacao: 10, passe: 1, cobranca: 1, defesa: 1 } }
    const maestro = { ...BASE, attributes: { finalizacao: 1, passe: 10, cobranca: 1, defesa: 1 } }
    const chute = jogadaPorId('chutar-de-fora')
    const passe = jogadaPorId('toque-de-primeira')

    const golDoMatador = distribuicao(chute, modificadoresPara(chute, matador)).gol
    const golDoMaestroNoChute = distribuicao(chute, modificadoresPara(chute, maestro)).gol
    expect(golDoMatador).toBeGreaterThan(golDoMaestroNoChute)

    const criaDoMaestro = distribuicao(passe, modificadoresPara(passe, maestro)).chance
    const criaDoMatadorNoPasse = distribuicao(passe, modificadoresPara(passe, matador)).chance
    expect(criaDoMaestro).toBeGreaterThan(criaDoMatadorNoPasse)
  })

  it('traduz recuar e contra-ataque em exposição diferente', () => {
    const jogada = jogadaPorId('driblar-zaga')
    const recuando = modificadoresPara(jogada, { ...BASE, tatica: 'recuar' })
    const expondo = modificadoresPara(jogada, { ...BASE, tatica: 'contra-ataque' })
    expect(recuando.taticaContra).toBeLessThan(1)
    expect(expondo.taticaContra).toBeGreaterThan(1)
  })

  it('traduz os perks nos multiplicadores certos', () => {
    const jogada = jogadaPorId('driblar-zaga')
    const comAmbos = modificadoresPara(jogada, { ...BASE, perks: ['maestro', 'frieza'] })
    expect(comAmbos.bonusBom).toBeGreaterThan(1)
    expect(comAmbos.cortaContra).toBeLessThan(1)

    const semNada = modificadoresPara(jogada, BASE)
    expect(semNada.bonusBom).toBe(1)
    expect(semNada.cortaContra).toBe(1)
  })

  it('repassa setor, momentum e travamento sem alterar', () => {
    const jogada = jogadaPorId('driblar-zaga')
    const mod = modificadoresPara(jogada, {
      ...BASE,
      momentum: 0.8,
      edges: { attack: 0.4, defense: -0.2, midfield: 0.1 },
      travamento: 0.6,
    })
    expect(mod.momentum).toBe(0.8)
    expect(mod.edgeAtaque).toBe(0.4)
    expect(mod.edgeDefesa).toBe(-0.2)
    expect(mod.travamento).toBe(0.6)
  })

  it('produz distribuição válida para toda jogada num contexto real', () => {
    const contexto: ContextoDaJogada = {
      attributes: { finalizacao: 7, passe: 4, cobranca: 6, defesa: 3 },
      perks: ['maestro', 'frieza'],
      tatica: 'contra-ataque',
      momentum: 0.5,
      edges: { attack: 0.3, defense: -0.4, midfield: 0.2 },
      travamento: 0.3,
    }
    for (const id of ['driblar-zaga', 'toque-de-primeira', 'cavar-a-falta'] as const) {
      const jogada = jogadaPorId(id)
      const d = distribuicao(jogada, modificadoresPara(jogada, contexto))
      const soma = d.gol + d.chance + d.nada + d.perdeu + d.contra
      expect(soma, id).toBeCloseTo(1, 12)
    }
  })
})
