import { describe, expect, test } from 'vitest'
import { clubById } from '../../data/clubs'
import { PEAK_AGE, DECLINE_AGE } from './aging'
import { squadPlayersFor, userAsSquadPlayer } from './players'
import type { PlayerAttributes } from '../career/attributes'

const CLUB = clubById('leoes-capital')!
const MAXED: PlayerAttributes = { finalizacao: 10, passe: 9, defesa: 9, cobranca: 9 }
const NOVATO: PlayerAttributes = { finalizacao: 1, passe: 1, defesa: 1, cobranca: 1 }

/** Você no elenco do clube naquele ano de carreira, com a sua idade. */
const meAt = (age: number, careerYear: number, attrs: PlayerAttributes = MAXED) => {
  const base = squadPlayersFor(CLUB, careerYear).find((p) => p.position === 'ATA')!
  return userAsSquadPlayer(base, 'Mueller', attrs, 'ATA', age)
}

describe('seu overall segue a SUA carreira', () => {
  test('não cai enquanto você é jovem, por mais anos que a carreira tenha', () => {
    // era o bug: aos 26 o overall caía porque o jogador do clube tinha 33
    const aos22 = meAt(22, 5).overall
    const aos26 = meAt(26, 9).overall
    expect(aos26).toBeGreaterThanOrEqual(aos22)
  })

  test('o físico não depende de qual jogador do clube ocupa a vaga', () => {
    // Arrange: mesma idade sua, elencos de anos bem diferentes
    const cedo = meAt(24, 1)
    const tarde = meAt(24, 12)

    // Assert
    expect(tarde.attrs.pac).toBe(cedo.attrs.pac)
    expect(tarde.attrs.dri).toBe(cedo.attrs.dri)
    expect(tarde.attrs.fis).toBe(cedo.attrs.fis)
  })

  test('cresce ano a ano até o pico', () => {
    let anterior = 0
    for (let age = 17; age <= PEAK_AGE; age++) {
      const atual = meAt(age, 1).attrs.pac
      expect(atual).toBeGreaterThanOrEqual(anterior)
      anterior = atual
    }
  })

  test('só começa a cair depois dos 32 — aí sim faz sentido', () => {
    expect(meAt(DECLINE_AGE + 4, 1).attrs.pac).toBeLessThan(meAt(PEAK_AGE, 1).attrs.pac)
  })

  test('treinar continua sendo o que mais pesa', () => {
    expect(meAt(26, 9, MAXED).overall).toBeGreaterThan(meAt(26, 9, NOVATO).overall + 15)
  })

  test('um novato de 17 anos não começa com físico de titular no auge', () => {
    expect(meAt(17, 1, NOVATO).overall).toBeLessThan(meAt(PEAK_AGE, 1, NOVATO).overall)
  })
})
