import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { perkById, type PerkId } from '../engine/career/perks'
import { createSave, type PlayerSave } from '../state/save'
import { PerkOfferModal } from './PerkOfferModal'

const OPTIONS: readonly PerkId[] = ['folha-seca', 'frieza', 'maestro']

const comOferta = (): PlayerSave => {
  const save = createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!
  return { ...save, perkOffer: { options: OPTIONS } }
}

const render = (save: PlayerSave): string =>
  renderToStaticMarkup(<PerkOfferModal save={save} onChoose={() => {}} />)

describe('modal da habilidade nova', () => {
  test('é modal, como a zona mista — não um card no meio da Home', () => {
    const html = render(comOferta())
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('mixedzone-overlay')
  })

  test('divide o esqueleto com a zona mista', () => {
    // um formato só para os dois momentos de "o jogo parou para você escolher"
    const html = render(comOferta())
    expect(html).toContain('mixedzone-modal')
    expect(html).toContain('mixedzone-options')
    expect(html).toContain('mixedzone-option')
  })

  test('lista as três habilidades com nome e efeito', () => {
    const html = render(comOferta())
    for (const perkId of OPTIONS) {
      const perk = perkById(perkId)
      expect(html).toContain(perk.name)
      expect(html).toContain(perk.description)
    }
  })

  test('não tem saída: a escolha é obrigatória', () => {
    const html = render(comOferta())
    expect(html).not.toContain('mixedzone-close')
    expect(html).not.toContain('mixedzone-skip')
    expect(html).toContain('Não tem volta')
  })

  test('sem oferta pendente, não há modal', () => {
    const save = createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!
    expect(render(save)).toBe('')
  })
})
