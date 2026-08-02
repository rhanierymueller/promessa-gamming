import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { CLUBS } from '../../data/clubs'
import { divisionOf } from '../../engine/pyramid/pyramid'
import { createSave, renameClub, type PlayerSave } from '../../state/save'
import { EditorTab } from './EditorTab'

const base = (): PlayerSave => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

const render = (save: PlayerSave): string =>
  renderToStaticMarkup(<EditorTab save={save} onSaveChange={() => {}} />)

describe('aba do editor de clubes', () => {
  test('abre na divisão do jogador — é onde ele quer mexer primeiro', () => {
    // Arrange
    const save = base()
    const minhaDivisao = divisionOf(save.divisions, save.clubId)

    // Act
    const html = render(save)

    // Assert: os clubes listados são os da divisão dele
    const daMinha = CLUBS.filter((club) => divisionOf(save.divisions, club.id) === minhaDivisao)
    for (const club of daMinha) expect(html).toContain(club.name)
  })

  test('lista só a divisão aberta, não os 56 clubes de uma vez', () => {
    // Arrange
    const save = base()
    const outra = CLUBS.find((club) => divisionOf(save.divisions, club.id) === 3)!

    // Act + Assert: um clube da Série D não aparece com a Série A aberta
    if (divisionOf(save.divisions, save.clubId) !== 3) {
      expect(render(save)).not.toContain(outra.name)
    }
  })

  test('traz as quatro divisões para escolher', () => {
    // `role="tab"` conta só os botões; a classe casaria com o container
    // `editor-divisions` no plural e devolveria um a mais
    const html = render(base())
    expect(html.match(/role="tab"/g)).toHaveLength(4)
  })

  test('cada clube tem nome, região, sigla, escudo e as duas cores', () => {
    const html = render(base())
    expect(html).toContain('club-edit-input')
    expect(html).toContain('club-edit-city')
    expect(html).toContain('club-edit-abbr')
    expect(html).toContain('crest-upload')
    expect(html.match(/club-color-input/g)?.length).toBeGreaterThanOrEqual(2)
  })

  test('região e sigla trazem o valor de fábrica como placeholder', () => {
    // Arrange
    const save = base()
    const meu = CLUBS.find((club) => club.id === save.clubId)!

    // Act
    const html = render(save)

    // Assert: o campo vazio mostra o que o clube é hoje
    expect(html).toContain(`placeholder="${meu.city}"`)
    expect(html).toContain(`placeholder="${meu.abbr}"`)
  })

  test('clube renomeado mostra o nome original como referência', () => {
    // Arrange
    const save = renameClub(base(), 'leoes-capital', 'Corinthians')

    // Act
    const html = render(save)

    // Assert: o campo traz o apelido novo e a linha de baixo, o nome de fábrica
    expect(html).toContain('Corinthians')
    expect(html).toContain('Atlético da Capital')
  })
})
