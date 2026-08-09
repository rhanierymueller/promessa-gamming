import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { FAQ_ENTRIES, HelpFaq } from './HelpFaq'

describe('ajuda com perguntas comuns', () => {
  test('fechada, é só o botão "?" no cabeçalho', () => {
    const html = renderToStaticMarkup(<HelpFaq />)
    expect(html).toContain('aria-label="Ajuda"')
    expect(html).not.toContain('aria-modal')
  })

  test('aberta, vira modal com todas as perguntas e respostas', () => {
    const html = renderToStaticMarkup(<HelpFaq defaultOpen />)
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('Perguntas comuns')
    for (const entry of FAQ_ENTRIES) {
      expect(html).toContain(entry.question)
      expect(html).toContain(entry.answer)
    }
  })

  test('cada pergunta é um details nativo — abre sem JavaScript', () => {
    const html = renderToStaticMarkup(<HelpFaq defaultOpen />)
    expect(html.split('<details').length - 1).toBe(FAQ_ENTRIES.length)
    expect(html).toContain('<summary')
  })

  test('a FAQ cobre as dúvidas de quem chega agora', () => {
    const questions = FAQ_ENTRIES.map((entry) => entry.question).join(' ')
    expect(questions).toContain('Como jogo uma partida?')
    expect(questions).toContain('Meu progresso fica salvo?')
    expect(questions).toContain('lance dos dados')
  })
})
