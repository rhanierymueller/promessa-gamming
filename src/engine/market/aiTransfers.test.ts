import { describe, expect, test } from 'vitest'
import { clubById, CLUBS, type Club } from '../../data/clubs'
import { SQUAD_SIZE } from '../squad/players'
import { aiTransfersFor, blockbusterOfTheYear, rivalSquadFor } from './aiTransfers'

const clubA = CLUBS.find((club) => club.division === 0)!
const clubD = CLUBS.find((club) => club.division === 3)!

describe('mercado dos rivais (contratações da IA)', () => {
  test('é determinístico: mesmas entradas, mesmas contratações', () => {
    // Arrange + Act
    const first = aiTransfersFor(clubA, 0, 5)
    const second = aiTransfersFor(clubA, 0, 5)

    // Assert
    expect(first).toEqual(second)
  })

  test('só Séries A e B contratam; C e D ficam de fora', () => {
    // Act + Assert
    expect(aiTransfersFor(clubD, 3, 10)).toHaveLength(0)
    expect(aiTransfersFor(clubA, 2, 10)).toHaveLength(0)
    const total = CLUBS.filter((c) => c.division <= 1)
      .flatMap((c) => aiTransfersFor(c, c.division, 3))
    expect(total.length).toBeGreaterThan(0)
  })

  test('contratado tem idade e overall plausíveis', () => {
    // Arrange + Act
    const transfers = CLUBS.filter((c) => c.division <= 1)
      .flatMap((c) => aiTransfersFor(c, c.division, 4))

    // Assert
    for (const transfer of transfers) {
      expect(transfer.signing.baseAge).toBeGreaterThanOrEqual(18)
      expect(transfer.signing.baseAge).toBeLessThanOrEqual(31)
      expect(transfer.overallAtSigning).toBeGreaterThanOrEqual(40)
      expect(transfer.overallAtSigning).toBeLessThanOrEqual(95)
      expect(transfer.signing.name.length).toBeGreaterThan(2)
    }
  })

  test('elenco rival mantém 18 jogadores e incorpora os contratados', () => {
    // Arrange
    const transfers = aiTransfersFor(clubA, 0, 6)
    const withAi = rivalSquadFor(clubA, 0, 6)

    // Assert: tamanho intacto; contratações ativas presentes no elenco
    expect(withAi).toHaveLength(SQUAD_SIZE)
    const activeIds = transfers
      .filter((t) => t.signing.baseAge + (6 - t.year) <= 38)
      .map((t) => t.signing.id)
    for (const id of activeIds) {
      expect(withAi.some((player) => player.id === id)).toBe(true)
    }
  })

  test('contratado envelhece de uma temporada para a outra', () => {
    // Arrange: primeiro ano com contratação de um clube grande
    const transfer = aiTransfersFor(clubA, 0, 8).find((t) => t.year <= 7)
    expect(transfer).toBeDefined()

    // Act
    const now = rivalSquadFor(clubA, 0, transfer!.year)
      .find((p) => p.id === transfer!.signing.id)
    const later = rivalSquadFor(clubA, 0, transfer!.year + 1)
      .find((p) => p.id === transfer!.signing.id)

    // Assert
    expect(now?.age).toBe(transfer!.signing.baseAge)
    expect(later?.age).toBe(transfer!.signing.baseAge + 1)
  })

  test('bomba do ano: só quando existe contratação realmente absurda (overall 80+)', () => {
    // Arrange: varre 12 temporadas — a bomba é rara mas acontece
    const divisions = [
      CLUBS.filter((c) => c.division === 0).map((c) => c.id),
      CLUBS.filter((c) => c.division === 1).map((c) => c.id),
      CLUBS.filter((c) => c.division === 2).map((c) => c.id),
      CLUBS.filter((c) => c.division === 3).map((c) => c.id),
    ]

    // Act
    const bombs = Array.from({ length: 12 }, (_, i) =>
      blockbusterOfTheYear(divisions, i + 1, clubD.id),
    ).filter((b) => b !== null)

    // Assert: existe, é 80+, e não é todo ano ("às vezes")
    expect(bombs.length).toBeGreaterThan(0)
    expect(bombs.length).toBeLessThan(12)
    for (const bomb of bombs) {
      expect(bomb!.overallAtSigning).toBeGreaterThanOrEqual(80)
      expect(clubById(bomb!.clubId)).toBeDefined()
      expect(bomb!.clubId).not.toBe(clubD.id)
    }
  })
})

describe('reforço do campeão continental (cofre de 50 milhões)', () => {
  const aiClubs = CLUBS.filter((club) => club.division <= 1)
  const SCAN_YEARS = 15

  /**
   * Varredura determinística: acha um clube+ano em que o sorteio NATURAL
   * (sem título nenhum) não traria ninguém — a base dos testes de "contrata
   * mesmo quando o sorteio diria que não".
   */
  const anoSemContratacaoNatural = (): { club: Club; year: number } => {
    for (const club of aiClubs) {
      for (let year = 1; year <= SCAN_YEARS; year++) {
        const contratacoesDoAno = aiTransfersFor(club, club.division, year).filter((t) => t.year === year)
        if (contratacoesDoAno.length === 0) return { club, year }
      }
    }
    throw new Error('nenhum ano sem contratação natural encontrado na varredura — ajuste SCAN_YEARS')
  }

  /**
   * Varredura determinística: acha um clube+ano em que a PRIMEIRA contratação
   * do ano já é uma bomba pelo sorteio natural — permite comparar a mesma
   * rolagem de atributos com e sem o título (só o alvo de força muda).
   */
  const anoComBombaNatural = (): { club: Club; year: number } => {
    for (const club of aiClubs) {
      for (let year = 1; year <= SCAN_YEARS; year++) {
        const primeiraDoAno = aiTransfersFor(club, club.division, year).filter((t) => t.year === year)[0]
        if (primeiraDoAno?.isBlockbuster) return { club, year }
      }
    }
    throw new Error('nenhuma bomba natural encontrada na varredura — ajuste SCAN_YEARS')
  }

  test('clube campeão contrata no ano seguinte mesmo quando o sorteio diria que não', () => {
    // Arrange: ano em que o sorteio natural não traria ninguém para este clube
    const { club, year } = anoSemContratacaoNatural()

    // Act
    const semTitulo = aiTransfersFor(club, club.division, year).filter((t) => t.year === year)
    const comTitulo = aiTransfersFor(club, club.division, year, [year - 1]).filter((t) => t.year === year)

    // Assert
    expect(semTitulo).toHaveLength(0)
    expect(comTitulo.length).toBeGreaterThanOrEqual(1)
  })

  test('a contratação forçada do pós-título é sempre uma bomba', () => {
    // Arrange: mesmo cenário acima — sem o título, este clube não contrataria ninguém
    const { club, year } = anoSemContratacaoNatural()

    // Act
    const [forcada] = aiTransfersFor(club, club.division, year, [year - 1]).filter((t) => t.year === year)

    // Assert
    expect(forcada.isBlockbuster).toBe(true)
  })

  test('a bomba do campeão é mais forte que uma bomba comum do mesmo clube, mesmo ano', () => {
    // Arrange: ano em que a bomba SAI de qualquer jeito — mesma rolagem de posição,
    // idade, potencial e atributos; só o alvo de força muda com o título
    const { club, year } = anoComBombaNatural()

    // Act
    const bombaComum = aiTransfersFor(club, club.division, year).find((t) => t.year === year)!
    const bombaDeCampeao = aiTransfersFor(club, club.division, year, [year - 1]).find((t) => t.year === year)!

    // Assert
    expect(bombaComum.isBlockbuster).toBe(true)
    expect(bombaDeCampeao.isBlockbuster).toBe(true)
    expect(bombaDeCampeao.signing.name).toBe(bombaComum.signing.name)
    expect(bombaDeCampeao.overallAtSigning).toBeGreaterThan(bombaComum.overallAtSigning)
  })

  test('clube sem título nenhum tem exatamente as mesmas contratações de antes da mudança', () => {
    // Arrange + Act: impressão digital das contratações do clubA em 12 temporadas,
    // capturada da implementação ANTES desta mudança — prova de que o
    // determinismo dos clubes sem título continua intacto
    const impressaoDigital = aiTransfersFor(clubA, clubA.division, 12)
      .map((t) => `${t.year}|${t.isBlockbuster}|${t.overallAtSigning}|${t.signing.name}|${t.signing.price}`)
      .join(';')

    // Assert
    expect(impressaoDigital).toBe(
      '1|false|60|Rodrigo Sagredo|560000;2|false|85|Marco Ríos|65920000;6|false|71|Rodrigo Dias|11080000;' +
        '7|false|62|Felipe Silva|4590000;8|false|76|Rodrigo Araya|15880000;9|false|58|Fábio Vieira|220000;' +
        '10|false|59|Sven Meijer|360000;12|false|61|Márcio Costa|770000;12|false|71|Eduard Ferraresi|11300000',
    )
  })

  test('rivalSquadFor também recebe o reforço do campeão mesmo com o sorteio dizendo não', () => {
    // Arrange
    const { club, year } = anoSemContratacaoNatural()
    const idsForcados = aiTransfersFor(club, club.division, year, [year - 1])
      .filter((t) => t.year === year)
      .map((t) => t.signing.id)

    // Act
    const semTitulo = rivalSquadFor(club, club.division, year)
    const comTitulo = rivalSquadFor(club, club.division, year, 'masculino', [year - 1])

    // Assert
    expect(idsForcados.length).toBeGreaterThanOrEqual(1)
    for (const id of idsForcados) {
      expect(semTitulo.some((player) => player.id === id)).toBe(false)
      expect(comTitulo.some((player) => player.id === id)).toBe(true)
    }
  })
})
