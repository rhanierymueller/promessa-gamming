import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { createSave, type PlayerSave } from '../../state/save'
import type { ScheduledMatch } from '../../engine/career/schedule'
import { MonthGrid } from './MonthGrid'

const save = (): PlayerSave => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

const match = (over: Partial<ScheduledMatch> = {}): ScheduledMatch => ({
  competition: 'liga',
  date: { year: 2026, month: 2, day: 7 },
  stageLabel: 'Rodada 1',
  opponentId: 'mare-rubra',
  isHome: true,
  isPlayed: false,
  result: null,
  ...over,
})

const render = (
  schedule: readonly ScheduledMatch[],
  month = 2,
  next: ScheduledMatch | null = null,
): string =>
  renderToStaticMarkup(
    <MonthGrid
      save={save()}
      schedule={schedule}
      year={2026}
      month={month}
      onMonthChange={() => {}}
      next={next}
    />,
  )

describe('grade do mês', () => {
  test('o dia de jogo herda a cor da competição', () => {
    // Act
    const html = render([
      match(),
      match({ competition: 'libertados', date: { year: 2026, month: 2, day: 11 } }),
    ])

    // Assert
    expect(html).toContain('cal-comp-liga')
    expect(html).toContain('cal-comp-libertados')
  })

  test('jogo de outro mês não aparece na grade exibida', () => {
    const html = render([match({ date: { year: 2026, month: 5, day: 3 }, opponentId: 'pampa' })], 2)
    expect(html).not.toContain('cal-day-match')
  })

  test('jogo disputado mostra o placar; o futuro, o mando', () => {
    expect(render([match({ isPlayed: true, result: { teamGoals: 2, opponentGoals: 0 } })])).toContain(
      'fixture-win',
    )
    expect(render([match({ isHome: false })])).toContain('fora')
  })

  test('o próximo compromisso vem destacado no dia dele', () => {
    const proximo = match({ date: { year: 2026, month: 2, day: 14 } })
    const html = render([match({ isPlayed: true }), proximo], 2, proximo)
    expect(html).toContain('cal-day-next')
  })

  test('copa sem sorteio mostra a taça e o nome da competição', () => {
    // Act
    const html = render(
      [
        match({
          competition: 'copa-mundo',
          opponentId: null,
          stageLabel: 'Semifinal',
          date: { year: 2026, month: 2, day: 20 },
        }),
      ],
      2,
    )

    // Assert
    expect(html).toContain('cal-day-cup-icon')
    expect(html).toContain('Copa do Mundo')
  })

  test('a legenda lista as competições do ano — e some quando só há uma', () => {
    // Arrange + Act
    const comDuas = render([
      match(),
      match({ competition: 'libertados', date: { year: 2026, month: 2, day: 11 } }),
    ])
    const soLiga = render([match()])

    // Assert
    expect(comDuas).toContain('cal-legend')
    expect(comDuas).toContain('Libertados')
    expect(soLiga).not.toContain('cal-legend')
  })
})
