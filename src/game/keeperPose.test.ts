import { describe, expect, test } from 'vitest'
import { defenseKeeperPose, diveLift, LONG_DIVE } from './keeperPose'

/**
 * A regra que o jogador enxerga: espaço SOZINHO é pulo reto; espaço COM
 * direção é voo para aquele lado — desde o primeiro instante, sem esperar
 * o corpo percorrer meio gol.
 */

describe('pose do goleiro pilotado', () => {
  test('espaço sozinho, parado no meio: pulo reto', () => {
    const { pose } = defenseKeeperPose(0, 0, true)
    expect(pose).toBe('jump')
  })

  test('D + espaço voa PARA A DIREITA já no começo do deslocamento', () => {
    // Arrange: ainda no centro, mas mandado para a direita
    const { pose, flip } = defenseKeeperPose(0, 44, true)

    // Assert: nada de pulo vertical
    expect(pose).toBe('fly')
    expect(flip).toBe(false)
  })

  test('A + espaço voa PARA A ESQUERDA já no começo', () => {
    const { pose, flip } = defenseKeeperPose(0, -44, true)
    expect(pose).toBe('fly')
    expect(flip).toBe(true)
  })

  test('voando para o lado, a pose não volta a ser pulo no meio do caminho', () => {
    // Arrange: percorre o trajeto inteiro rumo ao poste
    for (let x = 0; x <= 40; x += 4) {
      const { pose } = defenseKeeperPose(x, 44, true)
      expect(pose).toBe('fly')
    }
  })

  test('sem espaço: agachado no meio, lançando no caminho, mergulho no fim', () => {
    expect(defenseKeeperPose(0, 0, false).pose).toBe('crouch')
    expect(defenseKeeperPose(14, 44, false).pose).toBe('takeoff')
    expect(defenseKeeperPose(LONG_DIVE + 6, 44, false).pose).toBe('diveR')
    expect(defenseKeeperPose(-(LONG_DIVE + 6), -44, false).pose).toBe('diveL')
  })

  test('o corpo aponta para onde ele VAI, não para onde está', () => {
    // Arrange: está à direita, mas foi mandado voltar para a esquerda
    const { flip } = defenseKeeperPose(20, -44, true)

    // Assert
    expect(flip).toBe(true)
  })

  test('parado num canto sem comando novo mantém o lado que ocupa', () => {
    expect(defenseKeeperPose(-25, -25, true).flip).toBe(true)
    expect(defenseKeeperPose(25, 25, true).flip).toBe(false)
  })

  test('mergulho e voo saem do chão; agachado e lançando, não', () => {
    expect(defenseKeeperPose(0, 44, true).airborne).toBe(true)
    expect(defenseKeeperPose(40, 44, false).airborne).toBe(true)
    expect(defenseKeeperPose(0, 0, false).airborne).toBe(false)
    expect(defenseKeeperPose(14, 44, false).airborne).toBe(false)
  })
})

describe('arco do mergulho: sobe e CAI no chão', () => {
  test('começa no chão, sobe no meio e aterrissa no fim', () => {
    // Arrange: progresso do impulso à queda
    const inicio = diveLift(0, 40, true)
    const apice = diveLift(0.5, 40, true)
    const fim = diveLift(1, 40, true)

    // Assert
    expect(inicio).toBeCloseTo(0, 5)
    expect(apice).toBeGreaterThan(3)
    expect(fim).toBeCloseTo(0, 5)
  })

  test('nunca fica boiando: em qualquer ponto depois do ápice ele desce', () => {
    // Arrange
    const alturas = [0.5, 0.6, 0.7, 0.8, 0.9, 1].map((p) => diveLift(p, 40, true))

    // Assert: sempre caindo depois do meio
    for (let i = 1; i < alturas.length; i++) {
      expect(alturas[i]).toBeLessThan(alturas[i - 1])
    }
  })

  test('quem está de pé (agachado/andando) não sai do chão', () => {
    for (const p of [0, 0.3, 0.5, 1]) {
      expect(diveLift(p, 40, false)).toBe(0)
    }
  })

  test('mergulho mais longe voa mais alto', () => {
    expect(diveLift(0.5, 40, true)).toBeGreaterThan(diveLift(0.5, 5, true))
  })

  test('progresso fora da faixa não quebra o arco', () => {
    expect(diveLift(-1, 40, true)).toBeCloseTo(0, 5)
    expect(diveLift(2, 40, true)).toBeCloseTo(0, 5)
  })
})

describe('antes da bola sair ele se posiciona de PÉ', () => {
  test('não mergulha com a bola ainda no pé do cobrador', () => {
    // Arrange: mesmo comando de voo, mas o chute ainda não saiu
    const antes = defenseKeeperPose(30, 44, true, false)

    // Assert
    expect(antes.pose).not.toBe('fly')
    expect(antes.airborne).toBe(false)
  })

  test('deslocando-se antes do chute, fica andando; parado, agachado', () => {
    expect(defenseKeeperPose(20, 44, false, false).pose).toBe('takeoff')
    expect(defenseKeeperPose(0, 0, false, false).pose).toBe('crouch')
  })

  test('assim que a bola sai, o mesmo comando vira voo', () => {
    expect(defenseKeeperPose(30, 44, true, true).pose).toBe('fly')
  })
})
