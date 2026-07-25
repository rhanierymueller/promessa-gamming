import { describe, expect, test } from 'vitest'
import { KEEPER_MAX_SPEED, steerKeeperX } from './steering'

/**
 * Controle contínuo do goleiro: você segura e arrasta, ele acompanha. O
 * limite de velocidade é o que mantém o jogo honesto — sem ele bastaria
 * esperar a bola e colar o goleiro nela no último quadro.
 */

describe('steerKeeperX', () => {
  test('anda na direção do alvo', () => {
    expect(steerKeeperX(0, 40, 0.1)).toBeGreaterThan(0)
    expect(steerKeeperX(0, -40, 0.1)).toBeLessThan(0)
  })

  test('nunca teleporta: o passo é limitado pela velocidade', () => {
    // Arrange: alvo muito longe, tempo curtíssimo
    const dt = 0.05

    // Act
    const moved = steerKeeperX(0, 999, dt)

    // Assert
    expect(moved).toBeCloseTo(KEEPER_MAX_SPEED * dt, 5)
  })

  test('chega no alvo sem passar dele', () => {
    // Arrange: alvo perto o bastante para alcançar neste passo
    const alvo = 3

    // Act
    const moved = steerKeeperX(0, alvo, 1)

    // Assert
    expect(moved).toBe(alvo)
  })

  test('respeita o limite físico do gol dos dois lados', () => {
    expect(steerKeeperX(0, 500, 10)).toBeLessThanOrEqual(44)
    expect(steerKeeperX(0, -500, 10)).toBeGreaterThanOrEqual(-44)
  })

  test('parado sem alvo novo não se mexe sozinho', () => {
    expect(steerKeeperX(12, 12, 0.2)).toBe(12)
  })

  test('atravessar o gol inteiro exige tempo — não dá em um quadro', () => {
    // Arrange: de um poste ao outro são 88 unidades
    const umQuadro = 1 / 60

    // Act
    const depoisDeUmQuadro = steerKeeperX(-44, 44, umQuadro)

    // Assert: longe de chegar do outro lado
    expect(depoisDeUmQuadro).toBeLessThan(0)
  })

  test('o tempo para cruzar o gol é compatível com o voo da bola', () => {
    // Arrange: quanto tempo leva de um poste ao outro
    const travessia = 88 / KEEPER_MAX_SPEED

    // Assert: mais que meio segundo — obriga a ler o chute, não reagir no fim
    expect(travessia).toBeGreaterThan(0.5)
    expect(travessia).toBeLessThan(1.6)
  })
})
