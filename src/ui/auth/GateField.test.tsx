import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { fieldInputType, GateField } from './GateField'

const render = (type: 'password' | 'email' = 'password'): string =>
  renderToStaticMarkup(
    <GateField label="Senha" value="segredo123" onChange={() => {}} type={type} />,
  )

describe('olho da senha', () => {
  test('senha nasce escondida', () => {
    expect(fieldInputType('password', false)).toBe('password')
  })

  test('revelada, a senha vira texto comum na tela', () => {
    expect(fieldInputType('password', true)).toBe('text')
  })

  test('revelar não mexe em campo que não é senha', () => {
    // o estado é por campo, mas a regra também precisa ser: e-mail continua e-mail
    expect(fieldInputType('email', true)).toBe('email')
    expect(fieldInputType('text', true)).toBe('text')
    expect(fieldInputType('number', true)).toBe('number')
  })

  test('o campo de senha traz o botão, com nome que o leitor de tela anuncia', () => {
    const html = render()
    expect(html).toContain('field-reveal')
    expect(html).toContain('aria-label="Mostrar senha"')
    // começa desligado: quem abre a tela não expõe a senha sem pedir
    expect(html).toContain('aria-pressed="false"')
  })

  test('campo comum não ganha olho — não há o que esconder', () => {
    expect(render('email')).not.toContain('field-reveal')
  })
})
