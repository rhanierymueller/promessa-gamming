import { describe, expect, test } from 'vitest'
import { clubById } from '../../data/clubs'
import { squadPlayersFor } from '../squad/players'
import { marketPoolFor, squadWithSignings, type Signing } from './market'

const CLUB = clubById('leoes-capital')!

/** Uma contratação de verdade, tirada do mercado. */
const signingOf = (position: string, boughtYear: number): Signing => {
  const player = marketPoolFor(123, boughtYear).find((p) => p.position === position)!
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    altPositions: player.altPositions,
    nationality: player.nationality,
    baseAge: player.age,
    boughtYear,
    potential: player.potential,
    peakAttrs: player.peakAttrs,
    price: player.price,
  }
}

const indexOfSigning = (year: number, signings: readonly Signing[], id: string): number =>
  squadWithSignings(squadPlayersFor(CLUB, year), signings, year).findIndex((p) => p.id === id)

describe('vaga da contratação no elenco', () => {
  test('a vaga é a mesma em TODO clube e TODA posição, ano após ano', () => {
    // Arrange: varre clubes e posições — o bug só aparecia em algumas combinações
    const instaveis: string[] = []

    // Act
    for (const clubId of ['leoes-capital', 'verdejante', 'real-vila']) {
      const club = clubById(clubId)!
      for (const position of ['GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MEI', 'PON', 'ATA']) {
        const pool = marketPoolFor(123, 2).filter((p) => p.position === position)
        if (pool.length === 0) continue
        const signing = signingOf(position, 2)
        const vagas = [2, 3, 4, 5, 6]
          .map((year) =>
            squadWithSignings(squadPlayersFor(club, year), [signing], year).findIndex(
              (p) => p.id === signing.id,
            ),
          )
          // -1 é aposentadoria, não instabilidade de vaga
          .filter((slot) => slot >= 0)
        if (new Set(vagas).size > 1) instaveis.push(`${clubId}/${position}: ${vagas.join(',')}`)
      }
    }

    // Assert
    expect(instaveis).toEqual([])
  })

  test('a aposentadoria de um reforço não muda a vaga dos outros', () => {
    // Arrange: um veterano que vai pendurar as chuteiras e um jovem
    const velho: Signing = { ...signingOf('ZAG', 2), id: 'mkt-velho', baseAge: 36 }
    const novo: Signing = { ...signingOf('ATA', 2), id: 'mkt-novo', baseAge: 22 }

    // Act
    const antes = squadWithSignings(squadPlayersFor(CLUB, 2), [velho, novo], 2)
    const depois = squadWithSignings(squadPlayersFor(CLUB, 8), [velho, novo], 8)

    // Assert: o velho já saiu, o jovem seguiu na mesma vaga
    expect(antes.findIndex((p) => p.id === 'mkt-velho')).toBeGreaterThanOrEqual(0)
    expect(depois.findIndex((p) => p.id === 'mkt-velho')).toBe(-1)
    expect(depois.findIndex((p) => p.id === 'mkt-novo')).toBe(
      antes.findIndex((p) => p.id === 'mkt-novo'),
    )
  })

  test('o contratado fica na MESMA vaga temporada após temporada', () => {
    /*
     * Era o bug: a vaga saía do "mais fraco da posição", e como todo mundo
     * envelhece entre uma temporada e outra, o mais fraco mudava. O índice do
     * contratado pulava e a escalação — que guarda índices — passava a apontar
     * para outro jogador, tirando o reforço do time titular.
     */
    const signings = [signingOf('ATA', 2)]
    const vagas = [2, 3, 4, 5, 6, 7].map((year) => indexOfSigning(year, signings, signings[0].id))

    expect(new Set(vagas).size).toBe(1)
    expect(vagas[0]).toBeGreaterThanOrEqual(0)
  })

  test('vários reforços não disputam a mesma vaga', () => {
    const signings = [signingOf('ATA', 2), signingOf('ZAG', 2), signingOf('MEI', 2)]
    const squad = squadWithSignings(squadPlayersFor(CLUB, 4), signings, 4)

    for (const signing of signings) {
      expect(squad.filter((p) => p.id === signing.id)).toHaveLength(1)
    }
  })

  test('dois reforços da mesma posição ocupam vagas diferentes', () => {
    const primeiro = signingOf('ATA', 2)
    const pool = marketPoolFor(123, 2).filter((p) => p.position === 'ATA')
    const segundo: Signing = { ...primeiro, id: pool[1].id, name: pool[1].name }
    const squad = squadWithSignings(squadPlayersFor(CLUB, 5), [primeiro, segundo], 5)

    expect(squad.findIndex((p) => p.id === primeiro.id)).not.toBe(
      squad.findIndex((p) => p.id === segundo.id),
    )
    expect(squad.findIndex((p) => p.id === segundo.id)).toBeGreaterThanOrEqual(0)
  })

  test('o elenco continua com 18 jogadores', () => {
    const signings = [signingOf('ATA', 2), signingOf('ZAG', 2)]
    expect(squadWithSignings(squadPlayersFor(CLUB, 4), signings, 4)).toHaveLength(18)
  })
})
