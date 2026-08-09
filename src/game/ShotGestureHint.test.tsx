import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { ShotGestureHint } from './ShotGestureHint'

describe('mãozinha do primeiro chute', () => {
  test('demonstra o gesto com mão, rastro e legenda', () => {
    const html = renderToStaticMarkup(<ShotGestureHint />)
    expect(html).toContain('gesture-hand')
    expect(html).toContain('gesture-trail')
    expect(html).toContain('Arraste da bola até o gol')
  })

  test('é só demonstração: invisível para leitores de tela e sem interação', () => {
    const html = renderToStaticMarkup(<ShotGestureHint />)
    expect(html).toContain('aria-hidden="true"')
    // nenhum controle: quem toca no palco fala com o canvas, não com a dica
    expect(html).not.toContain('<button')
  })
})
