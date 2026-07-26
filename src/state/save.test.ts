import { describe, expect, test } from 'vitest'
import { CLUBS, clubById } from '../data/clubs'
import { marketPoolFor } from '../engine/market/market'
import { createRng } from '../engine/rng'
import { advanceSeason } from '../engine/season/season'
import { createTournament } from '../engine/tournament/tournament'
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
  signPlayer,
  withTournamentState,
  CELEBRATION_COUNT,
  clubDisplayName,
  createSave,
  currentPlayerAge,
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

  test('setAppearance atualiza pele/cabelo/uniforme e ignora índices inválidos', () => {
    // Arrange
    const save = createSave({ playerName: 'Craque', clubId: 'real-vila', nationalityId: 'brasil' }, fixedRoll())!

    // Act
    const updated = setAppearance(save, { skin: 3, hair: 2, kit: 1, gender: 'feminino' })

    // Assert
    expect(save.appearance).toEqual({ skin: 0, hair: 0, kit: 0, gender: 'masculino' })
    // o gênero é do cadastro e não se troca — ver a suíte "gênero do atleta"
    expect(updated.appearance).toEqual({ skin: 3, hair: 2, kit: 1, gender: 'masculino' })
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
    // playerAge é a idade de CRIAÇÃO e não se mexe; quem envelhece é
    // currentPlayerAge, que soma as temporadas por cima
    expect(renewed.playerAge).toBe(save.playerAge)
    expect(currentPlayerAge(renewed)).toBe(currentPlayerAge(save) + 1)
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

  test('swapLineup troca DOIS TITULARES de lugar (consertar posição sem ir pro banco)', () => {
    // Arrange: dois titulares já escalados, em slots diferentes
    const slotA = 5
    const slotB = 7
    const playerA = base.lineup[slotA]
    const playerB = base.lineup[slotB]

    // Act: colocar o titular do slot B no slot A
    const changed = swapLineup(base, slotA, playerB)

    // Assert: eles trocam de lugar, ninguém vai para o banco
    expect(changed.lineup[slotA]).toBe(playerB)
    expect(changed.lineup[slotB]).toBe(playerA)
    expect(new Set(changed.lineup).size).toBe(11)
    expect([...changed.lineup].sort()).toEqual([...base.lineup].sort())
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

describe('verba e contratações (transfermarket)', () => {
  const base = createSave({ playerName: 'Craque', teamName: 'Mercado FC', nationalityId: 'brasil' }, fixedRoll())!
  const listed = marketPoolFor(base.season.seed, base.careerYear)[0]

  test('carreira nova na Série D começa com R$ 500 mil', () => {
    expect(base.budget).toBe(500_000)
  })

  test('contratar desconta a verba e grava a contratação', () => {
    // Arrange: verba suficiente
    const rich = { ...base, budget: 200_000_000 }

    // Act
    const after = signPlayer(rich, listed)

    // Assert
    expect(after.budget).toBe(200_000_000 - listed.price)
    expect(after.signings).toHaveLength(1)
    expect(after.signings[0].id).toBe(listed.id)
    expect(after.signings[0].boughtYear).toBe(base.careerYear)
  })

  test('sem verba não contrata; duplicado não contrata', () => {
    // Arrange
    const poor = { ...base, budget: 100 }
    const rich = signPlayer({ ...base, budget: 200_000_000 }, listed)

    // Act & Assert
    expect(signPlayer(poor, listed)).toBe(poor)
    expect(signPlayer(rich, listed)).toBe(rich)
  })

  test('virada de temporada ACUMULA: sobra + cota da nova divisão', () => {
    // Act
    const renewed = startNewSeason({ ...base, budget: 300_000 }, fixedRoll(0.9))

    // Assert: o que sobrou não some
    const division = divisionOf(renewed.divisions, renewed.clubId)
    const allowance = [20_000_000, 12_000_000, 800_000, 500_000][division]
    expect(renewed.budget).toBe(300_000 + allowance)
  })

  test('CAMPEÃO da Série D: prêmio de 500 mil + taça na estante', () => {
    // Arrange: vence as 13 rodadas
    let champion = { ...base, budget: 0 }
    let rng = createRng(5)
    for (let round = 0; round < 13; round++) {
      const advanced = advanceSeason(champion.season, 5, 0, rng)
      champion = { ...champion, season: advanced.value }
      rng = advanced.next
    }

    // Act
    const renewed = startNewSeason(champion, fixedRoll(0.9))

    // Assert: subiu para a C → 0 + prêmio 500 mil + cota 800 mil
    expect(renewed.budget).toBe(1_300_000)
    expect(renewed.trophies).toContainEqual({ kind: 'serie-d', year: champion.careerYear })
  })

  test('BICAMPEÃO acumula uma taça por título, cada uma com o seu ano', () => {
    // Arrange: já tem duas Séries A na estante, de anos diferentes
    let champion = {
      ...base,
      trophies: [
        { kind: 'serie-a' as const, year: 3 },
        { kind: 'serie-a' as const, year: 5 },
      ],
    }
    let rng = createRng(5)
    for (let round = 0; round < 13; round++) {
      const advanced = advanceSeason(champion.season, 5, 0, rng)
      champion = { ...champion, season: advanced.value }
      rng = advanced.next
    }

    // Act
    const renewed = startNewSeason(champion, fixedRoll(0.9))

    // Assert: nada é sobrescrito — 3 taças, anos preservados
    expect(renewed.trophies).toHaveLength(3)
    expect(renewed.trophies.filter((t) => t.kind === 'serie-a')).toHaveLength(2)
    expect(renewed.trophies).toContainEqual({ kind: 'serie-d', year: champion.careerYear })
  })

  test('título de torneio de seleção dá TAÇA mas não dinheiro (e não duplica)', () => {
    // Arrange
    const tournament = createTournament('copa-america', 'brasil', 9)
    const champion = { ...tournament, stage: 'champion' as const }

    // Act
    const once = withTournamentState(base, champion)
    const twice = withTournamentState(once, champion)

    // Assert
    expect(once.budget).toBe(base.budget)
    expect(once.trophies).toContainEqual({ kind: 'copa-america', year: base.careerYear })
    expect(twice.trophies).toHaveLength(once.trophies.length)
  })

  test('troféus sobrevivem ao parse; lixo é descartado', () => {
    // Arrange
    const decorated = { ...base, trophies: [{ kind: 'serie-a', year: 3 }] }
    const raw = JSON.stringify(decorated)
    const broken = JSON.stringify({ ...decorated, trophies: [{ kind: 'bola-de-ouro', year: 'ontem' }] })

    // Act & Assert
    expect(parseSave(raw)!.trophies).toEqual([{ kind: 'serie-a', year: 3 }])
    expect(parseSave(broken)!.trophies).toHaveLength(0)
  })

  test('contratações sobrevivem ao parse; verba inválida volta ao padrão', () => {
    // Arrange
    const rich = signPlayer({ ...base, budget: 200_000_000 }, listed)
    const raw = JSON.stringify(rich)
    const broken = JSON.stringify({ ...rich, budget: 'muito', signings: [{ id: 1 }] })

    // Act & Assert
    expect(parseSave(raw)!.signings).toHaveLength(1)
    expect(parseSave(raw)!.budget).toBe(rich.budget)
    expect(parseSave(broken)!.signings).toHaveLength(0)
    expect(parseSave(broken)!.budget).toBe(500_000)
  })
})

describe('clube rebatizado aparece com o nome novo em tudo', () => {
  const base = createSave(
    { playerName: 'Craque', teamName: 'Galáticos FC', nationalityId: 'brasil' },
    fixedRoll(),
  )!

  test('o APELIDO também vira o nome novo (a saudação não pode citar o antigo)', () => {
    // Arrange
    const original = clubById(base.clubId)!

    // Act
    const shown = displayClub(base, original)

    // Assert
    expect(shown.name).toBe('Galáticos FC')
    expect(shown.nickname).toBe('Galáticos FC')
    expect(shown.nickname).not.toBe(original.nickname)
  })

  test('clube não rebatizado mantém o apelido original', () => {
    // Arrange: um clube qualquer que o jogador não renomeou
    const other = CLUBS.find((club) => club.id !== base.clubId)!

    // Act
    const shown = displayClub(base, other)

    // Assert
    expect(shown.nickname).toBe(other.nickname)
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

describe('filtro de nomes ofensivos nas entradas do save', () => {
  const base = createSave({ playerName: 'Craque', teamName: 'Limpo FC', nationalityId: 'brasil' }, fixedRoll())!

  test('createSave recusa nome de craque ou de time ofensivo', () => {
    expect(createSave({ playerName: 'Merda FC', teamName: 'Time' }, fixedRoll())).toBeNull()
    expect(createSave({ playerName: 'Craque', teamName: 'B0STA CITY' }, fixedRoll())).toBeNull()
  })

  test('renameClub e setPlayerName ignoram nomes ofensivos', () => {
    expect(renameClub(base, 'real-vila', 'p.u.t.a')).toBe(base)
    expect(setPlayerName(base, `${base.clubId}-3`, 'c4ralho')).toBe(base)
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

  test('reforço contratado (id de mercado) pode ser batizado — é do MEU time', () => {
    // Act
    const renamed = setPlayerName(base, 'mkt-lenda-1', 'Ronaldo')

    // Assert
    expect(renamed.customPlayerNames['mkt-lenda-1']).toBe('Ronaldo')
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

    // Act: persistSave carimba o savedAt e devolve o save gravado
    const gravado = persistSave(storage, save, 1_700_000_000_000)

    // Assert
    expect(loadSave(storage)).toEqual(gravado)
    expect(gravado).toEqual({ ...save, savedAt: 1_700_000_000_000 })
  })

  test('cada gravação renova o carimbo — é ele que decide quem jogou por último', () => {
    // Arrange
    const storage = fakeStorage()
    const save = createSave({ playerName: 'Craque', clubId: 'real-vila' }, fixedRoll())!

    // Act
    const antes = persistSave(storage, save, 1000)
    const depois = persistSave(storage, antes, 2000)

    // Assert
    expect(antes.savedAt).toBe(1000)
    expect(depois.savedAt).toBe(2000)
    expect(loadSave(storage)!.savedAt).toBe(2000)
  })

  test('save antigo, sem carimbo, carrega com zero e perde para qualquer um', () => {
    // Arrange: formato anterior à sincronização
    const storage = fakeStorage()
    const save = createSave({ playerName: 'Craque', clubId: 'real-vila' }, fixedRoll())!
    const { savedAt: _ignorado, ...semCarimbo } = save
    storage.setItem('promessa.save', JSON.stringify(semCarimbo))

    // Assert
    expect(loadSave(storage)!.savedAt).toBe(0)
  })
})

describe('torneio salvo em formato antigo', () => {
  test('save com groupA/groupB é descartado em vez de quebrar a tela', () => {
    // Arrange: formato anterior aos oito grupos
    const base = createSave({ playerName: 'Mueller', clubId: 'real-vila', nationalityId: 'brasil' })!
    const antigo = {
      ...base,
      tournament: {
        kind: 'copa-america',
        seed: 1,
        playerNationId: 'brasil',
        groupA: ['brasil'],
        groupB: ['chile'],
        stage: 'groups',
        round: 0,
        results: [],
        championId: null,
      },
    }

    // Act
    const carregado = parseSave(JSON.stringify(antigo))

    // Assert
    expect(carregado).not.toBeNull()
    expect(carregado!.tournament).toBeNull()
  })

  test('torneio no formato novo sobrevive ao salvar e carregar', () => {
    // Arrange
    const base = createSave({ playerName: 'Mueller', clubId: 'real-vila', nationalityId: 'brasil' })!
    const save = applyTournament(base, createTournament('copa-mundo', 'brasil', 42))

    // Act
    const carregado = parseSave(JSON.stringify(save))

    // Assert
    expect(carregado!.tournament?.groups).toHaveLength(8)
  })
})

describe('idade do craque ao longo da carreira', () => {
  test('sobe UMA vez por temporada', () => {
    // playerAge é a idade de CRIAÇÃO; currentPlayerAge soma as temporadas.
    // Somar nos dois lugares envelhecia o jogador dois anos por ano.
    let save = createSave({ playerName: 'M', clubId: 'real-vila', nationalityId: 'brasil' })!
    const inicial = currentPlayerAge(save)

    for (let temporada = 1; temporada <= 6; temporada++) {
      save = startNewSeason(save)
      expect(currentPlayerAge(save)).toBe(inicial + temporada)
    }
  })

  test('a idade de criação não muda com as temporadas', () => {
    const save = createSave({ playerName: 'M', clubId: 'real-vila', nationalityId: 'brasil' })!
    expect(startNewSeason(startNewSeason(save)).playerAge).toBe(save.playerAge)
  })

  test('carreira antiga tem a idade inflada corrigida ao carregar', () => {
    // save do formato com o bug: playerAge já vinha somado por temporada
    const base = createSave({ playerName: 'M', clubId: 'real-vila', nationalityId: 'brasil' })!
    const inflado = { ...base, version: 18, careerYear: 8, playerAge: base.playerAge + 7 }

    const carregado = parseSave(JSON.stringify(inflado))!

    expect(carregado.playerAge).toBe(base.playerAge)
    expect(currentPlayerAge(carregado)).toBe(base.playerAge + 7)
  })

  test('save já corrigido não é mexido de novo ao recarregar', () => {
    const base = createSave({ playerName: 'M', clubId: 'real-vila', nationalityId: 'brasil' })!
    const atual = { ...base, careerYear: 8 }

    const carregado = parseSave(JSON.stringify(atual))!

    expect(carregado.playerAge).toBe(base.playerAge)
  })
})

describe('gênero do atleta', () => {
  const base = (gender?: 'masculino' | 'feminino') =>
    createSave({ playerName: 'Alex', clubId: 'real-vila', nationalityId: 'brasil', gender })!

  test('é escolhido na criação', () => {
    expect(base('feminino').appearance.gender).toBe('feminino')
    expect(base('masculino').appearance.gender).toBe('masculino')
  })

  test('quem não escolheu fica no masculino — carreiras antigas seguem como estavam', () => {
    expect(base().appearance.gender).toBe('masculino')
    const antigo = createSave({ playerName: 'Alex', clubId: 'real-vila' })!
    expect(parseSave(JSON.stringify(antigo))!.appearance.gender).toBe('masculino')
  })

  test('NÃO troca depois: setAppearance mexe no resto e preserva o gênero', () => {
    // trocar no meio da carreira reescreveria arte, nomes do mundo e textos
    const save = base('feminino')
    const mexido = setAppearance(save, { ...save.appearance, gender: 'masculino', skin: 2 })

    expect(mexido.appearance.gender).toBe('feminino')
    expect(mexido.appearance.skin).toBe(2)
  })
})
