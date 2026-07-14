import { describe, expect, test } from 'vitest'
import { SEASON_TEAMS } from '../engine/season/types'
import {
  applyTournament,
  CELEBRATION_COUNT,
  createSave,
  loadSave,
  MAX_PLAYER_NAME,
  parseSave,
  persistSave,
  recordMatch,
  SAVE_VERSION,
  setCelebration,
  setShirtNumber,
  startNewSeason,
  type MatchRecord,
} from './save'

const fixedRoll = (value = 0.4): (() => number) => () => value

const fakeStorage = (): Pick<Storage, 'getItem' | 'setItem'> & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

const sampleRecord: MatchRecord = {
  opponentId: 'mare-rubra',
  teamGoals: 2,
  opponentGoals: 1,
  rating: 7.8,
  playerGoals: 1,
  playedAt: 1_700_000_000_000,
  competition: 'liga',
}

describe('createSave', () => {
  test('cria save v3 com temporada de 10 times e nacionalidade', () => {
    // Act
    const save = createSave('  Rhany 10  ', 'real-vila', 'brasil', fixedRoll())

    // Assert
    expect(save).not.toBeNull()
    expect(save!.version).toBe(SAVE_VERSION)
    expect(save!.playerName).toBe('Rhany 10')
    expect(save!.nationalityId).toBe('brasil')
    expect(save!.season.participants).toHaveLength(SEASON_TEAMS)
    expect(save!.season.playerClubId).toBe('real-vila')
    expect(save!.tournamentPlayed).toBe(false)
    expect(save!.tournament).toBeNull()
    expect(save!.careerYear).toBe(1)
  })

  test('recusa nome vazio, clube ou nação inexistentes', () => {
    // Act & Assert
    expect(createSave('   ', 'real-vila')).toBeNull()
    expect(createSave('Craque', 'clube-fantasma')).toBeNull()
    expect(createSave('Craque', 'real-vila', 'atlantida')).toBeNull()
  })

  test('limita o nome ao tamanho máximo', () => {
    // Act
    const save = createSave('A'.repeat(50), 'real-vila')

    // Assert
    expect(save!.playerName).toHaveLength(MAX_PLAYER_NAME)
  })
})

describe('mutações imutáveis do save', () => {
  test('setShirtNumber mantém o número entre 1 e 99', () => {
    // Arrange
    const save = createSave('Craque', 'real-vila', 'brasil', fixedRoll())!

    // Act & Assert
    expect(setShirtNumber(save, 7).shirtNumber).toBe(7)
    expect(setShirtNumber(save, 0).shirtNumber).toBe(1)
    expect(setShirtNumber(save, 500).shirtNumber).toBe(99)
  })

  test('recordMatch acumula histórico sem tocar na temporada', () => {
    // Arrange
    const save = createSave('Craque', 'real-vila', 'brasil', fixedRoll())!

    // Act
    const after = recordMatch(save, sampleRecord)

    // Assert
    expect(after.history).toEqual([sampleRecord])
    expect(after.season).toBe(save.season)
  })

  test('setCelebration troca a comemoração e ignora índice fora do catálogo', () => {
    // Arrange
    const save = createSave('Craque', 'real-vila', 'brasil', fixedRoll())!

    // Act & Assert
    expect(save.celebrationId).toBe(0)
    expect(setCelebration(save, 2).celebrationId).toBe(2)
    expect(setCelebration(save, -1)).toBe(save)
    expect(setCelebration(save, CELEBRATION_COUNT)).toBe(save)
    expect(setCelebration(save, 1.5)).toBe(save)
  })

  test('startNewSeason zera o torneio e sorteia liga nova', () => {
    // Arrange
    const base = createSave('Craque', 'real-vila', 'brasil', fixedRoll(0.2))!
    const save = { ...applyTournament(base, null), tournamentPlayed: true }

    // Act
    const renewed = startNewSeason(save, fixedRoll(0.9))

    // Assert
    expect(renewed.tournamentPlayed).toBe(false)
    expect(renewed.tournament).toBeNull()
    expect(renewed.careerYear).toBe(save.careerYear + 1)
    expect(renewed.season.seed).not.toBe(save.season.seed)
    expect(renewed.season.playerClubId).toBe('real-vila')
  })
})

describe('parseSave e migrações', () => {
  test('migra save v1 e v2 para v3 com temporada e nacionalidade padrão', () => {
    // Arrange
    const v1 = JSON.stringify({ version: 1, playerName: 'Veterano', clubId: 'estrela-minas' })
    const v2 = JSON.stringify({
      version: 2,
      playerName: 'Craque',
      clubId: 'real-vila',
      shirtNumber: 9,
      fixtures: ['mare-rubra'],
      history: [{ ...sampleRecord, competition: undefined }],
    })

    // Act
    const fromV1 = parseSave(v1)
    const fromV2 = parseSave(v2)

    // Assert
    expect(fromV1!.version).toBe(SAVE_VERSION)
    expect(fromV1!.nationalityId).toBe('brasil')
    expect(fromV1!.season.participants).toHaveLength(SEASON_TEAMS)
    expect(fromV2!.shirtNumber).toBe(9)
    expect(fromV2!.history[0].competition).toBe('liga')
  })

  test('rejeita JSON inválido e versão desconhecida', () => {
    // Act & Assert
    expect(parseSave(null)).toBeNull()
    expect(parseSave('não é json')).toBeNull()
    expect(parseSave(JSON.stringify({ version: 99, playerName: 'X', clubId: 'real-vila' }))).toBeNull()
  })

  test('save v6 migra para v7 com comemoração padrão', () => {
    // Arrange
    const v6 = JSON.stringify({
      version: 6,
      playerName: 'Craque',
      clubId: 'real-vila',
      nationalityId: 'brasil',
      shirtNumber: 10,
      careerYear: 2,
      history: [sampleRecord],
    })

    // Act
    const parsed = parseSave(v6)

    // Assert
    expect(parsed!.version).toBe(SAVE_VERSION)
    expect(parsed!.celebrationId).toBe(0)
    expect(parsed!.careerYear).toBe(2)
  })

  test('celebrationId inválido no save volta para o padrão', () => {
    // Arrange
    const raw = JSON.stringify({
      version: SAVE_VERSION,
      playerName: 'Craque',
      clubId: 'real-vila',
      celebrationId: 99,
    })

    // Act & Assert
    expect(parseSave(raw)!.celebrationId).toBe(0)
  })

  test('temporada corrompida é regenerada sem perder o resto do save', () => {
    // Arrange
    const raw = JSON.stringify({
      version: SAVE_VERSION,
      playerName: 'Craque',
      clubId: 'real-vila',
      nationalityId: 'argentina',
      shirtNumber: 11,
      tournamentPlayed: true,
      careerYear: 3,
      season: { corrompida: true },
      history: [sampleRecord],
    })

    // Act
    const parsed = parseSave(raw)

    // Assert
    expect(parsed!.nationalityId).toBe('argentina')
    expect(parsed!.shirtNumber).toBe(11)
    expect(parsed!.tournamentPlayed).toBe(true)
    expect(parsed!.careerYear).toBe(3)
    expect(parsed!.season.participants).toHaveLength(SEASON_TEAMS)
    expect(parsed!.history).toEqual([sampleRecord])
  })
})

describe('persistSave e loadSave', () => {
  test('o que persiste é o que carrega (round-trip)', () => {
    // Arrange
    const storage = fakeStorage()
    const save = recordMatch(createSave('Craque da Vila', 'estrela-minas', 'mexico', fixedRoll())!, sampleRecord)

    // Act
    persistSave(storage, save)

    // Assert
    expect(loadSave(storage)).toEqual(save)
  })
})
