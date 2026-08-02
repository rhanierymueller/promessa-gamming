import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { LIFE_EVENTS } from '../engine/career/events'
import { createSave, declinePendingEvent, resolvePendingEvent, type PlayerSave } from '../state/save'
import { MixedZoneModal } from './MixedZoneModal'

const comEvento = (): PlayerSave => {
  const save = createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!
  return { ...save, pendingEvent: { templateId: LIFE_EVENTS[0].id, seed: 7 } }
}

const render = (save: PlayerSave): string =>
  renderToStaticMarkup(<MixedZoneModal save={save} onAnswer={() => {}} onDecline={() => {}} />)

describe('modal da zona mista', () => {
  test('é um diálogo modal, não um card no meio da tela', () => {
    const html = render(comEvento())
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('mixedzone-overlay')
  })

  test('monta a cena da entrevista: repórter, microfone e o craque', () => {
    const html = render(comEvento())
    expect(html).toContain('mixedzone-face-reporter')
    expect(html).toContain('mixedzone-face-player')
    expect(html).toContain('mixedzone-mic')
    expect(html).toContain('Tuca')
  })

  test('traz a pergunta e as três respostas', () => {
    const html = render(comEvento())
    // o prompt tem aspas, que o React escapa: compara pelo primeiro trecho
    expect(html).toContain(LIFE_EVENTS[0].prompt.split('"')[0].trim())
    expect(html.match(/class="mixedzone-option /g)).toHaveLength(3)
    for (const option of LIFE_EVENTS[0].options) {
      expect(html).toContain(option.label)
    }
  })

  test('dá a saída de quem não quer falar', () => {
    expect(render(comEvento())).toContain('sem falar')
  })

  test('sem evento pendente, não há modal', () => {
    const save = createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!
    expect(render(save)).toBe('')
  })
})

describe('sair sem responder', () => {
  test('fecha a zona mista sem mexer em moral nem em treino', () => {
    // Arrange
    const save = comEvento()

    // Act
    const depois = declinePendingEvent(save)

    // Assert
    expect(depois.pendingEvent).toBeNull()
    expect(depois.morale).toBe(save.morale)
    expect(depois.trainingPoints).toBe(save.trainingPoints)
    expect(depois.eventNote).toBeNull()
  })

  test('responder continua mexendo na moral — o silêncio é que é neutro', () => {
    // Arrange
    const save = comEvento()

    // Act
    const respondeu = resolvePendingEvent(save, 1)
    const calou = declinePendingEvent(save)

    // Assert
    expect(respondeu.morale).not.toBe(calou.morale)
  })

  test('sem evento pendente, não faz nada', () => {
    const save = createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!
    expect(declinePendingEvent(save)).toBe(save)
  })
})
