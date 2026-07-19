import { describe, expect, test } from 'vitest'
import { fieldName, squadFor } from './squadNames'

describe('squadFor', () => {
  test('gera a quantidade pedida de nomes únicos', () => {
    // Act
    const squad = squadFor('real-vila-42', 11)

    // Assert
    expect(squad).toHaveLength(11)
    expect(new Set(squad).size).toBe(11)
  })

  test('é determinístico: mesma semente, mesmo elenco', () => {
    expect(squadFor('real-vila-42', 11)).toEqual(squadFor('real-vila-42', 11))
  })

  test('sementes diferentes escalam elencos diferentes', () => {
    expect(squadFor('real-vila-42', 11)).not.toEqual(squadFor('mare-rubra-42', 11))
  })

  test('nomes de campo (primeiro nome) não se repetem no elenco', () => {
    // Act
    const squad = squadFor('pampa-77', 11)

    // Assert
    const fieldNames = squad.map(fieldName)
    expect(new Set(fieldNames).size).toBe(fieldNames.length)
  })

  test('mistura nomes completos com apelidos de boleiro', () => {
    // Act: elenco grande garante os dois formatos
    const squad = squadFor('minuano-9', 20)

    // Assert
    expect(squad.some((name) => name.includes(' '))).toBe(true)
    expect(squad.some((name) => !name.includes(' '))).toBe(true)
  })
})
