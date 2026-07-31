import { CLUBS } from '../../data/clubs'
import { NATIONS } from '../../data/nations'
import { SQUAD_SIZE } from '../../engine/squad/players'
import { buildTickerResults, DIVISION_LABELS } from './tickerLines'

/**
 * O placar pendurado no escuro: os números do mundo do jogo em LED, e embaixo
 * a rodada correndo. Uma das lâmpadas está fraca de propósito — placar de
 * estádio de verdade sempre tem defeito.
 */

interface Stat {
  readonly value: string
  readonly label: string
  readonly dim?: boolean
}

/*
 * Os números saem da própria base do jogo. Escritos à mão eles envelhecem
 * escondido: o painel anunciava "16 seleções" enquanto o mundo já tinha 35 —
 * e a Copa do Mundo sozinha sorteia 32 delas.
 */

/** Arredondado para baixo na centena; o "+" cobre os elencos de seleção. */
const GENERATED_PLAYERS = Math.floor((CLUBS.length * SQUAD_SIZE) / 100) * 100

const STATS: readonly Stat[] = [
  { value: String(CLUBS.length), label: 'clubes fictícios' },
  { value: String(DIVISION_LABELS.length), label: 'divisões', dim: true },
  { value: `${GENERATED_PLAYERS}+`, label: 'jogadores gerados' },
  { value: String(NATIONS.length), label: 'seleções' },
]

export const LedBoard = () => {
  const results = buildTickerResults()
  // duplicado para o ticker emendar sem salto no fim do laço
  const loop = [...results, ...results]

  return (
    <section className="led">
      <div className="led-board reveal">
        <div className="led-head">
          <span>Placar do mundo · Promessa</span>
          <span className="led-live">ao vivo</span>
        </div>
        <div className="led-grid">
          {STATS.map((stat) => (
            <div key={stat.label} className={`led-cell${stat.dim ? ' led-cell-dim' : ''}`}>
              <span className="led-value">{stat.value}</span>
              <span className="led-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ticker reveal" aria-hidden="true">
        <div className="ticker-track">
          {loop.map((result, index) => (
            <span className="ticker-item" key={`${result.home.id}-${index}`}>
              <span className="ticker-div">{DIVISION_LABELS[result.division]}</span>{' '}
              <b>{result.home.abbr}</b> <em>{result.homeGoals}</em>
              {' × '}
              <em>{result.awayGoals}</em> <b>{result.away.abbr}</b>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
