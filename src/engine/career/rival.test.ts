import { describe, expect, test } from 'vitest'
import { createRival, rivalRoundGoals, rivalTaunt } from './rival'

const CLUBS = ['clube-a', 'clube-b', 'clube-c', 'clube-d']

describe('createRival', () => {
  test('é determinístico para a mesma seed', () => {
    const a = createRival(42, CLUBS)
    const b = createRival(42, CLUBS)
    expect(a).toEqual(b)
  })

  test('gera nome, clube da lista e contadores zerados', () => {
    const rival = createRival(7, CLUBS)
    expect(rival.name.length).toBeGreaterThan(0)
    expect(CLUBS).toContain(rival.clubId)
    expect(rival.seasonGoals).toBe(0)
    expect(rival.careerGoals).toBe(0)
    expect(rival.mySeasonGoals).toBe(0)
  })

  test('seeds diferentes geram rivais diferentes', () => {
    const names = new Set(Array.from({ length: 20 }, (_, i) => createRival(i * 131, CLUBS).name))
    expect(names.size).toBeGreaterThan(5)
  })
})

describe('rivalRoundGoals', () => {
  test('é determinístico e fica entre 0 e 3', () => {
    for (let round = 0; round < 13; round++) {
      const goals = rivalRoundGoals(999, round)
      expect(goals).toBe(rivalRoundGoals(999, round))
      expect(goals).toBeGreaterThanOrEqual(0)
      expect(goals).toBeLessThanOrEqual(3)
    }
  })

  test('numa temporada longa o rival marca, mas não em todo jogo', () => {
    const totals = Array.from({ length: 100 }, (_, round) => rivalRoundGoals(31337, round))
    const sum = totals.reduce((acc, goals) => acc + goals, 0)
    expect(sum).toBeGreaterThan(30)
    expect(sum).toBeLessThan(200)
    expect(totals.some((goals) => goals === 0)).toBe(true)
  })
})

describe('rivalTaunt', () => {
  test('provoca quando está na frente e respeita quando está atrás', () => {
    const rival = { ...createRival(1, CLUBS), name: 'Nêmesis' }
    const ahead = rivalTaunt({ ...rival, seasonGoals: 10, mySeasonGoals: 2 })
    const behind = rivalTaunt({ ...rival, seasonGoals: 1, mySeasonGoals: 8 })
    const tied = rivalTaunt({ ...rival, seasonGoals: 4, mySeasonGoals: 4 })
    expect(ahead).toContain('Nêmesis')
    expect(behind).toContain('Nêmesis')
    expect(new Set([ahead, behind, tied]).size).toBe(3)
  })
})
