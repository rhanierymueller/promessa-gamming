import { describe, expect, test } from 'vitest'
import {
  compareDates,
  cupWeekdayFor,
  leagueWeekdayFor,
  libertadosDate,
  roundDate,
  seasonYearFor,
  tournamentDate,
  tournamentMatchDate,
} from './calendar'
import { SEASON_ROUNDS } from '../season/types'
import { MATCHES_PER_EDITION } from '../libertados/types'

const weekdayOf = (date: { year: number; month: number; day: number }): number =>
  new Date(Date.UTC(date.year, date.month, date.day)).getUTCDay()

const daysBetween = (
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number => (Date.UTC(b.year, b.month, b.day) - Date.UTC(a.year, a.month, a.day)) / 86_400_000

const SUNDAY = 0
const WEDNESDAY = 3
const THURSDAY = 4
const SATURDAY = 6

/** Anos de carreira variados: o alinhamento não pode depender do ano de estreia. */
const ANOS = [1, 2, 3, 4, 5, 8, 13, 21, 34]

describe('calendário real da temporada', () => {
  test('ano 1 da carreira é 2026; cada temporada avança um ano', () => {
    expect(seasonYearFor(1)).toBe(2026)
    expect(seasonYearFor(10)).toBe(2035)
  })

  test('a liga joga sempre no fim de semana, ora sábado ora domingo', () => {
    for (const careerYear of ANOS) {
      const dias = Array.from({ length: SEASON_ROUNDS }, (_, round) =>
        weekdayOf(roundDate(careerYear, round)),
      )
      for (const dia of dias) expect([SATURDAY, SUNDAY]).toContain(dia)
      // e o ano NÃO cai inteiro no mesmo dia — era o que acontecia antes
      expect(new Set(dias).size).toBe(2)
    }
  })

  test('a copa joga sempre no meio de semana, ora quarta ora quinta', () => {
    for (const careerYear of ANOS) {
      const dias = Array.from({ length: MATCHES_PER_EDITION }, (_, index) =>
        weekdayOf(libertadosDate(careerYear, index)),
      )
      for (const dia of dias) expect([WEDNESDAY, THURSDAY]).toContain(dia)
      expect(new Set(dias).size).toBe(2)
    }
  })

  test('o dia sorteado é estável: a mesma rodada cai sempre no mesmo dia', () => {
    expect(roundDate(4, 6)).toEqual(roundDate(4, 6))
    expect(leagueWeekdayFor(4, 6)).toBe(leagueWeekdayFor(4, 6))
    expect(cupWeekdayFor(3, 5)).toBe(cupWeekdayFor(3, 5))
  })

  test('sem Libertados a liga é semanal e fecha em maio', () => {
    const datas = Array.from({ length: SEASON_ROUNDS }, (_, round) => roundDate(1, round))
    expect(datas[0].month).toBe(2)
    for (let i = 1; i < datas.length; i++) {
      // uma semana de distância, com a folga de um dia que a variação sáb/dom cria
      expect(daysBetween(datas[i - 1], datas[i])).toBeGreaterThanOrEqual(6)
      expect(daysBetween(datas[i - 1], datas[i])).toBeLessThanOrEqual(8)
    }
    expect(datas[datas.length - 1].month).toBe(4)
  })

  test('com Libertados a liga é quinzenal e se estica até agosto', () => {
    const datas = Array.from({ length: SEASON_ROUNDS }, (_, round) => roundDate(1, round, true))
    for (let i = 1; i < datas.length; i++) {
      expect(daysBetween(datas[i - 1], datas[i])).toBeGreaterThanOrEqual(13)
      expect(daysBetween(datas[i - 1], datas[i])).toBeLessThanOrEqual(15)
    }
    expect(datas[datas.length - 1].month).toBe(7)
  })

  test('a rodada de abertura é a mesma nos dois ritmos', () => {
    expect(roundDate(1, 0, true)).toEqual(roundDate(1, 0))
  })

  test('a Libertados abre em abril e joga de quinze em quinze dias', () => {
    const datas = Array.from({ length: MATCHES_PER_EDITION }, (_, index) => libertadosDate(1, index))
    expect(datas[0].month).toBe(3)
    for (let i = 1; i < datas.length; i++) {
      expect(daysBetween(datas[i - 1], datas[i])).toBeGreaterThanOrEqual(13)
      expect(daysBetween(datas[i - 1], datas[i])).toBeLessThanOrEqual(15)
    }
  })

  test('a edição abre em abril em qualquer ano de carreira', () => {
    for (const careerYear of ANOS) {
      const abertura = libertadosDate(careerYear, 0)
      expect(abertura.month).toBe(3)
      expect([WEDNESDAY, THURSDAY]).toContain(weekdayOf(abertura))
    }
  })

  test('a edição fecha antes do torneio de seleções, em qualquer ano', () => {
    for (const careerYear of ANOS) {
      const ultima = libertadosDate(careerYear, MATCHES_PER_EDITION - 1)
      expect(compareDates(ultima, tournamentDate(careerYear))).toBeLessThan(0)
    }
  })

  test('todo jogo da Libertados divide a semana com uma rodada, em qualquer ano', () => {
    /*
     * É a razão de existir a cadência quinzenal. Ancorar as duas competições
     * de forma independente alinhava só no ano de estreia: do ano 3 em diante
     * nenhum jogo caía perto de uma rodada. Só valem os jogos disputados
     * enquanto a liga ainda está em andamento — depois dela, o continente
     * segue sozinho.
     */
    for (const careerYear of ANOS) {
      const rodadas = Array.from({ length: SEASON_ROUNDS }, (_, round) =>
        roundDate(careerYear, round, true),
      )
      const ultimaRodada = rodadas[rodadas.length - 1]
      for (let index = 0; index < MATCHES_PER_EDITION; index++) {
        const jogo = libertadosDate(careerYear, index)
        if (daysBetween(jogo, ultimaRodada) < 0) continue
        // qua/qui contra sáb/dom da mesma semana: de 2 a 4 dias de distância
        const acompanhado = rodadas.some((rodada) => Math.abs(daysBetween(jogo, rodada)) <= 4)
        expect(acompanhado).toBe(true)
      }
    }
  })

  test('compareDates ordena no tempo', () => {
    expect(compareDates({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 3, day: 2 })).toBeLessThan(0)
    expect(compareDates({ year: 2026, month: 3, day: 2 }, { year: 2026, month: 3, day: 2 })).toBe(0)
  })

  test('torneio de seleções segue num domingo de dezembro', () => {
    const date = tournamentDate(2)
    expect(date.year).toBe(2027)
    expect(date.month).toBe(11)
    expect(weekdayOf(date)).toBe(SUNDAY)
  })
})

/** O máximo de jogos que uma copa de seleções tem: 3 de grupo + 4 de mata-mata. */
const COPA_MATCHES = 7

describe('copa de seleções, jogo a jogo', () => {
  test('a abertura é o primeiro jogo — o marco de dezembro não se move', () => {
    for (const careerYear of ANOS) {
      expect(tournamentMatchDate(careerYear, 0)).toEqual(tournamentDate(careerYear))
    }
  })

  test('a copa inteira cabe em dezembro, em qualquer ano', () => {
    for (const careerYear of ANOS) {
      for (let index = 0; index < COPA_MATCHES; index++) {
        expect(tournamentMatchDate(careerYear, index).month).toBe(11)
      }
    }
  })

  test('um jogo depois do outro, sempre para a frente', () => {
    for (const careerYear of ANOS) {
      for (let index = 1; index < COPA_MATCHES; index++) {
        const anterior = tournamentMatchDate(careerYear, index - 1)
        const atual = tournamentMatchDate(careerYear, index)
        expect(compareDates(anterior, atual)).toBeLessThan(0)
      }
    }
  })

  test('nenhum jogo de seleção cai em dia de Libertados', () => {
    for (const careerYear of ANOS) {
      const continental = new Set(
        Array.from({ length: MATCHES_PER_EDITION }, (_, index) => {
          const date = libertadosDate(careerYear, index)
          return `${date.month}-${date.day}`
        }),
      )
      for (let index = 0; index < COPA_MATCHES; index++) {
        const date = tournamentMatchDate(careerYear, index)
        expect(continental.has(`${date.month}-${date.day}`)).toBe(false)
      }
    }
  })
})
