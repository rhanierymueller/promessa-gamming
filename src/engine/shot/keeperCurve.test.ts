import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { DEFAULT_SHOT_CONFIG, goalCenter, keeperSkillForShot } from './config'
import { createFlight } from './flight'
import { planKeeper } from './keeper'
import { resolveOutcome } from './shot'

/**
 * A regra de ouro do goleiro: NADA é 100%. Chute bem colocado tem que ser
 * mais difícil contra goleiro melhor, mas nunca impossível — e goleiro fraco
 * não pode virar muro. Antes disso o resultado era um degrau geométrico:
 * ou 100% gol, ou ~0%, dependendo se o mergulho alcançava a bola.
 */

const CFG = DEFAULT_SHOT_CONFIG
const N = 4000
const center = goalCenter(CFG)
const halfGoal = (CFG.goal.right - CFG.goal.left) / 2 - CFG.goal.postWidth - 2

/** Taxa de gol de um chute mirado a `frac` do canto, contra goleiro `skill`. */
const goalRate = (skill: number, frac: number, power = 0.9): number => {
  let goals = 0
  for (let i = 0; i < N; i++) {
    const rng = createRng(i * 2654435761)
    const offset = halfGoal * frac
    const targetX = center + (i % 2 === 0 ? -offset : offset)
    const flight = createFlight({ power, targetX, targetHeight: 24, curve: 0 }, center, CFG)
    const plan = planKeeper(flight, skill, rng, CFG)
    if (resolveOutcome(flight, plan.value, skill, CFG, 0.5, plan.next).kind === 'goal') goals++
  }
  return (100 * goals) / N
}

describe('goleiro: curva de dificuldade, não degrau', () => {
  test('nem o canto perfeito é gol garantido contra goleiro de elite', () => {
    // Arrange + Act
    const elite = goalRate(0.95, 0.95)

    // Assert: difícil defender, mas o goleiro existe
    expect(elite).toBeLessThan(97)
  })

  test('nem o goleiro de elite é intransponível', () => {
    expect(goalRate(0.95, 0.95)).toBeGreaterThan(30)
  })

  test('goleiro fraco sofre MAIS que o forte, no mesmo chute', () => {
    // Arrange: mesma mira, só muda a habilidade
    const fraco = goalRate(0.4, 0.78)
    const forte = goalRate(0.8, 0.78)

    // Assert
    expect(fraco).toBeGreaterThan(forte)
  })

  test('a dificuldade cresce de forma GRADUAL com a habilidade (sem degrau)', () => {
    // Arrange
    const skills = [0.35, 0.5, 0.65, 0.8, 0.95]

    // Act
    const rates = skills.map((skill) => goalRate(skill, 0.85))

    // Assert: sempre caindo, e nenhum salto brutal entre vizinhos
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThanOrEqual(rates[i - 1] + 2)
      expect(Math.abs(rates[i] - rates[i - 1])).toBeLessThan(55)
    }
  })

  test('chute no meio do gol é presa fácil, em qualquer nível', () => {
    for (const skill of [0.4, 0.7, 0.95]) {
      expect(goalRate(skill, 0.08, 0.5)).toBeLessThan(25)
    }
  })

  test('goleiro de Série D é mais furado que o de Copa no mesmo chute', () => {
    // Arrange: as qualidades reais usadas em jogo
    const serieD = keeperSkillForShot(CFG, 0, 0.58)
    const copa = keeperSkillForShot(CFG, 0, 0.8)

    // Act + Assert
    expect(goalRate(serieD, 0.8)).toBeGreaterThan(goalRate(copa, 0.8))
  })

  test('é determinístico: mesmo chute e mesma semente, mesmo resultado', () => {
    const rng = createRng(4242)
    const flight = createFlight({ power: 0.9, targetX: center + 40, targetHeight: 24, curve: 0 }, center, CFG)
    const plan = planKeeper(flight, 0.7, rng, CFG)
    const a = resolveOutcome(flight, plan.value, 0.7, CFG, 0.5, plan.next)
    const b = resolveOutcome(flight, plan.value, 0.7, CFG, 0.5, plan.next)
    expect(a).toEqual(b)
  })
})
