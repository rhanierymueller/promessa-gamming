import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { COPA_BRASIL_TEAMS } from '../../engine/copaBrasil/types'
import { GROUP_COUNT } from '../../engine/libertados/types'
import { CupNights } from './CupNights'

const html = (): string => renderToStaticMarkup(<CupNights />)

describe('noites de copa na tela inicial', () => {
  test('apresenta as duas copas de clube', () => {
    expect(html()).toContain('Copa Libertados')
    expect(html()).toContain('Copa do Brasil')
  })

  test('cada copa tem a arte da própria taça', () => {
    const markup = html()
    expect(markup).toContain('cupnights-cup-libertados')
    expect(markup).toContain('cupnights-cup-copa-brasil')
    expect(markup.match(/cupnights-art/g)).toHaveLength(2)
  })

  test('os números vêm do motor, não do texto escrito à mão', () => {
    // se o formato da competição mudar, a tela inicial acompanha sozinha
    const markup = html()
    expect(markup).toContain(String(COPA_BRASIL_TEAMS))
    expect(markup).toContain(String(GROUP_COUNT))
  })

  test('a arte de cena é decorativa e não entra na leitura', () => {
    const markup = html()
    expect(markup).toContain('cupnights-floodlight')
    expect(markup).toContain('cupnights-haze')
    // as imagens das taças são decorativas: alt vazio
    expect(markup).not.toMatch(/<img[^>]*alt="[^"]+"/)
  })
})
