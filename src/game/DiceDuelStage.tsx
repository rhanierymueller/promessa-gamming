import { useEffect, useRef, useState } from 'react'
import {
  createDuel,
  rollTurn,
  ROLLS_PER_SIDE,
  totalOf,
  type DiceDuel,
  type DiceSide,
  type DuelSide,
} from '../engine/dice/duel'
import { createRng } from '../engine/rng'
import { initAudio, playStageEvent } from './audio'
import { Die, type DiePhase } from './Die'

/**
 * Lance decisivo nos dados. Você SEGURA (toque ou clique) e vê o dado
 * chacoalhando na mão; ao soltar, ele cai na mesa, quica e vira até parar.
 * O adversário faz o mesmo na vez dele, na tela — cada lado joga os três
 * dados seguidos, e quem abre é sorteado.
 */

/** Tempo da queda até o dado assentar (ms) — casa com a animação do CSS. */
const ROLL_TIME = 1000
/** Quanto o adversário "chacoalha" antes de lançar (ms). */
const AI_SHAKE_TIME = 620
/** Respiro entre uma rolagem e a seguinte (ms). */
const BETWEEN_ROLLS = 520
/** Segurar este tempo carrega o dado por completo (ms). */
const FULL_CHARGE = 1100

interface DiceDuelStageProps {
  readonly seed: number
  /** Nome do SEU time — entra no grito de gol. */
  readonly teamName: string
  /** Nome de quem disputa do outro lado (clube ou seleção). */
  readonly opponentName: string
  /** Fim do duelo: quem levou o gol. */
  readonly onResolved: (winner: DuelSide) => void
  /** Desempate de mata-mata: o que está em jogo é a vaga, não um gol. */
  readonly forQualification?: boolean
}

export const DiceDuelStage = ({ seed, teamName, opponentName, onResolved, forQualification = false }: DiceDuelStageProps) => {
  const [duel, setDuel] = useState<DiceDuel>(() => createDuel(createRng(seed)))
  const [face, setFace] = useState<DiceSide>(6)
  const [phase, setPhase] = useState<DiePhase>('still')
  const [energy, setEnergy] = useState(0)
  const [throwId, setThrowId] = useState(0)

  const holdStart = useRef<number | null>(null)
  const duelRef = useRef(duel)
  duelRef.current = duel
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved
  const timers = useRef<number[]>([])

  const later = (fn: () => void, ms: number): void => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => () => {
    for (const id of timers.current) window.clearTimeout(id)
  }, [])

  /** Lança pelo lado da vez e mostra o dado caindo até assentar. */
  const throwDie = (power: number): void => {
    const current = duelRef.current
    if (current.turn === 'done') return
    const result = rollTurn(current)
    setThrowId((id) => id + 1)
    setEnergy(power)
    setFace(result.value)
    setPhase('rolling')
    playStageEvent('kick')
    later(() => {
      setDuel(result.duel)
      setPhase('still')
      /*
       * A torcida SÓ estoura no desfecho, e só se o gol for seu. Antes ela
       * comemorava a cada dado, o que estragava o clima do lance decisivo.
       */
      if (result.duel.turn !== 'done') return
      playStageEvent(result.duel.winner === 'player' ? 'goal' : 'defenseConcede')
    }, ROLL_TIME)
  }

  // o adversário joga sozinho — chacoalha na tela e lança, como você
  useEffect(() => {
    if (duel.turn !== 'ai' || phase !== 'still') return
    later(() => {
      setPhase('shaking')
      setEnergy(0.55)
      later(() => throwDie(0.55), AI_SHAKE_TIME)
    }, BETWEEN_ROLLS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel.turn, duel.playerRolls.length, duel.aiRolls.length, phase])

  useEffect(() => {
    if (duel.turn !== 'done' || !duel.winner) return
    later(() => onResolvedRef.current(duel.winner!), 1200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duel.turn, duel.winner])

  // enquanto segura, a barra vai enchendo
  useEffect(() => {
    if (phase !== 'shaking' || duel.turn !== 'player') return
    const tick = window.setInterval(() => {
      const held = holdStart.current ? Date.now() - holdStart.current : 0
      setEnergy(Math.min(1, held / FULL_CHARGE))
    }, 60)
    return () => window.clearInterval(tick)
  }, [phase, duel.turn])

  const myTurn = duel.turn === 'player' && phase !== 'rolling'

  const holdDown = (): void => {
    if (!myTurn) return
    initAudio()
    holdStart.current = Date.now()
    setEnergy(0)
    setPhase('shaking')
  }

  const release = (): void => {
    if (phase !== 'shaking' || duel.turn !== 'player') return
    const held = holdStart.current ? Date.now() - holdStart.current : 0
    holdStart.current = null
    throwDie(Math.min(1, held / FULL_CHARGE))
  }

  const scorer = duel.winner === 'player' ? teamName : opponentName
  const turnLabel =
    duel.turn === 'done'
      ? forQualification ? `${scorer} avança` : `Gol do ${scorer}`
      : duel.turn === 'ai'
        ? `Vez de ${opponentName}`
        : phase === 'shaking'
          ? 'Solte para lançar!'
          : phase === 'rolling'
            ? 'Rolando…'
            : 'Segure para chacoalhar'

  const side = (name: string, rolls: readonly DiceSide[], active: boolean) => (
    <div className={`dice-side${active ? ' dice-side-active' : ''}`}>
      <span className="dice-side-name">{name}</span>
      <span className="dice-total">{totalOf(rolls)}</span>
      <span className="dice-rolls">
        {rolls.map((value, index) => (
          <span key={index} className="dice-chip">{value}</span>
        ))}
        {Array.from({ length: Math.max(0, ROLLS_PER_SIDE - rolls.length) }, (_, i) => (
          <span key={`vazio-${i}`} className="dice-chip dice-chip-empty" />
        ))}
      </span>
    </div>
  )

  if (duel.turn === 'done' && duel.winner) {
    const mine = duel.winner === 'player'
    return (
      <div className="dice-stage dice-final">
        <h2 className={`dice-goal${mine ? '' : ' dice-goal-against'}`}>
          {forQualification
            ? `${scorer} ${mine ? 'ESTÁ CLASSIFICADO!' : 'avança.'}`
            : `${mine ? 'GOOOOL' : 'Gol'} do ${scorer}!`}
        </h2>
        <p className="dice-final-score">
          {totalOf(duel.playerRolls)} <span className="dice-versus">×</span>{' '}
          {totalOf(duel.aiRolls)}
        </p>
        <p className="muted">
          {mine
            ? forQualification ? 'A vaga é sua, no grito dos dados.' : 'Você levou no grito dos dados.'
            : 'Dessa vez a sorte foi deles.'}
        </p>
      </div>
    )
  }

  return (
    <div className="dice-stage">
      <div className="dice-scoreboard">
        {side('Você', duel.playerRolls, duel.turn === 'player')}
        <span className="dice-versus">×</span>
        {side(opponentName, duel.aiRolls, duel.turn === 'ai')}
      </div>

      {duel.playerRolls.length >= ROLLS_PER_SIDE && duel.turn !== 'done' && (
        <p className="dice-sudden">MORTE SÚBITA — empatou, vai mais um!</p>
      )}

      <button
        type="button"
        className={`dice-table${duel.turn === 'ai' ? ' dice-table-ai' : ''}`}
        disabled={duel.turn !== 'player'}
        aria-label="Segure para chacoalhar e solte para lançar"
        onPointerDown={holdDown}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
      >
        <Die value={face} phase={phase} energy={energy} throwId={throwId} />
        <span className="dice-energy" aria-hidden="true">
          <span
            className="dice-energy-fill"
            style={{ width: `${(phase === 'shaking' ? energy : 0) * 100}%` }}
          />
        </span>
      </button>

      <p className={`dice-hint${duel.turn === 'done' ? ' dice-hint-final' : ''}`} role="status">
        {turnLabel}
      </p>
    </div>
  )
}
