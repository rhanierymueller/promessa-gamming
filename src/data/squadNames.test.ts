import { describe, expect, test } from 'vitest'
import { squadFor } from './squadNames'

describe('squadFor', () => {
  test('gera a quantidade pedida de apelidos únicos', () => {
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
})
