import { describe, expect, test } from 'vitest'
import { KNOCKOUT_ORDER, type TournamentStage } from '../tournament/tournament'
import { isTournamentRunning, seasonEndAction } from './seasonEnd'

describe('fim de temporada', () => {
  test('ano SEM competição de seleção sempre deixa virar o ano', () => {
    // era o travamento: convocação "disponível" num ano sem Copa escondia o
    // botão de encerrar a temporada, e o card da convocação também não vinha
    expect(
      seasonEndAction({ eligible: true, hasTournamentThisYear: false, stage: null }),
    ).toBe('close')
  })

  test('ano com competição e forma boa oferece a convocação', () => {
    expect(
      seasonEndAction({ eligible: true, hasTournamentThisYear: true, stage: null }),
    ).toBe('callup')
  })

  test('sem forma para a seleção, vira o ano direto', () => {
    expect(
      seasonEndAction({ eligible: false, hasTournamentThisYear: true, stage: null }),
    ).toBe('close')
  })

  test('torneio em andamento segura a virada até acabar', () => {
    for (const stage of ['groups', ...KNOCKOUT_ORDER] as TournamentStage[]) {
      expect(seasonEndAction({ eligible: true, hasTournamentThisYear: true, stage })).toBe(
        'tournament',
      )
    }
  })

  test('torneio encerrado libera a virada, campeão ou eliminado', () => {
    for (const stage of ['champion', 'eliminated'] as TournamentStage[]) {
      expect(seasonEndAction({ eligible: true, hasTournamentThisYear: true, stage })).toBe(
        'close',
      )
    }
  })

  test('NUNCA fica sem saída — toda combinação leva a alguma ação', () => {
    const stages: (TournamentStage | null)[] = [
      null,
      'groups',
      'r16',
      'quarter',
      'semi',
      'final',
      'champion',
      'eliminated',
    ]
    for (const eligible of [true, false]) {
      for (const hasTournamentThisYear of [true, false]) {
        for (const stage of stages) {
          const action = seasonEndAction({ eligible, hasTournamentThisYear, stage })
          expect(['callup', 'tournament', 'close']).toContain(action)
        }
      }
    }
  })
})

describe('fases em que a seleção ainda joga', () => {
  test('oitavas e quartas contam — foi o que sumiu com a Copa de 32', () => {
    expect(isTournamentRunning('r16')).toBe(true)
    expect(isTournamentRunning('quarter')).toBe(true)
  })

  test('grupos, semi e final também', () => {
    expect(isTournamentRunning('groups')).toBe(true)
    expect(isTournamentRunning('semi')).toBe(true)
    expect(isTournamentRunning('final')).toBe(true)
  })

  test('campeão e eliminado não têm mais jogo', () => {
    expect(isTournamentRunning('champion')).toBe(false)
    expect(isTournamentRunning('eliminated')).toBe(false)
  })
})
