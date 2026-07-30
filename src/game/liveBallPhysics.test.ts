import { describe, expect, test } from 'vitest'
import {
  ballLiftFor,
  ballPointAt,
  flightDurationFor,
  motionForPass,
  travelProgressFor,
} from './liveBallPhysics'

describe('física visual da bola', () => {
  test('passe longo vira lançamento e o curto permanece rasteiro', () => {
    expect(motionForPass(0.18)).toBe('ground-pass')
    expect(motionForPass(0.4)).toBe('lofted-pass')
    expect(motionForPass(0.27, true)).toBe('lofted-pass')
  })

  test('distância aumenta a duração e urgência encurta o passe', () => {
    const short = flightDurationFor(0.12, 'ground-pass')
    const long = flightDurationFor(0.5, 'lofted-pass')
    const urgent = flightDurationFor(0.5, 'lofted-pass', true)

    expect(long).toBeGreaterThan(short)
    expect(urgent).toBeLessThan(long)
  })

  test('passe rasteiro desacelera perto do domínio', () => {
    expect(travelProgressFor(0.5, 'ground-pass')).toBeGreaterThan(0.5)
    expect(travelProgressFor(0, 'ground-pass')).toBe(0)
    expect(travelProgressFor(1, 'ground-pass')).toBe(1)
  })

  test('lançamento sobe mais que passe rasteiro e pousa no destino', () => {
    expect(ballLiftFor(0.5, 'lofted-pass', 0.5))
      .toBeGreaterThan(ballLiftFor(0.5, 'ground-pass', 0.5))
    expect(ballLiftFor(0, 'lofted-pass', 0.5)).toBe(0)
    expect(ballLiftFor(1, 'lofted-pass', 0.5)).toBe(0)
  })

  test('curva desloca o meio da trajetória sem errar os extremos', () => {
    const from = { x: 0.2, y: 0.5 }
    const to = { x: 0.8, y: 0.5 }

    expect(ballPointAt(from, to, 0, 0.04)).toEqual(from)
    expect(ballPointAt(from, to, 1, 0.04).x).toBeCloseTo(to.x)
    expect(ballPointAt(from, to, 1, 0.04).y).toBeCloseTo(to.y)
    expect(ballPointAt(from, to, 0.5, 0.04).y).toBeGreaterThan(0.5)
  })
})
