import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { HOME_TOUR_STEPS, MATCH_TOUR_STEPS, OnboardingTour } from './OnboardingTour'

const render = (steps = HOME_TOUR_STEPS): string =>
  renderToStaticMarkup(<OnboardingTour steps={steps} onDone={() => {}} />)

describe('tour de boas-vindas', () => {
  test('é um modal que toma a tela na primeira visita', () => {
    const html = render()
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('tour-overlay')
  })

  test('abre no primeiro passo, com progresso e saída', () => {
    const html = render()
    expect(html).toContain(HOME_TOUR_STEPS[0].title)
    expect(html).toContain(HOME_TOUR_STEPS[0].text)
    // um ponto por passo, o primeiro aceso
    expect(html.split('tour-dot"').length - 1 + (html.split('tour-dot-active').length - 1)).toBe(
      HOME_TOUR_STEPS.length,
    )
    expect(html).toContain('Pular')
    expect(html).toContain('Próximo')
  })

  test('tour de um passo só vai direto ao fecho, sem Pular', () => {
    const html = render([MATCH_TOUR_STEPS[MATCH_TOUR_STEPS.length - 1]])
    expect(html).toContain('Vamos jogar!')
    expect(html).not.toContain('Pular')
  })

  test('o tour da home apresenta as áreas principais do jogo', () => {
    const titles = HOME_TOUR_STEPS.map((step) => step.title).join(' ')
    expect(titles).toContain('Bem-vindo')
    // o último passo ensina onde mora a ajuda permanente
    expect(HOME_TOUR_STEPS[HOME_TOUR_STEPS.length - 1].text).toContain('“?”')
  })

  test('o tour da partida explica lances, dados e a nota', () => {
    const texts = MATCH_TOUR_STEPS.map((step) => step.text).join(' ')
    expect(texts).toContain('dados')
    expect(texts).toContain('nota')
    expect(texts).toContain('W.O.')
  })
})
