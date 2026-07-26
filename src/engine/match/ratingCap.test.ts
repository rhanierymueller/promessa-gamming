import { describe, expect, test } from 'vitest'
import { capRatingByResult, DRAW_RATING_CAP, LOSS_RATING_CAP } from './rating'

describe('teto da nota pelo resultado', () => {
  test('vitória não tem teto — nota 10 é possível', () => {
    expect(capRatingByResult(10, 3, 1)).toBe(10)
  })

  test('empate NÃO chega a 10 — era o que incomodava', () => {
    expect(capRatingByResult(10, 2, 2)).toBe(DRAW_RATING_CAP)
    expect(DRAW_RATING_CAP).toBeLessThan(10)
  })

  test('derrota tem teto ainda mais baixo', () => {
    expect(capRatingByResult(10, 0, 1)).toBe(LOSS_RATING_CAP)
    expect(LOSS_RATING_CAP).toBeLessThan(DRAW_RATING_CAP)
  })

  test('o teto não INFLA nota baixa: jogar mal segue valendo pouco', () => {
    expect(capRatingByResult(4.2, 2, 2)).toBe(4.2)
    expect(capRatingByResult(3, 0, 3)).toBe(3)
  })

  test('nota já abaixo do teto passa intacta', () => {
    expect(capRatingByResult(7.9, 1, 1)).toBe(7.9)
  })
})
