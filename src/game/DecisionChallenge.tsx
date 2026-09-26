import { useMemo, useRef } from 'react'
import { jogadaLabel } from '../data/narration'
import { ATTRIBUTE_ABBR, ATTRIBUTE_LABELS } from '../engine/career/attributes'
import { chanceDeTerminarEmGol } from '../engine/decision/assist'
import type { Jogada } from '../engine/decision/catalog'
import { modificadoresPara, type ContextoDaJogada } from '../engine/decision/context'
import { sortearJogadas } from '../engine/decision/draw'
import { jogarDecisao, type Resolucao } from '../engine/decision/resolve'
import { distribuicao } from '../engine/decision/weights'
import type { RngState } from '../engine/rng'

/**
 * O lance de decisão: cinco jogadas, sem cronômetro, com o risco à vista.
 *
 * Mostra dois números por jogada, e os dois importam:
 *   GOL    — chance de a jogada terminar em gol do seu time, seu ou do
 *            companheiro que você deixou na cara do gol
 *   CONTRA — chance de perder a bola e tomar o contra-ataque
 *
 * Um número só para o lado bom da jogada. Quem decide em campo pensa "isso
 * vira gol?", não "isso vira gol MEU ou dele?" — separar as duas colunas
 * enchia a tela de porcentagem e deixava a escolha pesada. Mas a chance criada
 * SÓ vira gol depois da rolagem do elenco, então o número não é `gol + chance`:
 * é `gol + chance × conversão`, calculado por `chanceDeTerminarEmGol`. Somar as
 * duas colunas mostrava 36% em "cavar a falta" quando o dado entregava ~16%.
 *
 * A porcentagem exibida sai de `distribuicao` e de `chanceDeConverter`, as
 * MESMAS funções que `jogarDecisao` consome para sortear. Não existe caminho
 * onde o número da tela difira do número do dado.
 */

export interface DecisionOutcome {
  readonly jogada: Jogada
  readonly resolucao: Resolucao
  /** Só faz sentido no desfecho `chance`: o time converteu? */
  readonly assistConvertida: boolean
}

interface DecisionChallengeProps {
  readonly intro: string
  readonly rng: RngState
  readonly contexto: ContextoDaJogada
  readonly onResolved: (outcome: DecisionOutcome, next: RngState) => void
}

const pct = (valor: number): number => Math.round(valor * 100)

export const DecisionChallenge = ({ intro, rng, contexto, onResolved }: DecisionChallengeProps) => {
  const menu = useMemo(() => sortearJogadas(rng), [rng])

  const opcoes = useMemo(
    () =>
      menu.value.map((jogada) => {
        const dist = distribuicao(jogada, modificadoresPara(jogada, contexto))
        return {
          jogada,
          gol: pct(chanceDeTerminarEmGol(dist, contexto.edges.attack)),
          risco: pct(dist.contra),
        }
      }),
    [menu, contexto],
  )

  // um lance, uma escolha: cliques repetidos não podem resolver duas vezes
  const resolvidoRef = useRef(false)
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved

  const escolher = (jogada: Jogada): void => {
    if (resolvidoRef.current) return
    resolvidoRef.current = true

    const lance = jogarDecisao(jogada, modificadoresPara(jogada, contexto), menu.next)
    onResolvedRef.current({ jogada, ...lance.value }, lance.next)
  }

  return (
    <div
      className="decision-overlay"
      role="dialog"
      aria-labelledby="decision-intro"
    >
      <p className="decision-intro" id="decision-intro">{intro}</p>
      <div className="decision-probability-legend" aria-label="Significado das probabilidades">
        <span className="decision-legend-item decision-gol">
          <span className="decision-legend-dot" aria-hidden="true" />
          <span><strong>GOL</strong> a jogada termina em gol — seu ou do companheiro</span>
        </span>
        <span className="decision-legend-item decision-risco">
          <span className="decision-legend-dot" aria-hidden="true" />
          <span><strong>CONTRA</strong> perde a bola e sofre no contra-ataque</span>
        </span>
      </div>
      <div className="decision-options">
        {opcoes.map(({ jogada, gol, risco }) => {
          const label = jogadaLabel(jogada.id)
          return (
            <button
              key={jogada.id}
              className={`decision-option decision-${jogada.faixa}`}
              onClick={() => escolher(jogada)}
              aria-label={
                `${label}. Atributo ${ATTRIBUTE_LABELS[jogada.atributo]}. ` +
                `${gol}% de chance de terminar em gol, ` +
                `${risco}% de risco de sofrer no contra-ataque.`
              }
            >
              <span className="decision-label">{label}</span>
              <span className="decision-meta">
                <span className="decision-attr" title={ATTRIBUTE_LABELS[jogada.atributo]}>
                  {ATTRIBUTE_ABBR[jogada.atributo]}
                </span>
                <span className="decision-stat decision-gol">
                  <span className="decision-stat-key">GOL</span> {gol}%
                </span>
                <span className="decision-stat decision-risco">
                  <span className="decision-stat-key">CONTRA</span> {risco}%
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="decision-variance-legend" aria-label="Significado da cor da borda">
        <span className="decision-variance-title">Borda da jogada:</span>
        <span><i className="decision-variance-swatch decision-variance-alta" /> ousada</span>
        <span><i className="decision-variance-swatch decision-variance-media" /> equilibrada</span>
        <span><i className="decision-variance-swatch decision-variance-baixa" /> segura</span>
      </div>
      <p className="decision-hint">
        Sem pressa — o lance espera. Jogada ousada rende mais nota, e nota vira treino.
      </p>
    </div>
  )
}
