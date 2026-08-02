import { describe, expect, test } from 'vitest'
import { createSave, startNewSeason, withCopaBrasilState, type PlayerSave } from './save'
import { advanceCopaBrasil, copaBrasilOpponentId } from '../engine/copaBrasil/copaBrasil'
import { isCopaBrasilRunning } from '../engine/copaBrasil/types'
import { createRng } from '../engine/rng'
import { seasonSchedule } from '../engine/career/schedule'

const MEU = 'leoes-capital'
const base = (): PlayerSave => createSave({ playerName: 'Tuca', clubId: MEU })!

/** Ganha a Copa inteira pelo save, como o jogo faria a cada partida. */
const vencerACopa = (save: PlayerSave): PlayerSave => {
  let current = save
  let rng = createRng(3)
  let guard = 0
  while (current.copaBrasil && isCopaBrasilRunning(current.copaBrasil.stage) && guard++ < 40) {
    const advanced = advanceCopaBrasil(current.copaBrasil, 3, 0, rng, true)
    rng = advanced.next
    current = withCopaBrasilState(current, advanced.value.state)
  }
  return current
}

describe('Copa do Brasil na carreira', () => {
  test('toda carreira nova já começa na Copa', () => {
    // Arrange + Act
    const save = base()

    // Assert
    expect(save.copaBrasil).not.toBeNull()
    expect(save.copaBrasil!.bracket).toContain(MEU)
    expect(copaBrasilOpponentId(save.copaBrasil!)).not.toBeNull()
  })

  test('ganhar a Copa põe a taça na estante e o prêmio no caixa', () => {
    // Arrange
    const save = base()

    // Act
    const campeao = vencerACopa(save)

    // Assert
    expect(campeao.copaBrasil!.championId).toBe(MEU)
    expect(campeao.trophies.some((trophy) => trophy.kind === 'copa-brasil')).toBe(true)
    expect(campeao.budget).toBeGreaterThan(save.budget)
  })

  test('a taça entra uma vez só, mesmo reaplicando o estado', () => {
    // Arrange
    const campeao = vencerACopa(base())

    // Act: o mesmo estado aplicado de novo
    const outraVez = withCopaBrasilState(campeao, campeao.copaBrasil!)

    // Assert
    expect(outraVez.trophies.filter((trophy) => trophy.kind === 'copa-brasil')).toHaveLength(1)
    expect(outraVez.budget).toBe(campeao.budget)
  })

  test('cair na Copa não dá taça nenhuma', () => {
    // Arrange + Act: perde ida e volta
    let save = base()
    for (let i = 0; i < 2; i++) {
      const advanced = advanceCopaBrasil(save.copaBrasil!, 0, 3, createRng(i), false)
      save = withCopaBrasilState(save, advanced.value.state)
    }

    // Assert
    expect(save.copaBrasil!.stage).toBe('eliminated')
    expect(save.trophies.some((trophy) => trophy.kind === 'copa-brasil')).toBe(false)
  })

  test('a temporada nova traz uma Copa nova, com sorteio diferente', () => {
    // Arrange
    const save = vencerACopa(base())

    // Act
    const proxima = startNewSeason(save, () => 0.5)

    // Assert
    expect(proxima.copaBrasil!.stage).toBe('r32')
    expect(proxima.copaBrasil!.year).toBe(2)
    expect(proxima.copaBrasil!.bracket).toContain(MEU)
    expect(proxima.copaBrasil!.bracket).not.toEqual(save.copaBrasil!.bracket)
  })

  test('eliminado da Copa, a agenda para de marcar jogos dela', () => {
    // Arrange: cai nos 16 avos
    let save = base()
    for (let i = 0; i < 2; i++) {
      const advanced = advanceCopaBrasil(save.copaBrasil!, 0, 3, createRng(i), false)
      save = withCopaBrasilState(save, advanced.value.state)
    }

    // Act
    const naAgenda = seasonSchedule(save).filter((match) => match.competition === 'copa-brasil')

    // Assert: só os dois que ele disputou
    expect(naAgenda).toHaveLength(2)
    expect(naAgenda.every((match) => match.isPlayed)).toBe(true)
  })
})
