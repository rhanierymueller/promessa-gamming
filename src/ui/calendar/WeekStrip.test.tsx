import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { createSave, type PlayerSave } from '../../state/save'
import { advanceDay, isMatchDay } from '../../engine/career/clock'
import { WeekStrip } from './WeekStrip'

const base = (): PlayerSave => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

/** Leva o relógio até o dia da partida, como faria o botão de avançar. */
const atMatchDay = (): PlayerSave => {
  let save = base()
  for (let i = 0; i < 400 && !isMatchDay(save); i++) save = advanceDay(save)
  return save
}

const render = (save: PlayerSave): string =>
  renderToStaticMarkup(<WeekStrip save={save} onSaveChange={() => {}} />)

describe('semana da carreira', () => {
  test('mostra os sete dias da semana corrente', () => {
    const html = render(base())
    expect(html.match(/<li/g)).toHaveLength(7)
  })

  test('o dia de hoje vem marcado', () => {
    expect(render(base())).toContain('week-day-today')
  })

  test('conta quantos dias faltam para o jogo', () => {
    expect(render(base())).toContain('dias até o jogo')
  })

  test('na véspera, avisa que o jogo é amanhã', () => {
    // Arrange
    let save = base()
    while (!isMatchDay(advanceDay(save))) save = advanceDay(save)

    // Assert
    expect(render(save)).toContain('jogo amanhã')
  })

  test('no dia do jogo some o botão de avançar — o relógio parou', () => {
    // Act
    const html = render(atMatchDay())

    // Assert
    expect(html).toContain('dia de jogo')
    expect(html).not.toContain('Avançar dias')
  })

  test('o dia com jogo acende na cor da competição', () => {
    const html = render(atMatchDay())
    expect(html).toContain('week-day-match')
    expect(html).toContain('cal-comp-liga')
  })

  test('fora do dia de jogo, o botão de avançar está disponível', () => {
    expect(render(base())).toContain('Avançar dias')
  })
})
