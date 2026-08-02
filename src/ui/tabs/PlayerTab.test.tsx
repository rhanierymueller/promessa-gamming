import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import type { Award } from '../../engine/career/awards'
import { createSave, type PlayerSave } from '../../state/save'
import { PlayerTab } from './PlayerTab'

const base = (): PlayerSave => createSave({ playerName: 'Tuca', clubId: 'leoes-capital' })!

const render = (save: PlayerSave): string =>
  renderToStaticMarkup(<PlayerTab save={save} onSaveChange={() => {}} />)

const AWARDS: readonly Award[] = [
  { kind: 'chuteira', competition: 'liga', year: 1, value: 21 },
  { kind: 'melhor-jogador', competition: 'libertados', year: 2, value: 8.4 },
]

describe('quarto do craque', () => {
  test('a cena é a arte do quarto com o pôster por cima', () => {
    const html = render(base())
    expect(html).toContain('room-scene')
    expect(html).toContain('room-art')
    expect(html).toContain('room-poster')
  })

  test('arte e peças vivem no mesmo palco — é o que as mantém coladas', () => {
    // sem o palco, o recorte do celular escalava só a imagem e os troféus
    // ficavam flutuando fora das prateleiras
    const html = render({ ...base(), trophies: [{ kind: 'copa-brasil', year: 1 }] })
    const stage = html.indexOf('room-stage')
    expect(stage).toBeGreaterThan(-1)
    expect(html.indexOf('room-art')).toBeGreaterThan(stage)
    expect(html.indexOf('room-piece-art')).toBeGreaterThan(stage)
  })

  test('o pôster traz nome, posição e camisa — curto, para caber na moldura', () => {
    const save = base()
    const html = render(save)
    expect(html).toContain('Tuca')
    expect(html).toContain(save.playerPosition)
    expect(html).toContain(`#${save.shirtNumber}`)
  })

  test('mostra clube e seleção', () => {
    const html = render(base())
    expect(html).toContain('room-badge')
    expect(html).toContain('Clube')
    expect(html).toContain('Seleção')
  })

  test('o painel de substituição traz os números da carreira', () => {
    const html = render(base())
    expect(html).toContain('subboard')
    for (const label of ['Gols', 'Jogos', 'Vitórias', 'Taças', 'Prêmios', 'Nota']) {
      expect(html).toContain(label)
    }
  })

  test('estante vazia convida em vez de ficar em branco', () => {
    const html = render(base())
    expect(html).toContain('prateleiras estão vazias')
  })

  test('cada prêmio vira uma peça na prateleira', () => {
    // Act
    const html = render({ ...base(), awards: AWARDS })

    // Assert
    expect(html.match(/room-piece-art/g)).toHaveLength(AWARDS.length)
    expect(html).not.toContain('prateleiras estão vazias')
  })

  test('prêmio repetido vira UMA peça com contador, não duas peças', () => {
    // Arrange: a mesma chuteira em três temporadas
    const tresVezes: readonly Award[] = [
      { kind: 'chuteira', competition: 'liga', year: 1, value: 18 },
      { kind: 'chuteira', competition: 'liga', year: 2, value: 21 },
      { kind: 'chuteira', competition: 'liga', year: 3, value: 15 },
    ]

    // Act
    const html = render({ ...base(), awards: tresVezes })

    // Assert
    expect(html.match(/room-piece-art/g)).toHaveLength(1)
    expect(html).toContain('3×')
  })

  test('peça única não ganha contador — "1×" seria ruído', () => {
    const html = render({ ...base(), awards: [AWARDS[0]] })
    expect(html).not.toContain('1×')
  })

  test('as taças do clube ocupam a prateleira de cima', () => {
    const html = render({
      ...base(),
      trophies: [
        { kind: 'serie-b', year: 1 },
        { kind: 'serie-b', year: 3 },
        { kind: 'libertados', year: 4 },
      ],
    })
    // duas peças: a Série B agrupada e a Libertados
    expect(html.match(/room-piece-art/g)).toHaveLength(2)
    expect(html).toContain('2×')
  })

  test('treinar atributo mora aqui agora, com os pontos disponíveis', () => {
    const html = render({ ...base(), trainingPoints: 12 })
    expect(html).toContain('pts de treino')
    expect(html).toContain('attr-btn')
  })

  test('aparência e comemoração também vieram do Perfil', () => {
    const html = render(base())
    expect(html).toContain('swatch-row')
    expect(html).toContain('celebration-grid')
    expect(html).toContain('Comemoração')
  })

  test('atributos aparecem com o nível de cada um', () => {
    const html = render(base())
    expect(html).toContain('room-attr')
    expect(html).toContain('Finalização')
  })

  test('sem habilidade nenhuma, a seção não aparece', () => {
    expect(render(base())).not.toContain('room-perks')
  })

  test('com habilidade, ela entra com nome e efeito', () => {
    const html = render({ ...base(), perks: ['frieza'] })
    expect(html).toContain('room-perk')
    expect(html).toContain('Frieza')
  })
})
