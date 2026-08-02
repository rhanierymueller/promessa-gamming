import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { computeTable } from '../engine/season/season'
import { createSave, type PlayerSave } from '../state/save'
import { StandingsPeek } from './StandingsPeek'

const base = (): PlayerSave => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

const render = (save: PlayerSave): string =>
  renderToStaticMarkup(<StandingsPeek save={save} />)

/**
 * Um save cujo clube ocupa a posição pedida. Adota o clube que JÁ está lá em
 * vez de reordenar a tabela: `computeTable` ordena por pontos, então mexer em
 * `participants` não movia ninguém de lugar.
 */
const naPosicao = (position: number): PlayerSave => {
  const save = base()
  const table = computeTable(save.season)
  return { ...save, clubId: table[position].clubId }
}

describe('recorte da tabela na Home', () => {
  test('mostra sete linhas: você, três acima e três abaixo', () => {
    const html = render(naPosicao(6))
    expect(html.match(/class="peek-row/g)).toHaveLength(7)
  })

  test('a sua linha vem destacada', () => {
    expect(render(base())).toContain('peek-row-you')
  })

  test('as linhas das pontas desbotam', () => {
    const html = render(naPosicao(6))
    expect(html.match(/peek-row-fade/g)).toHaveLength(2)
  })

  test('líder também vê sete linhas — a janela desliza', () => {
    // sem deslizar, quem está em 1º veria só quatro linhas
    const html = render(naPosicao(0))
    expect(html.match(/class="peek-row/g)).toHaveLength(7)
    expect(html).toContain('>1<')
  })

  test('lanterna idem, sem estourar o fim da tabela', () => {
    const save = base()
    const total = computeTable(save.season).length
    const html = render(naPosicao(total - 1))
    expect(html.match(/class="peek-row/g)).toHaveLength(7)
    expect(html).toContain(`>${total}<`)
  })

  test('anuncia a divisão e a posição no cabeçalho', () => {
    const html = render(base())
    expect(html).toContain('Série')
    expect(html).toMatch(/\d+º de \d+/)
  })

  test('traz só o essencial: sem gols pró, contra ou saldo', () => {
    // a tabela cheia é da aba Liga; aqui é recorte
    const html = render(base())
    expect(html).toContain('peek-points')
    expect(html).not.toContain('table-num')
  })
})
