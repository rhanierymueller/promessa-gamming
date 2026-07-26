import { useEffect, useRef, useState } from 'react'
import type { Nation } from '../data/nations'
import { NationFlag } from './NationFlag'

/**
 * Cerimônia da convocação. A Copa é o ponto alto da carreira, e vinha sem
 * nenhum instante — clicava em "Apresentar-se" e o torneio simplesmente
 * existia. Aqui a bandeira sobe, o nome é chamado, e só então o jogo segue.
 *
 * Sai igual à abertura de partida: escurece até o preto antes de revelar a
 * tela, para as duas transições do jogo terem a mesma linguagem.
 */

/*
 * 15 segundos é MUITO tempo de tela parada, então a cerimônia é encadeada:
 * bandeira, chamado, quem foi convocado, a competição e as frases do
 * anúncio entram em tempos diferentes. Sempre dá para pular com um toque.
 */
const HOLD_MS = 15000
const DARKEN_MS = 420
const REVEAL_MS = 420

type Phase = 'show' | 'dark' | 'reveal'

interface CallUpIntroProps {
  readonly nation: Nation
  readonly playerName: string
  /** Nome da competição: "Copa do Mundo", "Copa América"… */
  readonly competition: string
  /** Retrato do craque, quando houver. */
  readonly portraitUrl: string | null
  readonly onDone: () => void
}

export const CallUpIntro = ({
  nation,
  playerName,
  competition,
  portraitUrl,
  onDone,
}: CallUpIntroProps) => {
  const [phase, setPhase] = useState<Phase>('show')
  const timers = useRef<number[]>([])

  const leave = (): void => {
    if (phase !== 'show') return
    setPhase('dark')
    timers.current.push(window.setTimeout(() => setPhase('reveal'), DARKEN_MS))
    timers.current.push(window.setTimeout(onDone, DARKEN_MS + REVEAL_MS))
  }

  useEffect(() => {
    timers.current.push(window.setTimeout(leave, HOLD_MS))
    return () => {
      for (const id of timers.current) window.clearTimeout(id)
    }
    // dispara uma vez; o resto é encadeado pelos timers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`callup-intro match-intro-${phase}`}
      role="button"
      tabIndex={0}
      aria-label="Pular a convocação"
      onClick={leave}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') leave() }}
    >
      <div className="callup-flag">
        <NationFlag nationId={nation.id} size={150} title={`Bandeira de ${nation.name}`} />
      </div>

      <h2 className="callup-word">CONVOCADO</h2>

      <div className="callup-who">
        {portraitUrl && <img className="callup-face" src={portraitUrl} alt="" aria-hidden="true" />}
        <div>
          <strong className="callup-name">{playerName}</strong>
          <p className="muted callup-nation">{nation.name}</p>
        </div>
      </div>

      <p className="callup-comp">{competition}</p>

      <div className="callup-lines">
        <p className="callup-line callup-line-1">
          A comissão técnica assistiu a todos os seus jogos.
        </p>
        <p className="callup-line callup-line-2">
          A camisa mais pesada do país agora tem o seu nome nas costas.
        </p>
        <p className="callup-line callup-line-3">
          <strong>Boa sorte, {playerName}.</strong>
        </p>
      </div>

      <span className="match-intro-skip">toque para pular</span>
    </div>
  )
}
