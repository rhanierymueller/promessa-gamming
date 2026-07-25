import { describe, expect, test } from 'vitest'
import { beginRound, createDefenseStage, steerDefenseByKeys, tick } from './stage'

const untilPhase = (s: ReturnType<typeof beginRound>) => {
  let cur = s
  for (let i = 0; i < 400; i++) {
    const [next] = tick(cur, 1 / 60)
    if (next.phase !== cur.phase) return next
    cur = next
  }
  return cur
}

describe('defesa pelo teclado', () => {
  const flying = () => untilPhase(untilPhase(beginRound(createDefenseStage(42, 0.5))))

  test('D manda o goleiro para a direita', () => {
    const s = steerDefenseByKeys(flying(), 1, false)
    expect(s.keeperTargetX).toBeGreaterThan(0)
  })

  test('A manda para a esquerda', () => {
    const s = steerDefenseByKeys(flying(), -1, false)
    expect(s.keeperTargetX).toBeLessThan(0)
  })

  test('soltar as teclas para onde está, sem voltar ao centro', () => {
    let s = steerDefenseByKeys(flying(), 1, false)
    for (let i = 0; i < 12; i++) [s] = tick(s, 1 / 60)
    const ondeParou = s.keeperX
    expect(ondeParou).toBeGreaterThan(0)
    const solto = steerDefenseByKeys(s, 0, false)
    expect(solto.keeperTargetX).toBe(ondeParou)
  })

  test('espaço marca o mergulho como alto; D + espaço vai alto para a direita', () => {
    expect(steerDefenseByKeys(flying(), 0, true).diveHigh).toBe(true)
    const dirEAlto = steerDefenseByKeys(flying(), 1, true)
    expect(dirEAlto.diveHigh).toBe(true)
    expect(dirEAlto.keeperTargetX).toBeGreaterThan(0)
  })

  test('o goleiro não teleporta: leva tempo até o poste', () => {
    let s = steerDefenseByKeys(flying(), 1, false)
    const [umQuadro] = tick(s, 1 / 60)
    expect(umQuadro.keeperX).toBeLessThan(44)
  })
})
