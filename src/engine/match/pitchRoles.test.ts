import { describe, expect, test } from 'vitest'
import { KEEPER_INDEXES, PITCH_SIZE, canDribble, canReceivePass, isKeeperIndex } from './pitchRoles'

describe('papéis no campo ao vivo', () => {
  test('os dois goleiros são reconhecidos — o seu e o do rival', () => {
    // o time da casa ocupa 0-10 e o visitante 11-21
    expect(KEEPER_INDEXES).toHaveLength(2)
    expect(isKeeperIndex(0)).toBe(true)
    expect(isKeeperIndex(11)).toBe(true)
  })

  test('nenhum jogador de linha é confundido com goleiro', () => {
    for (let i = 0; i < PITCH_SIZE; i++) {
      if (i === 0 || i === 11) continue
      expect(isKeeperIndex(i)).toBe(false)
    }
  })

  test('goleiro não recebe passe — nem o seu nem o do rival', () => {
    expect(canReceivePass(0)).toBe(false)
    expect(canReceivePass(11)).toBe(false)
  })

  test('jogador de linha recebe passe normalmente', () => {
    expect(canReceivePass(1)).toBe(true)
    expect(canReceivePass(12)).toBe(true)
    expect(canReceivePass(21)).toBe(true)
  })

  test('goleiro NUNCA conduz a bola — é assim que ele saía do gol', () => {
    expect(canDribble(0)).toBe(false)
    expect(canDribble(11)).toBe(false)
    expect(canDribble(9)).toBe(true)
  })
})
