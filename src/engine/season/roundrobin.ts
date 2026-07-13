import type { SeasonFixture } from './types'

/**
 * Round-robin pelo método do círculo: o primeiro time fica fixo e os demais
 * giram — todos enfrentam todos exatamente uma vez, n/2 jogos por rodada.
 */
export const roundRobinFixtures = (teamIds: readonly string[], round: number): readonly SeasonFixture[] => {
  const n = teamIds.length
  const rotating = teamIds.slice(1)
  const shift = round % rotating.length
  const rotated = [...rotating.slice(shift), ...rotating.slice(0, shift)]
  const order = [teamIds[0], ...rotated]

  const fixtures: SeasonFixture[] = []
  for (let i = 0; i < n / 2; i++) {
    const a = order[i]
    const b = order[n - 1 - i]
    // alterna o mando para variar quem "recebe" o jogo
    const homeFirst = (round + i) % 2 === 0
    fixtures.push(homeFirst ? { homeId: a, awayId: b } : { homeId: b, awayId: a })
  }
  return fixtures
}
