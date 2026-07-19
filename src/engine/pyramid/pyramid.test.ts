import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import {
  applyPromotionRelegation,
  DIVISION_TEAMS,
  divisionOf,
  initialDivisions,
  simulateDivisionOrder,
} from './pyramid'

describe('initialDivisions', () => {
  test('monta 4 divisões de 14 clubes, sem repetição', () => {
    // Act
    const divisions = initialDivisions()

    // Assert
    expect(divisions).toHaveLength(4)
    for (const division of divisions) expect(division).toHaveLength(DIVISION_TEAMS)
    const all = divisions.flat()
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('applyPromotionRelegation', () => {
  const divisions = initialDivisions()

  test('campeão da Série D em 1º SOBE para a C', () => {
    // Arrange: jogador campeão da D
    const playerClub = divisions[3][0]
    const order = [...divisions[3]]

    // Act
    const { value } = applyPromotionRelegation(divisions, 3, order, playerClub, createRng(7))

    // Assert
    expect(value.movement).toBe('up')
    expect(divisionOf(value.divisions, playerClub)).toBe(2)
  })

  test('lanterna da Série B em último CAI para a C', () => {
    // Arrange: jogador em último da B
    const order = [...divisions[1]]
    const playerClub = order[order.length - 1]

    // Act
    const { value } = applyPromotionRelegation(divisions, 1, order, playerClub, createRng(7))

    // Assert
    expect(value.movement).toBe('down')
    expect(divisionOf(value.divisions, playerClub)).toBe(2)
  })

  test('meio de tabela permanece; divisões continuam com 14 cada', () => {
    // Arrange: jogador em 7º da C
    const order = [...divisions[2]]
    const playerClub = order[6]

    // Act
    const { value } = applyPromotionRelegation(divisions, 2, order, playerClub, createRng(7))

    // Assert
    expect(value.movement).toBe('stay')
    for (const division of value.divisions) expect(division).toHaveLength(DIVISION_TEAMS)
    const all = value.divisions.flat()
    expect(new Set(all).size).toBe(all.length)
  })

  test('Série A não tem acesso; Série D não tem queda', () => {
    // Arrange: campeão da A fica; lanterna da D fica
    const championA = divisions[0][0]
    const bottomD = divisions[3][DIVISION_TEAMS - 1]

    // Act
    const asChampionA = applyPromotionRelegation(divisions, 0, [...divisions[0]], championA, createRng(3))
    const asBottomD = applyPromotionRelegation(divisions, 3, [...divisions[3]], bottomD, createRng(3))

    // Assert
    expect(asChampionA.value.movement).toBe('stay')
    expect(asBottomD.value.movement).toBe('stay')
  })

  test('é determinístico para a mesma seed', () => {
    const order = [...divisions[3]]
    expect(applyPromotionRelegation(divisions, 3, order, order[0], createRng(9))).toEqual(
      applyPromotionRelegation(divisions, 3, order, order[0], createRng(9)),
    )
  })
})

describe('simulateDivisionOrder', () => {
  test('clubes fortes tendem a terminar na frente', () => {
    // Arrange: Série A simulada muitas vezes — 5★ deve ficar à frente de 4★ na média
    const divisions = initialDivisions()
    let topStrengthWins = 0
    for (let seed = 0; seed < 100; seed++) {
      const { value } = simulateDivisionOrder(divisions[0], createRng(seed))
      if (value.slice(0, 6).some((id) => ['leoes-capital', 'mare-rubra', 'imperial', 'atlantico'].includes(id))) {
        topStrengthWins++
      }
    }
    expect(topStrengthWins).toBeGreaterThan(80)
  })
})
