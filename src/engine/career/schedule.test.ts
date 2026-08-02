import { describe, expect, test } from 'vitest'
import { createSave, type PlayerSave } from '../../state/save'
import { createLibertados } from '../libertados/libertados'
import { createTournament } from '../tournament/tournament'
import { SEASON_ROUNDS } from '../season/types'
import { compareDates } from './calendar'
import { nextScheduled, seasonSchedule, type ScheduledMatch } from './schedule'

const BRASILEIROS = ['leoes-capital', 'mare-rubra', 'imperial', 'atlantico']

const base = (): PlayerSave => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

const comLibertados = (over: Partial<PlayerSave> = {}): PlayerSave => {
  const save = base()
  return {
    ...save,
    libertados: createLibertados(4, save.careerYear, save.clubId, BRASILEIROS),
    libertadosQualified: true,
    ...over,
  }
}

const daCompeticao = (schedule: readonly ScheduledMatch[], competition: string) =>
  schedule.filter((match) => match.competition === competition)

describe('Copa do Brasil na agenda', () => {
  test('entra com os dez jogos da campanha, em ida e volta', () => {
    // Act
    const copa = daCompeticao(seasonSchedule(base()), 'copa-brasil')

    // Assert
    expect(copa).toHaveLength(10)
    expect(copa[0].stageLabel).toContain('ida')
    expect(copa[1].stageLabel).toContain('volta')
  })

  test('joga no meio de semana, nas semanas que a Libertados deixa livre', () => {
    // Arrange
    const schedule = seasonSchedule(comLibertados())
    const dias = (competition: string) =>
      daCompeticao(schedule, competition).map(
        (match) => `${match.date.month}-${match.date.day}`,
      )

    // Assert: nenhuma data batida entre as duas copas
    const continental = new Set(dias('libertados'))
    for (const dia of dias('copa-brasil')) expect(continental.has(dia)).toBe(false)
  })

  test('só o confronto atual tem adversário: o resto da chave depende dos jogos', () => {
    // Act
    const copa = daCompeticao(seasonSchedule(base()), 'copa-brasil')

    // Assert
    expect(copa[0].opponentId).not.toBeNull()
    expect(copa[copa.length - 1].opponentId).toBeNull()
  })
})

describe('agenda da temporada', () => {
  test('sai em ordem cronológica, misturando as competições', () => {
    // Act
    const schedule = seasonSchedule(comLibertados())

    // Assert
    for (let i = 1; i < schedule.length; i++) {
      expect(compareDates(schedule[i - 1].date, schedule[i].date)).toBeLessThanOrEqual(0)
    }
  })

  test('a liga entra com uma rodada para cada jogo da temporada', () => {
    expect(daCompeticao(seasonSchedule(base()), 'liga')).toHaveLength(SEASON_ROUNDS)
  })

  test('as duas competições convivem na mesma agenda', () => {
    // Act
    const schedule = seasonSchedule(comLibertados())

    // Assert
    expect(daCompeticao(schedule, 'liga').length).toBeGreaterThan(0)
    expect(daCompeticao(schedule, 'libertados').length).toBeGreaterThan(0)
  })

  test('sem Libertados, nenhum jogo continental aparece', () => {
    expect(daCompeticao(seasonSchedule(base()), 'libertados')).toHaveLength(0)
  })

  test('cada compromisso diz em que fase está', () => {
    // Act
    const schedule = seasonSchedule(comLibertados())

    // Assert
    expect(daCompeticao(schedule, 'liga')[0].stageLabel).toBe('Rodada 1')
    expect(daCompeticao(schedule, 'libertados')[0].stageLabel).toBe('Grupos · rodada 1')
    for (const match of schedule) expect(match.stageLabel.length).toBeGreaterThan(0)
  })

  test('jogo que ainda não aconteceu não tem resultado nem consta como jogado', () => {
    for (const match of seasonSchedule(comLibertados())) {
      expect(match.result).toBeNull()
      expect(match.isPlayed).toBe(false)
    }
  })

  test('rodada antiga sem registro no histórico ainda consta como jogada', () => {
    // o save guarda só as últimas partidas: a 1ª rodada de uma temporada
    // adiantada não tem placar para mostrar, mas já aconteceu
    const save = base()
    const adiantada = { ...save, season: { ...save.season, currentRound: 10 } }
    const primeira = daCompeticao(seasonSchedule(adiantada), 'liga')[0]
    expect(primeira.isPlayed).toBe(true)
    expect(primeira.result).toBeNull()
  })

  test('a rodada já disputada carrega o placar dela', () => {
    // Arrange: uma vitória por 2×1 na primeira rodada
    const save = base()
    const jogada: PlayerSave = {
      ...save,
      season: { ...save.season, currentRound: 1 },
      history: [
        {
          opponentId: 'mare-rubra',
          teamGoals: 2,
          opponentGoals: 1,
          rating: 7.5,
          playerGoals: 1,
          playedAt: 0,
          competition: 'liga',
        },
      ],
    }

    // Act
    const primeira = daCompeticao(seasonSchedule(jogada), 'liga')[0]

    // Assert
    expect(primeira.result).toEqual({ teamGoals: 2, opponentGoals: 1 })
    expect(primeira.isPlayed).toBe(true)
  })

  test('mata-mata que ainda não foi sorteado entra sem adversário', () => {
    // Arrange: a edição está na fase de grupos, o mata-mata é indefinido
    const schedule = seasonSchedule(comLibertados())
    const continental = daCompeticao(schedule, 'libertados')

    // Assert: o último compromisso da edição é a final, contra ninguém ainda
    expect(continental[continental.length - 1].opponentId).toBeNull()
  })
})

describe('copa de seleções na agenda', () => {
  /** Ano de carreira que cai em ano de Copa (o ciclo é bienal/quadrienal). */
  const anoDeCopa = (): PlayerSave => {
    for (let ano = 1; ano <= 8; ano++) {
      const save = { ...base(), careerYear: ano }
      if (daCompeticao(seasonSchedule(save), 'copa-america').length > 0) return save
    }
    throw new Error('nenhum ano de Copa América encontrado')
  }

  test('a Copa aparece na agenda mesmo antes da convocação', () => {
    // Arrange + Act
    const schedule = seasonSchedule(anoDeCopa())

    // Assert: um marco em dezembro, sem adversário
    const copa = daCompeticao(schedule, 'copa-america')
    expect(copa).toHaveLength(1)
    expect(copa[0].date.month).toBe(11)
    expect(copa[0].opponentId).toBeNull()
  })

  test('convocado, cada fase do torneio vira um jogo com data própria', () => {
    // Arrange
    const save = anoDeCopa()
    const convocado: PlayerSave = {
      ...save,
      tournament: createTournament('copa-america', 'brasil', 7),
    }

    // Act
    const copa = daCompeticao(seasonSchedule(convocado), 'copa-america')

    // Assert: 3 rodadas de grupo + semifinal + final, em dias diferentes
    expect(copa).toHaveLength(5)
    expect(new Set(copa.map((match) => `${match.date.month}-${match.date.day}`)).size).toBe(5)
    for (const match of copa) expect(match.date.month).toBe(11)
  })

  test('a Copa fecha o ano: nenhum jogo de clube depois dela', () => {
    // Arrange
    const save = { ...anoDeCopa(), ...comLibertados() }
    const schedule = seasonSchedule({ ...save, careerYear: anoDeCopa().careerYear })
    const copa = schedule.filter((match) => match.competition === 'copa-america')
    if (copa.length === 0) return

    // Assert
    const clubes = schedule.filter((match) => match.competition !== 'copa-america')
    for (const match of clubes) {
      expect(compareDates(match.date, copa[0].date)).toBeLessThan(0)
    }
  })

  test('ano fora do ciclo não marca competição de seleção', () => {
    // Arrange: os ciclos são bienal e quadrienal, então há anos vazios
    const DE_SELECAO = ['copa-america', 'copa-mundo', 'liga-nacoes']
    for (let ano = 1; ano <= 8; ano++) {
      const schedule = seasonSchedule({ ...base(), careerYear: ano })
      if (!schedule.some((match) => DE_SELECAO.includes(match.competition))) return
    }
    throw new Error('esperava ao menos um ano sem competição de seleção')
  })
})

describe('próximo compromisso', () => {
  test('é o primeiro sem resultado', () => {
    // Act
    const proximo = nextScheduled(base())

    // Assert
    expect(proximo?.competition).toBe('liga')
    expect(proximo?.stageLabel).toBe('Rodada 1')
    expect(proximo?.isPlayed).toBe(false)
  })

  test('com a liga adiantada, o jogo do continente vem primeiro', () => {
    // Arrange: liga na 10ª rodada (julho), Libertados ainda em abril
    const save = comLibertados()

    // Act
    const proximo = nextScheduled({ ...save, season: { ...save.season, currentRound: 10 } })

    // Assert
    expect(proximo?.competition).toBe('libertados')
    expect(proximo?.date.month).toBe(3)
  })

  test('temporada encerrada e sem torneio não tem compromisso', () => {
    const save = base()
    expect(
      nextScheduled({
        ...save,
        season: { ...save.season, currentRound: SEASON_ROUNDS },
        copaBrasil: null,
      }),
    ).toBeNull()
  })

  test('edição continental encerrada deixa só a liga', () => {
    const save = comLibertados()
    const encerrado = { ...save.libertados!, stage: 'eliminated' as const }
    expect(nextScheduled({ ...save, libertados: encerrado })?.competition).toBe('liga')
  })

  test('liga encerrada deixa só o continente', () => {
    const save = comLibertados()
    expect(
      nextScheduled({ ...save, season: { ...save.season, currentRound: SEASON_ROUNDS } })
        ?.competition,
    ).toBe('libertados')
  })
})
