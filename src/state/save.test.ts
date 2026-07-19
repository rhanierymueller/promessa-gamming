import { describe, expect, test } from 'vitest'
import { clubById } from '../data/clubs'
import { userSlotIndex } from '../engine/squad/formation'
import { USER_SQUAD_INDEX } from '../engine/squad/players'
import { divisionOf } from '../engine/pyramid/pyramid'
import { SEASON_TEAMS } from '../engine/season/types'
import {
  applyTournament,
  displayClub,
  HISTORY_LIMIT,
  setClubColors,
  setPlayerName,
  CELEBRATION_COUNT,
  clubDisplayName,
  createSave,
  loadSave,
  MAX_PLAYER_NAME,
  parseSave,
  persistSave,
  recordMatch,
  renameClub,
  SAVE_VERSION,
  setAppearance,
  setCelebration,
  setClubCrest,
  setFormation,
  setShirtNumber,
  startNewSeason,
  swapLineup,
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
    const save = createSave({ playerName: '  Rhany 10  ', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())

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
    expect(createSave({ playerName: '   ', clubId: 'real-vila' })).toBeNull()
    expect(createSave({ playerName: 'Craque', clubId: 'clube-fantasma' })).toBeNull()
    expect(createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'atlantida' })).toBeNull()
  })

  test('limita o nome ao tamanho máximo', () => {
    // Act
    const save = createSave({ playerName: 'A'.repeat(50), clubId: 'real-vila' })

    // Assert
    expect(save!.playerName).toHaveLength(MAX_PLAYER_NAME)
  })
})

describe('mutações imutáveis do save', () => {
  test('setShirtNumber mantém o número entre 1 e 99', () => {
    // Arrange
    const save = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!

    // Act & Assert
    expect(setShirtNumber(save, 7).shirtNumber).toBe(7)
    expect(setShirtNumber(save, 0).shirtNumber).toBe(1)
    expect(setShirtNumber(save, 500).shirtNumber).toBe(99)
  })

  test('recordMatch acumula histórico sem tocar na temporada', () => {
    // Arrange
    const save = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!

    // Act
    const after = recordMatch(save, sampleRecord)

    // Assert
    expect(after.history).toEqual([sampleRecord])
    expect(after.season).toBe(save.season)
  })

  test('histórico guarda só as últimas 10 partidas; os totais da carreira seguem inteiros', () => {
    // Arrange: 13 partidas (12 vitórias com 1 gol + 1 derrota)
    let save = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!
    for (let i = 0; i < 12; i++) save = recordMatch(save, sampleRecord)
    save = recordMatch(save, { ...sampleRecord, teamGoals: 0, opponentGoals: 2, playerGoals: 0, rating: 4 })

    // Assert
    expect(save.history).toHaveLength(HISTORY_LIMIT)
    expect(save.career.games).toBe(13)
    expect(save.career.wins).toBe(12)
    expect(save.career.goals).toBe(12)
    expect(save.career.ratingSum).toBeCloseTo(7.8 * 12 + 4)
  })

  test('setCelebration troca a comemoração e ignora índice fora do catálogo', () => {
    // Arrange
    const save = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!

    // Act & Assert
    expect(save.celebrationId).toBe(0)
    expect(setCelebration(save, 2).celebrationId).toBe(2)
    expect(setCelebration(save, -1)).toBe(save)
    expect(setCelebration(save, CELEBRATION_COUNT)).toBe(save)
    expect(setCelebration(save, 1.5)).toBe(save)
  })

  test('setAppearance atualiza pele/cabelo/gênero e ignora índices inválidos', () => {
    // Arrange
    const save = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!

    // Act
    const updated = setAppearance(save, { skin: 3, hair: 2, kit: 1, gender: 'feminino' })

    // Assert
    expect(save.appearance).toEqual({ skin: 0, hair: 0, kit: 0, gender: 'masculino' })
    expect(updated.appearance).toEqual({ skin: 3, hair: 2, kit: 1, gender: 'feminino' })
    expect(setAppearance(save, { skin: 99, hair: 0, kit: 0, gender: 'masculino' })).toBe(save)
    expect(setAppearance(save, { skin: 0, hair: -1, kit: 0, gender: 'masculino' })).toBe(save)
  })

  test('renameClub personaliza localmente e limpa quando vazio/original', () => {
    // Arrange
    const save = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!

    // Act
    const renamed = renameClub(save, 'leoes-capital', '  Corinthians  ')

    // Assert
    expect(renamed.customClubNames['leoes-capital']).toBe('Corinthians')
    expect(clubDisplayName(renamed, 'leoes-capital')).toBe('Corinthians')
    expect(clubDisplayName(renamed, 'real-vila')).toBe('Real da Vila')
    expect(renameClub(renamed, 'leoes-capital', '').customClubNames['leoes-capital']).toBeUndefined()
    expect(renameClub(save, 'clube-fantasma', 'X')).toBe(save)
  })

  test('startNewSeason vira a pirâmide: movimento registrado e liga da nova divisão', () => {
    // Arrange: carreira na Série D
    const save = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!

    // Act
    const renewed = startNewSeason(save, fixedRoll(0.9))

    // Assert
    expect(renewed.divisionMovement).not.toBeNull()
    expect(renewed.playerAge).toBe(save.playerAge + 1)
    expect(renewed.divisions.flat()).toHaveLength(56)
    expect(renewed.season.participants).toContain('real-vila')
    expect(renewed.season.participants).toHaveLength(SEASON_TEAMS)
  })

  test('setClubCrest guarda data URL válida e recusa lixo', () => {
    // Arrange
    const save = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!
    const png = 'data:image/png;base64,iVBORw0KGgo='

    // Act & Assert
    expect(setClubCrest(save, 'pampa', png).customClubCrests['pampa']).toBe(png)
    expect(setClubCrest(save, 'pampa', 'javascript:alert(1)').customClubCrests['pampa']).toBeUndefined()
    expect(setClubCrest(setClubCrest(save, 'pampa', png), 'pampa', null).customClubCrests['pampa']).toBeUndefined()
  })

  test('startNewSeason zera o torneio e sorteia liga nova', () => {
    // Arrange
    const base = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll(0.2))!
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

describe('createSave v12 — você é o técnico', () => {
  test('time digitado vira clube host da Série D renomeado, com escalação padrão', () => {
    // Act
    const save = createSave({
      playerName: 'Craque',
      teamName: '  Galáticos FC  ',
      nationalityId: 'brasil',
      playerAge: 22,
      playerPosition: 'MEI',
      attributes: { finalizacao: 6, passe: 6, cobranca: 5, defesa: 5 },
      account: { email: 'a@b.com', username: 'craque10' },
    }, fixedRoll())

    // Assert
    expect(save).not.toBeNull()
    expect(save!.playerAge).toBe(22)
    expect(save!.playerPosition).toBe('MEI')
    expect(clubDisplayName(save!, save!.clubId)).toBe('Galáticos FC')
    expect(divisionOf(save!.divisions, save!.clubId)).toBe(3)
    expect(save!.formation).toBe('4-3-3')
    expect(save!.lineup).toHaveLength(11)
    expect(new Set(save!.lineup).size).toBe(11)
    expect(save!.lineup[userSlotIndex('4-3-3', 'MEI')]).toBe(USER_SQUAD_INDEX)
    expect(save!.account).toEqual({ email: 'a@b.com', username: 'craque10' })
  })

  test('recusa idade fora da régua, goleiro e atributos estourados', () => {
    // Act & Assert
    expect(createSave({ playerName: 'X', teamName: 'T', playerAge: 12 }, fixedRoll())).toBeNull()
    expect(createSave({ playerName: 'X', teamName: 'T', playerAge: 55 }, fixedRoll())).toBeNull()
    expect(createSave({ playerName: 'X', teamName: 'T', attributes: { finalizacao: 10, passe: 10, cobranca: 10, defesa: 10 } }, fixedRoll())).toBeNull()
    expect(createSave({ playerName: 'X' }, fixedRoll())).toBeNull()
  })
})

describe('formação e escalação — só do meu time', () => {
  const base = createSave({ playerName: 'Craque', teamName: 'Meu Time', playerPosition: 'ATA' }, fixedRoll())!

  test('setFormation muda o desenho e mantém você no setor certo', () => {
    // Act
    const changed = setFormation(base, '3-5-2')

    // Assert
    expect(changed.formation).toBe('3-5-2')
    expect(changed.lineup[userSlotIndex('3-5-2', 'ATA')]).toBe(USER_SQUAD_INDEX)
    expect(new Set(changed.lineup).size).toBe(11)
  })

  test('swapLineup escala reserva no lugar de titular', () => {
    // Arrange: slot 2 (um zagueiro), reserva 13
    const slot = 2

    // Act
    const changed = swapLineup(base, slot, 13)

    // Assert
    expect(changed.lineup[slot]).toBe(13)
    expect(changed.lineup).not.toContain(base.lineup[slot])
    expect(new Set(changed.lineup).size).toBe(11)
  })

  test('não deixa tirar você de campo nem duplicar jogador', () => {
    // Arrange
    const userSlot = base.lineup.indexOf(USER_SQUAD_INDEX)

    // Act & Assert
    expect(swapLineup(base, userSlot, 13)).toBe(base)
    expect(swapLineup(base, 2, USER_SQUAD_INDEX)).toBe(base)
    const swapped = swapLineup(base, 2, base.lineup[3])
    expect(new Set(swapped.lineup).size).toBe(11)
  })
})

describe('cores personalizadas do clube — locais ao save', () => {
  const base = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!

  test('troca as cores e o displayClub aplica', () => {
    // Act
    const painted = setClubColors(base, 'real-vila', '#000000', '#FFFFFF')
    const shown = displayClub(painted, clubById('real-vila')!)

    // Assert
    expect(painted.customClubColors['real-vila']).toEqual({ primary: '#000000', secondary: '#FFFFFF' })
    expect(shown.colors).toEqual({ primary: '#000000', secondary: '#FFFFFF' })
  })

  test('recusa cor inválida e limpa com null', () => {
    // Arrange
    const painted = setClubColors(base, 'real-vila', '#112233', '#445566')

    // Act & Assert
    expect(setClubColors(base, 'real-vila', 'vermelho', '#FFFFFF')).toBe(base)
    expect(setClubColors(base, 'clube-fantasma', '#000000', '#FFFFFF')).toBe(base)
    expect(setClubColors(painted, 'real-vila', null).customClubColors['real-vila']).toBeUndefined()
  })

  test('cores sobrevivem ao parse; lixo é descartado', () => {
    // Arrange
    const painted = setClubColors(base, 'real-vila', '#112233', '#445566')
    const raw = JSON.stringify({
      ...painted,
      customClubColors: { ...painted.customClubColors, pampa: { primary: 'zzz', secondary: 1 } },
    })

    // Act
    const parsed = parseSave(raw)

    // Assert
    expect(parsed!.customClubColors['real-vila']).toEqual({ primary: '#112233', secondary: '#445566' })
    expect(parsed!.customClubColors['pampa']).toBeUndefined()
  })
})

describe('renomear jogadores do MEU time — uma vez só, local ao save', () => {
  const base = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!

  test('renomeia um jogador do meu clube e o nome fica no save', () => {
    // Act
    const renamed = setPlayerName(base, 'real-vila-3', '  Zé Craque  ')

    // Assert
    expect(renamed.customPlayerNames['real-vila-3']).toBe('Zé Craque')
  })

  test('cada jogador só pode ser renomeado UMA vez', () => {
    // Arrange
    const once = setPlayerName(base, 'real-vila-3', 'Zé Craque')

    // Act & Assert
    expect(setPlayerName(once, 'real-vila-3', 'Outro Nome')).toBe(once)
    expect(once.customPlayerNames['real-vila-3']).toBe('Zé Craque')
  })

  test('não renomeia jogador de outro clube, o próprio craque, nem aceita nome vazio', () => {
    // Act & Assert
    expect(setPlayerName(base, 'mare-rubra-3', 'X')).toBe(base)
    expect(setPlayerName(base, 'voce', 'X')).toBe(base)
    expect(setPlayerName(base, 'real-vila-3', '  ')).toBe(base)
  })

  test('sobrevive ao parse e conteúdo inválido é descartado', () => {
    // Arrange
    const renamed = setPlayerName(base, 'real-vila-3', 'Zé Craque')
    const raw = JSON.stringify({ ...renamed, customPlayerNames: { ...renamed.customPlayerNames, 'real-vila-999x': 42 } })

    // Act
    const parsed = parseSave(raw)

    // Assert
    expect(parsed!.customPlayerNames['real-vila-3']).toBe('Zé Craque')
    expect(parsed!.customPlayerNames['real-vila-999x']).toBeUndefined()
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

  test('saves v6/v7 migram para v8 com comemoração e aparência padrão', () => {
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
    const v7 = JSON.stringify({
      version: 7,
      playerName: 'Craque',
      clubId: 'real-vila',
      celebrationId: 2,
    })

    // Act
    const fromV6 = parseSave(v6)
    const fromV7 = parseSave(v7)

    // Assert
    expect(fromV6!.version).toBe(SAVE_VERSION)
    expect(fromV6!.celebrationId).toBe(0)
    expect(fromV6!.careerYear).toBe(2)
    expect(fromV6!.appearance).toEqual({ skin: 0, hair: 0, kit: 0, gender: 'masculino' })
    expect(fromV7!.celebrationId).toBe(2)
    expect(fromV7!.appearance).toEqual({ skin: 0, hair: 0, kit: 0, gender: 'masculino' })
  })

  test('migração calcula os totais da carreira a partir do histórico antigo e apara em 10', () => {
    // Arrange: save v12 com 12 partidas no histórico
    const raw = JSON.stringify({
      version: 12,
      playerName: 'Craque',
      clubId: 'real-vila',
      history: Array.from({ length: 12 }, () => sampleRecord),
    })

    // Act
    const parsed = parseSave(raw)

    // Assert
    expect(parsed!.history).toHaveLength(HISTORY_LIMIT)
    expect(parsed!.career.games).toBe(12)
    expect(parsed!.career.wins).toBe(12)
    expect(parsed!.career.goals).toBe(12)
  })

  test('save v11 ganha idade, posição, formação e escalação padrão', () => {
    // Arrange
    const v11 = JSON.stringify({ version: 11, playerName: 'Craque', clubId: 'real-vila' })

    // Act
    const parsed = parseSave(v11)

    // Assert
    expect(parsed!.playerAge).toBe(18)
    expect(parsed!.playerPosition).toBe('ATA')
    expect(parsed!.formation).toBe('4-3-3')
    expect(parsed!.lineup).toHaveLength(11)
    expect(parsed!.lineup).toContain(USER_SQUAD_INDEX)
    expect(parsed!.account).toBeNull()
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
    const save = recordMatch(createSave({ playerName: 'Craque da Vila', clubId: 'estrela-minas', nationalityId: 'mexico' }, fixedRoll())!, sampleRecord)

    // Act
    persistSave(storage, save)

    // Assert
    expect(loadSave(storage)).toEqual(save)
  })
})
