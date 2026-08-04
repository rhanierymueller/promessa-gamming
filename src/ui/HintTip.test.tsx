import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { HintTip } from './HintTip'

const render = (): string =>
  renderToStaticMarkup(<HintTip label="Como funciona batizar">Vale uma vez só.</HintTip>)

describe('dica explicativa', () => {
  test('nasce fechada — a bolha não ocupa a tela sem pedido', () => {
    const html = render()
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('role="tooltip"')
  })

  test('o botão se anuncia: leitor de tela sabe o que abre ali', () => {
    expect(render()).toContain('aria-label="Como funciona batizar"')
  })

  test('é um botão de verdade, alcançável pelo teclado', () => {
    // um ícone decorativo com hover deixaria a explicação fora do alcance de
    // quem navega por tab — e de quem usa celular
    expect(render()).toContain('<button')
    expect(render()).toContain('type="button"')
  })
})
