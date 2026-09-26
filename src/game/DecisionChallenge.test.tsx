import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { jogadaLabel } from '../data/narration'
import { DEFAULT_ATTRIBUTES } from '../engine/career/attributes'
import { chanceDeTerminarEmGol } from '../engine/decision/assist'
import { modificadoresPara, type ContextoDaJogada } from '../engine/decision/context'
import { QUANTAS_OPCOES, sortearJogadas } from '../engine/decision/draw'
import { distribuicao } from '../engine/decision/weights'
import { createRng } from '../engine/rng'
import { DecisionChallenge } from './DecisionChallenge'

const CONTEXTO: ContextoDaJogada = {
  attributes: DEFAULT_ATTRIBUTES,
  perks: [],
  tatica: 'equilibrado',
  momentum: 0,
  edges: { attack: 0.3, defense: 0, midfield: 0 },
  travamento: 0,
}

const RNG = createRng(2024)

const render = (contexto = CONTEXTO): string =>
  renderToStaticMarkup(
    <DecisionChallenge intro="Você recebe de costas e gira." rng={RNG} contexto={contexto} onResolved={() => {}} />,
  )

const pct = (valor: number): number => Math.round(valor * 100)

describe('tela da decisão', () => {
  test('oferece cinco jogadas, uma por botão, cada uma com o nome do catálogo', () => {
    const html = render()
    const menu = sortearJogadas(RNG).value
    expect(menu).toHaveLength(QUANTAS_OPCOES)
    expect(html.match(/<button/g)).toHaveLength(QUANTAS_OPCOES)
    for (const jogada of menu) {
      expect(html).toContain(jogadaLabel(jogada.id))
    }
  })

  test('o GOL da tela é a chance real de terminar em gol — desconta a conversão do time', () => {
    const html = render()
    for (const jogada of sortearJogadas(RNG).value) {
      const dist = distribuicao(jogada, modificadoresPara(jogada, CONTEXTO))
      const honesto = pct(chanceDeTerminarEmGol(dist, CONTEXTO.edges.attack))
      const inflado = pct(dist.gol + dist.chance)
      expect(html, jogada.id).toContain(`${honesto}% de chance de terminar em gol`)
      if (inflado !== honesto) {
        expect(html, jogada.id).not.toContain(`${inflado}% de chance de terminar em gol`)
      }
    }
  })

  test('o CONTRA da tela é o que o dado usa', () => {
    const html = render()
    for (const jogada of sortearJogadas(RNG).value) {
      const dist = distribuicao(jogada, modificadoresPara(jogada, CONTEXTO))
      expect(html, jogada.id).toContain(`${pct(dist.contra)}% de risco de sofrer no contra-ataque`)
    }
  })

  test('cada opção anuncia o atributo que a governa e a faixa pela borda', () => {
    const html = render()
    for (const jogada of sortearJogadas(RNG).value) {
      expect(html, jogada.id).toContain(`decision-${jogada.faixa}`)
    }
    // o sorteio garante uma jogada de cada faixa, então as três bordas aparecem
    expect(html).toContain('decision-option decision-alta')
    expect(html).toContain('decision-option decision-media')
    expect(html).toContain('decision-option decision-baixa')
    expect(html).toMatch(/decision-attr[^>]*>(FIN|PAS|COB)</)
  })

  test('sem cronômetro: o lance espera a decisão', () => {
    const html = render()
    expect(html).not.toContain('timebar')
    expect(html).toContain('Sem pressa')
  })

  test('é um diálogo com título e legenda para leitores de tela', () => {
    const html = render()
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-labelledby="decision-intro"')
    expect(html).toContain('Você recebe de costas e gira.')
    expect(html).toContain('Significado das probabilidades')
  })

  test('o mesmo menu muda de número quando a build muda', () => {
    const matador = render({ ...CONTEXTO, attributes: { ...DEFAULT_ATTRIBUTES, finalizacao: 10 } })
    const novato = render({ ...CONTEXTO, attributes: { ...DEFAULT_ATTRIBUTES, finalizacao: 1 } })
    expect(matador).not.toBe(novato)
    // o menu é o mesmo (mesmo rng): só os números mudam
    for (const jogada of sortearJogadas(RNG).value) {
      expect(matador).toContain(jogadaLabel(jogada.id))
      expect(novato).toContain(jogadaLabel(jogada.id))
    }
  })
})
