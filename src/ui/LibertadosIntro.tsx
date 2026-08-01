import { useEffect, useRef, useState } from 'react'
import trophyLibertados from '../assets/trophies/libertados.png'
import { clubById } from '../data/clubs'
import { nationOf } from '../engine/libertados/draw'
import { LIBERTADOS_NAME, type LibertadosState } from '../engine/libertados/types'
import { nationById } from '../data/nations'
import { ClubCrest } from './ClubCrest'
import { NationFlag } from './NationFlag'
import './styles/libertados.css'

/**
 * A entrada na Libertados. Vale o mesmo que a convocação para a seleção: sem
 * cerimônia, o continente inteiro apareceria de uma vez numa tabela. Aqui a
 * taça entra, os potes giram e os três adversários do grupo são revelados um
 * a um.
 *
 * Sai igual à convocação e à abertura de partida: escurece até o preto antes
 * de revelar a tela, para todas as transições terem a mesma linguagem.
 */

const HOLD_MS = 15000
const DARKEN_MS = 420
const REVEAL_MS = 420

type Phase = 'show' | 'dark' | 'reveal'

interface LibertadosIntroProps {
  readonly state: LibertadosState
  readonly clubName: string
  readonly playerName: string
  readonly onDone: () => void
}

export const LibertadosIntro = ({
  state,
  clubName,
  playerName,
  onDone,
}: LibertadosIntroProps) => {
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

  const rivals = state.groups[0]
    .filter((id) => id !== state.playerClubId)
    .map((id) => clubById(id))
    .filter((club): club is NonNullable<typeof club> => club !== null)

  return (
    <div
      className={`libertados-intro match-intro-${phase}`}
      role="button"
      tabIndex={0}
      aria-label="Pular a abertura da Copa Libertados"
      onClick={leave}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') leave() }}
    >
      <img className="libertados-trophy" src={trophyLibertados} alt="" aria-hidden="true" />

      <h2 className="libertados-word">{LIBERTADOS_NAME.toUpperCase()}</h2>
      <p className="libertados-year">Temporada {state.year}</p>

      <p className="libertados-club">
        <strong>{clubName}</strong> está na fase de grupos.
      </p>

      <div className="libertados-pots" aria-hidden="true">
        {[0, 1, 2, 3].map((pot) => (
          <span key={pot} className={`libertados-pot libertados-pot-${pot}`}>{pot + 1}</span>
        ))}
      </div>

      <p className="libertados-draw-label">Grupo A</p>
      <div className="libertados-rivals">
        {rivals.map((club, index) => {
          const nation = nationById(nationOf(club.id))
          return (
            <div className={`libertados-rival libertados-rival-${index + 1}`} key={club.id}>
              <ClubCrest club={club} size={44} />
              <strong className="libertados-rival-name">{club.name}</strong>
              {nation && (
                <span className="libertados-rival-nation">
                  <NationFlag nationId={nation.id} size={14} title={nation.name} />
                  {nation.name}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <p className="libertados-line">
        O continente inteiro na frente, {playerName}. Vai buscar.
      </p>

      <span className="match-intro-skip">toque para pular</span>
    </div>
  )
}
