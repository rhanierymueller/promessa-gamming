import { describe, expect, test } from 'vitest'
import { CLUBS } from '../../data/clubs'
import { nationAsClub, NATIONS } from '../../data/nations'
import { RETIRE_AGE } from './aging'
import { FORMATIONS, formationIdFor } from './formation'
import {
  lineupRating,
  overallAt,
  positionFit,
  SQUAD_SIZE,
  USER_SQUAD_INDEX,
  squadPlayersFor,
  userAsSquadPlayer,
} from './players'

const strongClub = CLUBS.find((club) => club.strength === 5)!

const averageOverall = (clubs: readonly (typeof CLUBS)[number][]): number => {
  const all = clubs.flatMap((club) => squadPlayersFor(club, 1).map((p) => p.overall))
  return all.reduce((sum, value) => sum + value, 0) / all.length
}

test('qualidade escala com a divisão: A > B > C > D, e seleção acima de tudo', () => {
  // Arrange
  const byDivision = [0, 1, 2, 3].map((division) =>
    averageOverall(CLUBS.filter((club) => club.division === division)),
  )
  const brasil = nationAsClub(NATIONS.find((nation) => nation.id === 'brasil')!)
  const nationAvg = squadPlayersFor(brasil, 1).reduce((sum, p) => sum + p.overall, 0) / SQUAD_SIZE

  // Assert: cada divisão claramente melhor que a de baixo (5+ pontos de média)
  expect(byDivision[0]).toBeGreaterThan(byDivision[1] + 5)
  expect(byDivision[1]).toBeGreaterThan(byDivision[2] + 5)
  expect(byDivision[2]).toBeGreaterThan(byDivision[3] + 5)
  // seleção do Brasil acima da média da Série A
  expect(nationAvg).toBeGreaterThan(byDivision[0] + 5)
})

const weakClub = CLUBS.find((club) => club.strength === 1)!

describe('squadPlayersFor', () => {
  test('é determinístico e gera o elenco completo', () => {
    // Act
    const squad = squadPlayersFor(strongClub)

    // Assert
    expect(squad).toHaveLength(SQUAD_SIZE)
    expect(squadPlayersFor(strongClub)).toEqual(squad)
  })

  test('titulares seguem a formação DO CLUBE e o índice do usuário é atacante', () => {
    // Act
    const squad = squadPlayersFor(weakClub)
    const slots = FORMATIONS[formationIdFor(weakClub.id)].slots

    // Assert
    for (let i = 0; i < slots.length; i++) {
      expect(squad[i].position).toBe(slots[i])
    }
    expect(slots[USER_SQUAD_INDEX]).toBe('ATA')
  })

  test('clube forte tem elenco melhor que clube fraco', () => {
    // Arrange
    const average = (clubId: typeof strongClub): number => {
      const squad = squadPlayersFor(clubId)
      return squad.reduce((sum, player) => sum + player.overall, 0) / squad.length
    }

    // Act & Assert
    expect(average(strongClub)).toBeGreaterThan(average(weakClub) + 10)
  })

  test('goleiro defende: DEF é o atributo mais alto dele', () => {
    // Act
    const keeper = squadPlayersFor(strongClub)[0]

    // Assert
    expect(keeper.position).toBe('GOL')
    const { def, ...others } = keeper.attrs
    for (const value of Object.values(others)) {
      expect(def).toBeGreaterThanOrEqual(value)
    }
  })

  test('atributos e overall ficam em faixas plausíveis, idade de boleiro', () => {
    // Act
    const everyone = CLUBS.slice(0, 8).flatMap((club) => squadPlayersFor(club))

    // Assert
    for (const player of everyone) {
      expect(player.overall).toBeGreaterThanOrEqual(30)
      expect(player.overall).toBeLessThanOrEqual(92)
      expect(player.age).toBeGreaterThanOrEqual(16)
      expect(player.age).toBeLessThanOrEqual(38)
      for (const value of Object.values(player.attrs)) {
        expect(value).toBeGreaterThanOrEqual(30)
        expect(value).toBeLessThanOrEqual(92)
      }
    }
  })

  test('nomes não se repetem dentro do elenco', () => {
    // Act
    const squad = squadPlayersFor(strongClub)

    // Assert
    expect(new Set(squad.map((player) => player.name)).size).toBe(SQUAD_SIZE)
  })
})

describe('userAsSquadPlayer', () => {
  test('mapeia os atributos reais do craque para a escala FIFA', () => {
    // Arrange
    const base = squadPlayersFor(strongClub)[USER_SQUAD_INDEX]

    // Act
    const user = userAsSquadPlayer(base, 'Craque da Vila', {
      finalizacao: 10,
      passe: 3,
      cobranca: 5,
      defesa: 1,
    })

    // Assert
    expect(user.name).toBe('Craque da Vila')
    expect(user.position).toBe('ATA')
    expect(user.attrs.fin).toBe(95)
    expect(user.attrs.pas).toBe(60)
    expect(user.overall).toBeGreaterThan(0)
    /*
     * Ritmo/drible/físico NÃO herdam do jogador do clube: eles seguem a sua
     * própria curva de idade. Herdando, o seu overall caía quando aquele NPC
     * envelhecia — mesmo com você novo e treinando.
     */
    expect(user.attrs.pac).toBeGreaterThan(0)
    expect(user.age).toBe(base.age)
  })

  test('mais treino = overall maior', () => {
    // Arrange
    const base = squadPlayersFor(strongClub)[USER_SQUAD_INDEX]
    const weak = userAsSquadPlayer(base, 'X', { finalizacao: 1, passe: 1, cobranca: 1, defesa: 1 })
    const strong = userAsSquadPlayer(base, 'X', { finalizacao: 10, passe: 10, cobranca: 10, defesa: 10 })

    // Assert
    expect(strong.overall).toBeGreaterThan(weak.overall)
  })
})

describe('posições secundárias e overall por posição', () => {
  const pool = CLUBS.slice(0, 10).flatMap((club) => squadPlayersFor(club))

  test('parte do elenco tem posição secundária; goleiro nunca tem', () => {
    // Assert
    const withAlt = pool.filter((player) => player.altPositions.length > 0)
    expect(withAlt.length).toBeGreaterThan(pool.length * 0.15)
    for (const keeper of pool.filter((player) => player.position === 'GOL')) {
      expect(keeper.altPositions).toHaveLength(0)
    }
  })

  test('na posição natural o overall efetivo é o overall cheio', () => {
    // Arrange
    const player = pool[3]

    // Act & Assert
    expect(overallAt(player, player.position)).toBe(player.overall)
    expect(positionFit(player, player.position)).toBe('natural')
  })

  test('posição secundária cai pouco; improviso cai feio; gol é outra profissão', () => {
    // Arrange
    const versatile = pool.find((player) => player.altPositions.length > 0)!
    const zagueiro = pool.find((player) => player.position === 'ZAG')!

    // Act & Assert: na secundária ele rende 6 pontos a mais do que renderia improvisando
    const target = versatile.altPositions[0]
    const withoutAlt = { ...versatile, altPositions: [] as const }
    expect(positionFit(versatile, target)).toBe('secundaria')
    expect(overallAt(versatile, target)).toBe(overallAt(withoutAlt, target) + 6)
    expect(positionFit(zagueiro, 'ATA')).toBe('improvisado')
    expect(overallAt(zagueiro, 'ATA')).toBeLessThan(zagueiro.overall - 5)
    expect(overallAt(zagueiro, 'GOL')).toBeLessThan(overallAt(zagueiro, 'ATA'))
  })

  test('lineupRating: escalação certa vale mais que zagueiro no ataque', () => {
    // Arrange
    const squad = squadPlayersFor(CLUBS[0])
    const slots = FORMATIONS[formationIdFor(CLUBS[0].id)].slots
    const right = slots.map((_, index) => squad[index])
    // troca o atacante (9) por um defensor do banco (13)
    const wrong = right.map((player, index) => (index === 9 ? squad[13] : player))

    // Act & Assert
    expect(lineupRating(right, slots)).toBeGreaterThan(lineupRating(wrong, slots))
  })
})

describe('idade por temporada: evolução, declínio e aposentadoria', () => {
  const clubs = CLUBS.slice(0, 6)

  const findWithClub = (predicate: (player: ReturnType<typeof squadPlayersFor>[number]) => boolean) => {
    for (const club of clubs) {
      const squad = squadPlayersFor(club, 1)
      const index = squad.findIndex(predicate)
      if (index >= 0) return { club, index, player: squad[index] }
    }
    throw new Error('nenhum jogador encontrado para o cenário')
  }

  test('todo mundo joga entre 16 e 38 anos, em qualquer temporada', () => {
    for (const year of [1, 5, 12, 25]) {
      for (const club of clubs) {
        for (const player of squadPlayersFor(club, year)) {
          expect(player.age).toBeGreaterThanOrEqual(16)
          expect(player.age).toBeLessThanOrEqual(38)
        }
      }
    }
  })

  test('jovem evolui: no pico ele joga mais do que na base', () => {
    // Arrange
    const { club, index, player } = findWithClub((candidate) => candidate.age <= 20)
    const yearsToPeak = 27 - player.age

    // Act
    const atPeak = squadPlayersFor(club, 1 + yearsToPeak)[index]

    // Assert
    expect(atPeak.age).toBe(27)
    expect(atPeak.overall).toBeGreaterThan(player.overall)
  })

  test('depois dos 32 o overall só cai', () => {
    // Arrange
    const { club, index, player } = findWithClub(
      (candidate) => candidate.age >= 28 && candidate.age <= 31,
    )
    const yearsTo35 = 35 - player.age

    // Act
    const at35 = squadPlayersFor(club, 1 + yearsTo35)[index]

    // Assert
    expect(at35.age).toBe(35)
    expect(at35.overall).toBeLessThan(player.overall)
  })

  test('aos 38 aposenta e um garoto (regen) assume o lugar', () => {
    // Arrange
    const { club, index, player } = findWithClub((candidate) => candidate.age >= 35)
    const yearsPast = RETIRE_AGE - player.age + 2

    // Act
    const successor = squadPlayersFor(club, 1 + yearsPast)[index]

    // Assert
    expect(successor.age).toBeLessThan(25)
    expect(successor.name).not.toBe(player.name)
    expect(successor.position).toBe(player.position)
    // o regen é OUTRA pessoa: id próprio (renomeações não vazam para ele)
    expect(successor.id).not.toBe(player.id)
  })

  test('potencial existe nas três faixas e é determinístico', () => {
    // Act
    const pool = clubs.flatMap((club) => squadPlayersFor(club, 1))

    // Assert
    for (const level of ['alto', 'medio', 'baixo'] as const) {
      expect(pool.some((player) => player.potential === level)).toBe(true)
    }
    expect(squadPlayersFor(clubs[0], 9)).toEqual(squadPlayersFor(clubs[0], 9))
  })
})
