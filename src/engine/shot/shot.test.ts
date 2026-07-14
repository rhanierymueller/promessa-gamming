import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { DEFAULT_SHOT_CONFIG as CFG } from './config'
import { createFlight } from './flight'
import { resolveOutcome, simulateShot } from './shot'
import type { KeeperPlan, ShotCommand, Vec2 } from './types'

const makeFlight = (overrides: Partial<ShotCommand> = {}) =>
  createFlight(
    { power: 0.7, targetX: 60, targetHeight: 10, curve: 0, ...overrides },
    90,
    CFG,
  )

const farKeeper: KeeperPlan = { reactT: 0.3, diveX: 130 }
const skill = 0.22

describe('resolveOutcome', () => {
  test('bola ao lado do gol é pra fora', () => {
    // Arrange
    const flight = makeFlight({ targetX: 12 })

    // Act & Assert
    expect(resolveOutcome(flight, farKeeper, skill, CFG).kind).toBe('miss')
  })

  test('bola por cima do travessão é pra fora', () => {
    // Arrange
    const flight = makeFlight({ targetX: 90, targetHeight: CFG.goal.barHeight + 6 })

    // Act & Assert
    expect(resolveOutcome(flight, farKeeper, skill, CFG).kind).toBe('miss')
  })

  test('bola na altura do travessão é trave', () => {
    // Arrange
    const flight = makeFlight({ targetX: 90, targetHeight: CFG.goal.barHeight })

    // Act & Assert
    expect(resolveOutcome(flight, farKeeper, skill, CFG).kind).toBe('post')
  })

  test('bola rente ao poste é trave', () => {
    // Arrange
    const flight = makeFlight({ targetX: CFG.goal.left })

    // Act & Assert
    expect(resolveOutcome(flight, farKeeper, skill, CFG).kind).toBe('post')
  })

  test('bola no canto com goleiro no outro lado é gol', () => {
    // Arrange
    const flight = makeFlight({ targetX: 60 })

    // Act & Assert
    expect(resolveOutcome(flight, farKeeper, skill, CFG).kind).toBe('goal')
  })

  test('goleiro em cima da bola defende', () => {
    // Arrange
    const flight = makeFlight({ targetX: 60 })
    const onTheSpot: KeeperPlan = { reactT: 0.3, diveX: 60 }

    // Act & Assert
    expect(resolveOutcome(flight, onTheSpot, skill, CFG).kind).toBe('save')
  })

  test('bola no ângulo passa onde a baixa seria defendida', () => {
    // Arrange: mesma distância da luva, alturas diferentes
    const keeper: KeeperPlan = { reactT: 0.3, diveX: 68 }
    const lowBall = makeFlight({ targetX: 60, targetHeight: 10 })
    const topCorner = makeFlight({ targetX: 60, targetHeight: CFG.highBallHeight + 4 })
    const strongSkill = 0.5

    // Act & Assert
    expect(resolveOutcome(lowBall, keeper, strongSkill, CFG).kind).toBe('save')
    expect(resolveOutcome(topCorner, keeper, strongSkill, CFG).kind).toBe('goal')
  })

  test('goleiro DE PÉ no meio defende com o corpo a bola no meio, mesmo forte', () => {
    // Arrange: luva não alcançaria (|diveX - finalX| > reach), mas o corpo está na frente
    const flight = makeFlight({ targetX: 98, power: 0.8, targetHeight: 12 })
    const standing: KeeperPlan = { reactT: 0.3, diveX: 81 }

    // Act & Assert
    expect(resolveOutcome(flight, standing, skill, CFG).kind).toBe('save')
  })

  test('bola na altura do peito/cabeça no meio é AGARRADA pelo goleiro parado', () => {
    // Arrange: meia altura central — qualquer goleiro em pé agarra
    const flight = makeFlight({ targetX: 95, power: 0.8, targetHeight: 30 })
    const standing: KeeperPlan = { reactT: 0.3, diveX: 84 }

    // Act & Assert
    expect(resolveOutcome(flight, standing, skill, CFG).kind).toBe('save')
  })

  test('só a cavadinha PERFEITA no ângulo superior do meio encobre o goleiro parado', () => {
    // Arrange: acima do braço esticado, abaixo do travessão
    const flight = makeFlight({ targetX: 95, power: 0.8, targetHeight: CFG.standingCatchHeight + 3 })
    const standing: KeeperPlan = { reactT: 0.3, diveX: 84 }

    // Act & Assert
    expect(resolveOutcome(flight, standing, skill, CFG).kind).toBe('goal')
  })

  test('goleiro que mergulhou longe não defende bola no meio com o corpo', () => {
    // Arrange
    const flight = makeFlight({ targetX: 92, power: 0.8, targetHeight: 12 })

    // Act & Assert
    expect(resolveOutcome(flight, farKeeper, skill, CFG).kind).toBe('goal')
  })

  test('chute fraco no meio é presa fácil mesmo com goleiro caído no canto', () => {
    // Arrange
    const flight = makeFlight({ targetX: 92, power: 0.3 })

    // Act & Assert
    expect(resolveOutcome(flight, farKeeper, skill, CFG).kind).toBe('save')
  })

  test('gol com curva acentuada é golaço; gol trivial não é', () => {
    // Arrange
    const banana = makeFlight({ targetX: 60, curve: CFG.golacoCurve + 3 })
    const plain = makeFlight({ targetX: 60 })

    // Act
    const bananaOutcome = resolveOutcome(banana, { reactT: 0.3, diveX: 120 }, skill, CFG)
    const plainOutcome = resolveOutcome(plain, farKeeper, skill, CFG)

    // Assert
    expect(bananaOutcome.kind).toBe('goal')
    expect(bananaOutcome.isGolaco).toBe(true)
    expect(plainOutcome.isGolaco).toBe(false)
  })
})

describe('simulateShot', () => {
  const validDrag: Vec2[] = [
    { x: 90, y: 300 },
    { x: 78, y: 265 },
    { x: 66, y: 230 },
  ]

  test('gesto inválido retorna null sem consumir aleatoriedade', () => {
    // Arrange
    const downward: Vec2[] = [{ x: 90, y: 240 }, { x: 90, y: 270 }, { x: 90, y: 300 }]
    const rng = createRng(3)

    // Act
    const result = simulateShot(downward, 90, 0, rng, CFG)

    // Assert
    expect(result.value).toBeNull()
    expect(result.next).toEqual(rng)
  })

  test('mesmo gesto e mesma seed produzem exatamente o mesmo lance', () => {
    // Arrange
    const seed = 123

    // Act
    const first = simulateShot(validDrag, 90, 4, createRng(seed), CFG)
    const second = simulateShot(validDrag, 90, 4, createRng(seed), CFG)

    // Assert
    expect(first).toEqual(second)
  })

  test('produz um lance completo com desfecho válido', () => {
    // Act
    const { value } = simulateShot(validDrag, 90, 0, createRng(8), CFG)

    // Assert
    expect(value).not.toBeNull()
    expect(['goal', 'save', 'post', 'miss']).toContain(value!.outcome.kind)
    expect(value!.flight.startX).toBe(90)
    expect(value!.keeper.reactT).toBeGreaterThanOrEqual(CFG.reactTMin)
  })

  test('o goleiro fica mais rápido conforme a rodada avança', () => {
    // Arrange
    const seed = 55

    // Act
    const early = simulateShot(validDrag, 90, 0, createRng(seed), CFG)
    const late = simulateShot(validDrag, 90, 9, createRng(seed), CFG)

    // Assert
    expect(late.value!.keeper.reactT).toBeLessThan(early.value!.keeper.reactT)
  })
})
