import { describe, expect, test } from 'vitest'
import { clubById, CLUBS, type Club } from '../../data/clubs'
import { lineupRating, SQUAD_SIZE, squadPlayersFor, type SquadPlayer } from '../squad/players'
import { bestLineup } from '../squad/bestLineup'
import { FORMATIONS } from '../squad/formation'
import { opponentTeamRating } from '../squad/myTeam'
import { aiTransfersFor, blockbusterOfTheYear, rivalSquadFor } from './aiTransfers'

const clubA = CLUBS.find((club) => club.division === 0)!
const clubD = CLUBS.find((club) => club.division === 3)!

const media = (squad: readonly SquadPlayer[]): number =>
  squad.reduce((sum, player) => sum + player.overall, 0) / squad.length

describe('contratar tem de valer a pena', () => {
  test('o elenco com reforços nunca fica pior do que sem eles', () => {
    for (const club of CLUBS.filter((entry) => entry.division <= 1).slice(0, 8)) {
      for (const ano of [2, 5, 9, 13]) {
        const comReforcos = rivalSquadFor(club, club.division, ano)
        const semReforcos = squadPlayersFor(club, ano, 'masculino', club.division)
        expect(media(comReforcos)).toBeGreaterThanOrEqual(media(semReforcos))
      }
    }
  })

  test('anos de mercado somam: o time em campo fica mais forte que sem janela', () => {
    // Arrange: os onze que entram em campo — é o que decide a partida
    const onzeCom = (ano: number) => opponentTeamRating(clubA, ano, 0)
    const onzeSem = (ano: number) => {
      const squad = squadPlayersFor(clubA, ano, 'masculino', 0)
      const lineup = bestLineup(squad, FORMATIONS['4-3-3'])
      return lineupRating(lineup.map((index) => squad[index]), FORMATIONS['4-3-3'].slots)
    }

    // Assert: depois de uma década contratando, a diferença é visível
    expect(onzeCom(10)).toBeGreaterThan(onzeSem(10))
    expect(onzeCom(14)).toBeGreaterThan(onzeSem(14))
  })

  test('o reforço entra para jogar: melhor que o pior da posição dele', () => {
    // Arrange
    const transfers = aiTransfersFor(clubA, 0, 6)
    expect(transfers.length).toBeGreaterThan(0)

    // Assert: ninguém gasta dinheiro para sentar no banco atrás de quem já tem
    for (const transfer of transfers) {
      const naPosicao = squadPlayersFor(clubA, transfer.year, 'masculino', 0).filter(
        (player) => player.position === transfer.signing.position,
      )
      if (naPosicao.length === 0) continue
      const pior = Math.min(...naPosicao.map((player) => player.overall))
      expect(transfer.overallAtSigning).toBeGreaterThan(pior)
    }
  })
})

describe('mercado dos rivais (contratações da IA)', () => {
  test('é determinístico: mesmas entradas, mesmas contratações', () => {
    // Arrange + Act
    const first = aiTransfersFor(clubA, 0, 5)
    const second = aiTransfersFor(clubA, 0, 5)

    // Assert
    expect(first).toEqual(second)
  })

  test('a pirâmide inteira contrata — quem não reforça, encolhe', () => {
    // Act + Assert: nenhuma divisão fica de fora da janela
    for (const division of [0, 1, 2, 3]) {
      const clube = CLUBS.find((entry) => entry.division === division)!
      expect(aiTransfersFor(clube, division, 10).length).toBeGreaterThan(0)
    }
  })

  test('quanto mais alta a divisão, mais forte o reforço que ela compra', () => {
    // Arrange: mesmo clube, o que muda é a série que ele disputa
    const melhorReforcoNa = (division: number) =>
      Math.max(...aiTransfersFor(clubD, division, 12).map((t) => t.overallAtSigning))

    // Assert
    expect(melhorReforcoNa(0)).toBeGreaterThan(melhorReforcoNa(2))
    expect(melhorReforcoNa(2)).toBeGreaterThan(melhorReforcoNa(3))
  })

  test('fora da pirâmide (seleção, clube continental) não há janela', () => {
    expect(aiTransfersFor(clubA, -1, 10)).toHaveLength(0)
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

  test('clube sem título nenhum tem a mesma janela de sempre, contratação por contratação', () => {
    /*
     * Impressão digital das contratações do clubA em 12 temporadas. Trava o
     * determinismo: nenhuma mexida na regra do campeão continental pode
     * respingar em quem nunca levantou a taça.
     *
     * Recapturada quando o reforço passou a ter de superar o titular que
     * substitui — antes o clube contratava clones da própria régua (overalls
     * 58-71 nesta mesma lista) e a janela chegava a piorar o time.
     */
    const impressaoDigital = aiTransfersFor(clubA, clubA.division, 12)
      .map((t) => `${t.year}|${t.isBlockbuster}|${t.overallAtSigning}|${t.signing.name}|${t.signing.price}`)
      .join(';')

    // Assert
    expect(impressaoDigital).toBe(
      '1|false|88|Rodrigo Sagredo|78590000;2|false|85|Marco Ríos|65920000;6|false|79|Rodrigo Dias|19400000;' +
        '7|false|77|Felipe Silva|19750000;8|false|78|Rodrigo Araya|15880000;9|false|69|Fábio Vieira|2300000;' +
        '10|false|73|Sven Meijer|14040000;12|false|76|Márcio Costa|24330000;12|false|78|Eduard Ferraresi|19720000',
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
