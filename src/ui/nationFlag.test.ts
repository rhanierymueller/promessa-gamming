import { describe, expect, test } from 'vitest'
import { NATIONS } from '../data/nations'
import { FLAG_IDS } from './NationFlag'

/*
 * A bandeira não é enfeite: a linha do mercado é uma grade de colunas FIXAS e
 * a bandeira ocupa uma delas. Faltando, todo o resto desliza uma coluna para a
 * esquerda — o nome do jogador caía na coluna de 22px e virava "C…".
 */

describe('bandeiras das seleções', () => {
  test('toda seleção do jogo tem bandeira desenhada', () => {
    const semBandeira = NATIONS.filter((nation) => !FLAG_IDS.includes(nation.id))
    expect(semBandeira.map((nation) => nation.name)).toEqual([])
  })

  test('não há bandeira sobrando para seleção que não existe', () => {
    const ids = NATIONS.map((nation) => nation.id)
    expect(FLAG_IDS.filter((id) => !ids.includes(id))).toEqual([])
  })
})
