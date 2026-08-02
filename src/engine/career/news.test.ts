import { describe, expect, test } from 'vitest'
import { createRng } from '../rng'
import { advanceSeason } from '../season/season'
import { createSave, recordMatch, type MatchRecord, type PlayerSave } from '../../state/save'
import { blockbusterOfTheYear } from '../market/aiTransfers'
import { MAX_NEWS, newsFor } from './news'

const fixedRoll = (value = 0.4): (() => number) => () => value

const baseSave = (): PlayerSave =>
  createSave({ playerName: 'Craque', teamName: 'Estrela FC', nationalityId: 'brasil' }, fixedRoll())!

const record = (partial: Partial<MatchRecord>): MatchRecord => ({
  opponentId: 'mare-rubra',
  teamGoals: 2,
  opponentGoals: 1,
  rating: 7,
  playerGoals: 1,
  playedAt: 1,
  competition: 'liga',
  ...partial,
})

/** Joga uma rodada da liga para a tabela existir. */
const playRound = (save: PlayerSave, our: number, their: number): PlayerSave => {
  const advanced = advanceSeason(save.season, our, their, createRng(7))
  return { ...recordMatch(save, record({ teamGoals: our, opponentGoals: their })), season: advanced.value }
}

describe('newsFor', () => {
  test('bomba de mercado de rival A/B vira manchete quando existe', () => {
    // Arrange: procura a primeira temporada com bomba entre A e B
    const save = baseSave()
    let bombYear = 0
    for (let year = 1; year <= 12 && bombYear === 0; year++) {
      if (blockbusterOfTheYear(save.divisions, year, save.clubId)) bombYear = year
    }
    expect(bombYear).toBeGreaterThan(0)

    // Act
    const news = newsFor({ ...save, careerYear: bombYear })

    // Assert
    const bomb = news.find((item) => item.id === 'mercado-bomba')
    expect(bomb).toBeDefined()
    expect(bomb!.headline).toContain('BOMBA')
  })

  test('sem jogos ainda, a manchete é a estreia da promessa', () => {
    // Act
    const news = newsFor(baseSave())

    // Assert
    expect(news.length).toBeGreaterThan(0)
    expect(news.some((item) => item.id === 'estreia')).toBe(true)
  })

  test('vitória com show individual rende manchete do clube, do olheiro e de artilheiro', () => {
    // Arrange
    const save = recordMatch(baseSave(), record({ teamGoals: 3, opponentGoals: 0, rating: 9.1, playerGoals: 2 }))

    // Act
    const news = newsFor(save)
    const ids = news.map((item) => item.id)

    // Assert
    expect(ids).toContain('ultimo-vitoria')
    expect(ids).toContain('olheiro-elogio')
    expect(ids).toContain('artilheiro')
  })

  test('derrota com nota vergonhosa rende manchete de derrota e crítica do comentarista', () => {
    // Arrange
    const save = recordMatch(baseSave(), record({ teamGoals: 0, opponentGoals: 3, rating: 4.2, playerGoals: 0 }))

    // Act
    const ids = newsFor(save).map((item) => item.id)

    // Assert
    expect(ids).toContain('ultimo-derrota')
    expect(ids).toContain('comentarista-critica')
  })

  test('líder da divisão vira manchete', () => {
    // Arrange: vence rodadas para liderar
    let save = baseSave()
    for (let i = 0; i < 3; i++) save = playRound(save, 4, 0)

    // Act
    const ids = newsFor(save).map((item) => item.id)

    // Assert
    expect(ids).toContain('lider')
    expect(ids).toContain('embalo')
  })

  test('acesso conquistado abre o noticiário; tudo é determinístico', () => {
    // Arrange
    const save = { ...baseSave(), divisionMovement: 'up' as const }

    // Act
    const news = newsFor(save)

    // Assert
    expect(news[0].id).toBe('acesso')
    expect(newsFor(save)).toEqual(news)
    for (const item of news) {
      expect(item.headline.length).toBeGreaterThan(0)
      expect(item.body.length).toBeGreaterThan(0)
    }
  })
})

describe('notícia do campeão continental', () => {
  const base = () => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

  test('o título de outro clube vira manchete no feed', () => {
    // Arrange
    const save = base()
    const comCampeao = {
      ...save,
      continentalChampions: [{ year: save.careerYear, clubId: 'sa-charrua' }],
    }

    // Act
    const manchetes = newsFor(comCampeao)

    // Assert
    expect(manchetes.some((item) => item.headline.includes('Club Charrúa'))).toBe(true)
  })

  test('sem campeão continental, nenhuma manchete continental aparece', () => {
    // Arrange
    const save = base()

    // Act & Assert
    expect(newsFor(save).some((item) => item.id.startsWith('libertados'))).toBe(false)
  })

  test('o título do próprio clube tem manchete própria', () => {
    // Arrange
    const save = base()
    const campeao = {
      ...save,
      continentalChampions: [{ year: save.careerYear, clubId: save.clubId }],
    }

    // Act
    const manchete = newsFor(campeao).find((item) => item.id.startsWith('libertados'))

    // Assert
    expect(manchete?.headline).toContain('é campeão')
    expect(manchete?.body).toContain('é sua')
  })

  test('o clube rebatizado pelo jogador aparece com o nome dele', () => {
    /*
     * Arrange: o batismo local vale para qualquer clube da pirâmide. Um rival
     * renomeado que levanta a taça precisa aparecer com o nome que o jogador
     * deu, como em toda outra manchete do feed.
     */
    const save = base()
    const comApelido = {
      ...save,
      customClubNames: { ...save.customClubNames, 'mare-rubra': 'Regatas do Bairro' },
      continentalChampions: [{ year: save.careerYear, clubId: 'mare-rubra' }],
    }

    // Act
    const manchete = newsFor(comApelido).find((item) => item.id.startsWith('libertados'))

    // Assert
    expect(manchete?.headline).toContain('Regatas do Bairro')
  })
})

describe('rival seleção no noticiário', () => {
  test('jogo de seleção mostra os dois países, nunca o clube nem ???', () => {
    // Arrange
    const save = recordMatch(baseSave(), record({
      opponentId: 'nation-argentina',
      competition: 'selecao',
      teamGoals: 0,
      opponentGoals: 1,
    }))

    // Act
    const news = newsFor(save)

    // Assert
    const headline = news.find((item) => item.id === 'ultimo-derrota')!
    expect(headline.context).toBe('selecao')
    expect(headline.headline).toContain('Brasil')
    expect(headline.headline).toContain('Argentina')
    expect(headline.headline).not.toContain('???')
    expect(headline.headline).not.toContain('Estrela FC')
  })
})

describe('notícias da liga inteira', () => {
  test('a rodada dos OUTROS clubes vira manchete; máximo respeita MAX_NEWS', () => {
    // Arrange: três rodadas jogadas
    let save = baseSave()
    for (let i = 0; i < 3; i++) save = playRound(save, 1, 2)

    // Act
    const news = newsFor(save)
    const ids = news.map((item) => item.id)

    // Assert
    expect(news.length).toBeLessThanOrEqual(MAX_NEWS)
    expect(ids).toContain('rodada-destaque')
    // perdendo todas, o líder é outro clube — e vira notícia
    expect(ids).toContain('lider-rival')
  })
})
