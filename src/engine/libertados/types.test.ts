import { describe, expect, test } from 'vitest'
import {
  groupLetter,
  isKnockoutStage,
  isLibertadosRunning,
  libertadosMatchIndex,
  MATCHES_PER_EDITION,
} from './types'

describe('tipos e constantes da Copa Libertados', () => {
  test('groupLetter numera de A a H', () => {
    expect(groupLetter(0)).toBe('A')
    expect(groupLetter(7)).toBe('H')
  })

  test('isKnockoutStage separa mata-mata de grupos e estados finais', () => {
    expect(isKnockoutStage('r16')).toBe(true)
    expect(isKnockoutStage('final')).toBe(true)
    expect(isKnockoutStage('groups')).toBe(false)
    expect(isKnockoutStage('champion')).toBe(false)
  })

  test('isLibertadosRunning cobre grupos e todo o mata-mata', () => {
    expect(isLibertadosRunning('groups')).toBe(true)
    expect(isLibertadosRunning('quarter')).toBe(true)
    expect(isLibertadosRunning('champion')).toBe(false)
    expect(isLibertadosRunning('eliminated')).toBe(false)
  })

  test('os 14 jogos da edição têm índice único e em ordem', () => {
    const indices = [
      ...[0, 1, 2, 3, 4, 5].map((round) => libertadosMatchIndex('groups', round)),
      ...(['r16', 'quarter', 'semi', 'final'] as const).flatMap((stage) =>
        [0, 1].map((round) => libertadosMatchIndex(stage, round)),
      ),
    ]
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    expect(indices.length).toBe(MATCHES_PER_EDITION)
  })
})
