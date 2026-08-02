import { describe, expect, test } from 'vitest'
import { createSave, startNewSeason, type PlayerSave } from '../../state/save'
import { createLibertados } from '../libertados/libertados'
import { addDays, compareDates, PRESEASON_DAYS, roundDate } from './calendar'
import {
  advanceDay,
  advancePastMatch,
  daysUntilMatch,
  isMatchDay,
  matchOn,
  upcomingMatch,
  weekOf,
} from './clock'
import { seasonSchedule } from './schedule'
import { SEASON_ROUNDS } from '../season/types'

const BRASILEIROS = ['leoes-capital', 'mare-rubra', 'imperial', 'atlantico']

const base = (): PlayerSave => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

const comLibertados = (): PlayerSave => {
  const save = base()
  return {
    ...save,
    libertados: createLibertados(4, save.careerYear, save.clubId, BRASILEIROS),
    libertadosQualified: true,
  }
}

/** Roda o relógio até a partida, como faria o botão de simular. */
const simulateUntilMatch = (save: PlayerSave, limit = 400): { save: PlayerSave; days: number } => {
  let current = save
  let days = 0
  while (!isMatchDay(current) && days < limit) {
    current = advanceDay(current)
    days++
  }
  return { save: current, days }
}

describe('relógio da carreira', () => {
  test('a carreira abre na pré-temporada, antes do primeiro jogo', () => {
    // Arrange + Act
    const save = base()

    // Assert
    expect(compareDates(save.currentDate, seasonSchedule(save)[0].date)).toBeLessThan(0)
    expect(daysUntilMatch(save)).toBe(PRESEASON_DAYS)
  })

  test('avançar um dia move o calendário um dia', () => {
    const save = base()
    expect(advanceDay(save).currentDate).toEqual(addDays(save.currentDate, 1))
  })

  test('dia sem jogo não é dia de jogo', () => {
    expect(isMatchDay(base())).toBe(false)
    expect(matchOn(base(), base().currentDate)).toBeNull()
  })

  test('simular dias para exatamente no dia da partida', () => {
    // Act
    const { save, days } = simulateUntilMatch(base())

    // Assert
    expect(days).toBe(PRESEASON_DAYS)
    expect(isMatchDay(save)).toBe(true)
    expect(save.currentDate).toEqual(roundDate(1, 0))
  })

  test('o relógio não atravessa o dia de jogo por conta própria', () => {
    // Arrange: já no dia da partida
    const { save } = simulateUntilMatch(base())

    // Act
    const insistindo = advanceDay(advanceDay(save))

    // Assert: continua parado, esperando o jogador entrar em campo
    expect(insistindo.currentDate).toEqual(save.currentDate)
  })

  test('depois da partida o dia vira — senão a carreira trava', () => {
    const { save } = simulateUntilMatch(base())
    expect(advancePastMatch(save).currentDate).toEqual(addDays(save.currentDate, 1))
  })

  test('com Libertados, o relógio para no jogo do meio de semana também', () => {
    // Arrange: a temporada tem rodada de sábado e jogo continental de quarta
    const save = comLibertados()

    // Act: dois compromissos seguidos
    const primeiro = simulateUntilMatch(save)
    const segundo = simulateUntilMatch(advancePastMatch(primeiro.save))

    // Assert: são jogos diferentes, em datas diferentes
    expect(isMatchDay(segundo.save)).toBe(true)
    expect(compareDates(primeiro.save.currentDate, segundo.save.currentDate)).toBeLessThan(0)
  })

  test('o próximo compromisso é o de hoje quando hoje tem jogo', () => {
    const { save } = simulateUntilMatch(base())
    expect(daysUntilMatch(save)).toBe(0)
    expect(upcomingMatch(save)?.date).toEqual(save.currentDate)
  })

  test('a semana vai de domingo a sábado e contém o dia atual', () => {
    // Act
    const week = weekOf({ year: 2026, month: 2, day: 4 })

    // Assert
    expect(week).toHaveLength(7)
    expect(new Date(Date.UTC(week[0].year, week[0].month, week[0].day)).getUTCDay()).toBe(0)
    expect(new Date(Date.UTC(week[6].year, week[6].month, week[6].day)).getUTCDay()).toBe(6)
    expect(week.some((day) => day.day === 4)).toBe(true)
  })

  test('a semana atravessa a virada de mês sem quebrar', () => {
    const week = weekOf({ year: 2026, month: 2, day: 31 })
    expect(week).toHaveLength(7)
    expect(week.some((day) => day.month === 3)).toBe(true)
  })

  test('virar o ano devolve o relógio para a pré-temporada seguinte', () => {
    // Arrange: uma carreira que chegou ao fim do ano 1
    const save = base()
    const fimDeAno: PlayerSave = {
      ...save,
      currentDate: { year: 2026, month: 11, day: 20 },
      season: { ...save.season, currentRound: SEASON_ROUNDS },
    }

    // Act
    const novo = startNewSeason(fimDeAno, () => 0.5)

    // Assert: março do ano 2, e com jogo pela frente de novo
    expect(novo.careerYear).toBe(2)
    expect(novo.currentDate.year).toBe(2027)
    expect(compareDates(novo.currentDate, seasonSchedule(novo)[0].date)).toBeLessThan(0)
    expect(daysUntilMatch(novo)).toBe(PRESEASON_DAYS)
  })

  test('liga encerrada com copa pela frente ainda tem jogo a caminho', () => {
    // Arrange: sem isto a Home escondia o avanço de dias e a Copa nunca chegava
    const save = base()
    const semLiga: PlayerSave = {
      ...save,
      careerYear: 2,
      currentDate: { year: 2027, month: 9, day: 1 },
      season: { ...save.season, currentRound: SEASON_ROUNDS },
    }

    // Act + Assert
    const proximo = upcomingMatch(semLiga)
    expect(proximo).not.toBeNull()
    expect(proximo?.date.month).toBe(11)
  })
})
