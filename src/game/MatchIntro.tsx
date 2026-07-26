import { useEffect, useRef, useState } from 'react'
import type { Club } from '../data/clubs'
import { ClubCrest } from '../ui/ClubCrest'

/**
 * Abertura da partida: os dois escudos entram pelas laterais, se encaram e o
 * jogo começa. Antes a partida aparecia seca, do clique direto para o campo
 * rolando — sem o instante que dá peso ao confronto.
 *
 * Dura pouco de propósito, e um toque pula: numa carreira longa a mesma
 * animação se repete centenas de vezes, e o que emociona na primeira irrita
 * na vigésima.
 */

/** Tempo que o confronto fica na tela (ms) — casa com a barra do CSS. */
const INTRO_MS = 5000
/** Escurece até o preto antes de revelar o campo (ms). */
const DARKEN_MS = 420
/** E então dissolve o preto, mostrando a partida (ms). */
const REVEAL_MS = 420

type Phase = 'show' | 'dark' | 'reveal'

interface MatchIntroProps {
  readonly club: Club
  readonly opponent: Club
  readonly crestUrls: Readonly<Record<string, string>>
  /** Linha de contexto: "Série A · Rodada 12" ou "Copa do Mundo · Oitavas". */
  readonly subtitle: string
  readonly onDone: () => void
}

export const MatchIntro = ({ club, opponent, crestUrls, subtitle, onDone }: MatchIntroProps) => {
  /*
   * A saída tem duas etapas: ESCURECE até o preto, e só então dissolve para o
   * campo. Cortar direto do confronto para a partida dá um solavanco — o preto
   * no meio é o que faz a troca parecer um corte de transmissão.
   */
  const [phase, setPhase] = useState<Phase>('show')
  const timers = useRef<number[]>([])

  const leave = (): void => {
    if (phase !== 'show') return
    setPhase('dark')
    timers.current.push(window.setTimeout(() => setPhase('reveal'), DARKEN_MS))
    timers.current.push(window.setTimeout(onDone, DARKEN_MS + REVEAL_MS))
  }

  useEffect(() => {
    timers.current.push(window.setTimeout(leave, INTRO_MS))
    return () => {
      for (const id of timers.current) window.clearTimeout(id)
    }
    // dispara uma vez: o resto do ciclo é encadeado pelos timers acima
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`match-intro match-intro-${phase}`}
      role="button"
      tabIndex={0}
      aria-label="Pular abertura"
      onClick={leave}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') leave() }}
    >
      <span className="match-intro-sub">{subtitle}</span>

      <div className="match-intro-teams">
        <div className="match-intro-side match-intro-home">
          <ClubCrest club={club} customUrl={crestUrls[club.id]} size={92} />
          <strong>{club.name}</strong>
        </div>

        <span className="match-intro-vs">×</span>

        <div className="match-intro-side match-intro-away">
          <ClubCrest club={opponent} customUrl={crestUrls[opponent.id]} size={92} />
          <strong>{opponent.name}</strong>
        </div>
      </div>

      <span className="match-intro-bar" aria-hidden="true">
        <span className="match-intro-fill" />
      </span>
      <span className="match-intro-skip">toque para pular</span>
    </div>
  )
}
