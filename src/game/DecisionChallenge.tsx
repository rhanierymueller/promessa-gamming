import { useMemo, useRef } from 'react'
import { jogadaLabel } from '../data/narration'
import { ATTRIBUTE_ABBR, ATTRIBUTE_LABELS } from '../engine/career/attributes'
import { rolarAssistencia } from '../engine/decision/assist'
import type { Jogada } from '../engine/decision/catalog'
import { modificadoresPara, type ContextoDaJogada } from '../engine/decision/context'
import { sortearJogadas } from '../engine/decision/draw'
import { resolverDecisao, type Resolucao } from '../engine/decision/resolve'
import { distribuicao } from '../engine/decision/weights'
import type { RngState } from '../engine/rng'

/**
 * O lance de decisão: cinco jogadas, sem cronômetro, com o risco à vista.
 *
 * Mostra três números por jogada, e os três importam:
 *   GOL  — chance de você marcar
 *   CRIA — chance de deixar o companheiro em condição de marcar
 *   ⚠    — chance de perder a bola e tomar o contra-ataque
 *
 * CRIA não é enfeite: sem ela, "cavar a falta" aparece com GOL 2% e parece
 * lixo, ninguém escolhe, e as jogadas de armação morrem no catálogo. É o número
 * que torna a build de armador legível.
 *
 * A porcentagem exibida sai de `distribuicao`, a MESMA função que
 * `resolverDecisao` consome para sortear. Não existe caminho onde o número da
 * tela difira do número do dado.
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
      menu.value.map((jogada) => ({
        jogada,
        dist: distribuicao(jogada, modificadoresPara(jogada, contexto)),
      })),
    [menu, contexto],
  )

  // um lance, uma escolha: cliques repetidos não podem resolver duas vezes
  const resolvidoRef = useRef(false)
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved

  const escolher = (jogada: Jogada): void => {
    if (resolvidoRef.current) return
    resolvidoRef.current = true

    const passo = resolverDecisao(jogada, modificadoresPara(jogada, contexto), menu.next)
    if (passo.value.desfecho !== 'chance') {
      onResolvedRef.current({ jogada, resolucao: passo.value, assistConvertida: false }, passo.next)
      return
    }
    // você criou; agora é o ataque do time contra a defesa deles
    const assist = rolarAssistencia(contexto.edges.attack, passo.next)
    onResolvedRef.current(
      { jogada, resolucao: passo.value, assistConvertida: assist.value },
      assist.next,
    )
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
          <span><strong>MARCA</strong> você faz o gol</span>
        </span>
        <span className="decision-legend-item decision-cria">
          <span className="decision-legend-dot" aria-hidden="true" />
          <span><strong>CRIA CHANCE</strong> companheiro finaliza</span>
        </span>
        <span className="decision-legend-item decision-risco">
          <span className="decision-legend-dot" aria-hidden="true" />
          <span><strong>SOFRE GOL</strong> risco no contra-ataque</span>
        </span>
      </div>
      <div className="decision-options">
        {opcoes.map(({ jogada, dist }) => {
          const label = jogadaLabel(jogada.id)
          const gol = pct(dist.gol)
          const cria = pct(dist.chance)
          const risco = pct(dist.contra)
          return (
            <button
              key={jogada.id}
              className={`decision-option decision-${jogada.faixa}`}
              onClick={() => escolher(jogada)}
              aria-label={
                `${label}. Atributo ${ATTRIBUTE_LABELS[jogada.atributo]}. ` +
                `${gol}% de chance de você marcar, ` +
                `${cria}% de criar uma finalização para um companheiro, ` +
                `${risco}% de risco de sofrer gol no contra-ataque.`
              }
            >
              <span className="decision-label">{label}</span>
              <span className="decision-meta">
                <span className="decision-attr" title={ATTRIBUTE_LABELS[jogada.atributo]}>
                  {ATTRIBUTE_ABBR[jogada.atributo]}
                </span>
                <span className="decision-stat decision-gol">
                  <span className="decision-stat-key">MARCA</span> {gol}%
                </span>
                <span className="decision-stat decision-cria">
                  <span className="decision-stat-key">CRIA CHANCE</span> {cria}%
                </span>
                <span className="decision-stat decision-risco">
                  <span className="decision-stat-key">SOFRE GOL</span> {risco}%
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
