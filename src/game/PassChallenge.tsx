import { useEffect, useMemo, useRef, useState } from 'react'
import { boostedPassChance } from '../engine/career/attributes'
import { perkDecisionSeconds, perkPassChance, type PerkId } from '../engine/career/perks'
import type { RngState } from '../engine/rng'
import {
  decisionSecondsFor,
  generatePassOptions,
  resolvePass,
  timeoutPass,
  type PassOption,
  type PassResolution,
} from '../engine/pass/pass'
import { passOptionLabel } from '../data/narration'

const RISK_TAGS: Record<PassOption['risk'], string> = {
  safe: 'seguro',
  bold: 'ousado',
  audacious: 'audacioso',
}

interface PassChallengeProps {
  readonly intro: string
  readonly rng: RngState
  /** Nível do atributo Passe — aumenta a chance das opções. */
  readonly passeLevel?: number
  /** Perks do craque — maestro soma chance, frieza estica o relógio. */
  readonly perks?: readonly PerkId[]
  readonly onResolved: (resolution: PassResolution, next: RngState, timedOut: boolean) => void
}

const TICK_MS = 50

export const PassChallenge = ({ intro, rng, passeLevel = 1, perks = [], onResolved }: PassChallengeProps) => {
  const generated = useMemo(() => {
    const base = generatePassOptions(rng)
    return {
      ...base,
      value: base.value.map((option) => ({
        ...option,
        successChance: perkPassChance(boostedPassChance(option.successChance, passeLevel), perks),
      })),
    }
  }, [rng, passeLevel, perks])
  const decisionSeconds = perkDecisionSeconds(decisionSecondsFor(passeLevel), perks)
  const [timeLeft, setTimeLeft] = useState(decisionSeconds)
  const resolvedRef = useRef(false)
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - TICK_MS / 1000))
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [generated])

  // resolve o timeout FORA do updater: setState de pai durante render é proibido
  useEffect(() => {
    if (timeLeft > 0 || resolvedRef.current) return
    resolvedRef.current = true
    onResolvedRef.current(timeoutPass(), generated.next, true)
  }, [timeLeft, generated])

  const choose = (option: PassOption): void => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    const { value, next } = resolvePass(option, generated.next)
    onResolvedRef.current(value, next, false)
  }

  return (
    <div className="pass-overlay">
      <p className="pass-intro">{intro}</p>
      <div className="pass-timebar" aria-hidden="true">
        <div
          className="pass-timebar-fill"
          style={{ width: `${(timeLeft / decisionSeconds) * 100}%` }}
        />
      </div>
      <div className="pass-options">
        {generated.value.map((option) => (
          <button key={option.risk} className={`pass-option pass-${option.risk}`} onClick={() => choose(option)}>
            <span className="pass-label">{passOptionLabel(option.risk, option.templateId)}</span>
            <span className="pass-meta">
              {RISK_TAGS[option.risk]} · {Math.round(option.successChance * 100)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
