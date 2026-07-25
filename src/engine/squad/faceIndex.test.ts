import { describe, expect, test } from 'vitest'
import { faceIndexFor } from './faceIndex'

const POOL = 20

describe('faceIndexFor', () => {
  test('o mesmo jogador devolve sempre o mesmo rosto', () => {
    // Arrange
    const id = 'corinthians-3'

    // Act
    const first = faceIndexFor(id, POOL)
    const second = faceIndexFor(id, POOL)

    // Assert: abrir a carta de novo não pode trocar a cara do jogador
    expect(first).toBe(second)
    expect(first).not.toBeNull()
  })

  test('o rosto sobrevive a uma transferência (id não muda de clube)', () => {
    // Arrange: contratado guarda o id original em signings
    const id = 'mkt-4821-3-7'

    // Act + Assert
    expect(faceIndexFor(id, POOL)).toBe(faceIndexFor(id, POOL))
  })

  test('sempre cai dentro do banco de retratos', () => {
    const ids = Array.from({ length: 500 }, (_, index) => `flamengo-${index}`)
    for (const id of ids) {
      const index = faceIndexFor(id, POOL)
      expect(index).not.toBeNull()
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(POOL)
    }
  })

  test('jogadores diferentes espalham pelo banco (sem todo mundo com a mesma cara)', () => {
    // Arrange: um elenco inteiro de ids vizinhos — o caso que mais tende a colidir
    const ids = Array.from({ length: 18 }, (_, index) => `corinthians-${index}`)

    // Act
    const used = new Set(ids.map((id) => faceIndexFor(id, POOL)))

    // Assert: pelo menos metade do elenco com rostos distintos
    expect(used.size).toBeGreaterThanOrEqual(9)
  })

  test('ids parecidos não caem no mesmo rosto', () => {
    expect(faceIndexFor('santos-1', POOL)).not.toBe(faceIndexFor('santos-2', POOL))
    expect(faceIndexFor('santos-1', POOL)).not.toBe(faceIndexFor('santos-1-g1', POOL))
  })

  test('banco vazio não quebra a carta', () => {
    expect(faceIndexFor('corinthians-3', 0)).toBeNull()
    expect(faceIndexFor('corinthians-3', -1)).toBeNull()
    expect(faceIndexFor('corinthians-3', 1.5)).toBeNull()
  })

  test('banco com um retrato só sempre devolve ele', () => {
    expect(faceIndexFor('corinthians-3', 1)).toBe(0)
    expect(faceIndexFor('outro-9', 1)).toBe(0)
  })

  test('crescer o banco não é obrigado a manter os rostos antigos', () => {
    // Documenta o trade-off: adicionar retratos remapeia quem já existia.
    // É aceitável porque nada disso é gravado no save — só muda a foto.
    const before = faceIndexFor('corinthians-3', 20)
    const after = faceIndexFor('corinthians-3', 27)
    expect(typeof before).toBe('number')
    expect(typeof after).toBe('number')
  })
})
