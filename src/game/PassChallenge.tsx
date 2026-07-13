import { useEffect, useMemo, useRef, useState } from 'react'
import type { RngState } from '../engine/rng'
import {
  generatePassOptions,
  PASS_DECISION_SECONDS,
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
  readonly onResolved: (resolution: PassResolution, next: RngState, timedOut: boolean) => void
}

const TICK_MS = 50

export const PassChallenge = ({ intro, rng, onResolved }: PassChallengeProps) => {
  const generated = useMemo(() => generatePassOptions(rng), [rng])
  const [timeLeft, setTimeLeft] = useState(PASS_DECISION_SECONDS)
  const resolvedRef = useRef(false)
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((current) => {
        const next = current - TICK_MS / 1000
        if (next <= 0 && !resolvedRef.current) {
          resolvedRef.current = true
          onResolvedRef.current(timeoutPass(), generated.next, true)
        }
        return Math.max(0, next)
      })
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [generated])

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
          style={{ width: `${(timeLeft / PASS_DECISION_SECONDS) * 100}%` }}
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
