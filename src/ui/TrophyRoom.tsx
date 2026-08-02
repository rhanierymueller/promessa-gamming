import trophyCopaAmerica from '../assets/trophies/copa-america.png'
import trophyCopaBrasil from '../assets/trophies/copa-brasil.png'
import trophyCopaMundo from '../assets/trophies/copa-mundo.png'
import trophyLigaNacoes from '../assets/trophies/liga-nacoes.png'
import trophyLibertados from '../assets/trophies/libertados.png'
import trophySerieA from '../assets/trophies/serie-a.png'
import trophySerieB from '../assets/trophies/serie-b.png'
import trophySerieC from '../assets/trophies/serie-c.png'
import trophySerieD from '../assets/trophies/serie-d.png'
import type { Trophy, TrophyKind } from '../state/save'

/** Sala de troféus: a estante da carreira (aba Time e Perfil). */

const TROPHY_IMAGES: Record<TrophyKind, string> = {
  'serie-d': trophySerieD,
  'serie-c': trophySerieC,
  'serie-b': trophySerieB,
  'serie-a': trophySerieA,
  'copa-america': trophyCopaAmerica,
  'liga-nacoes': trophyLigaNacoes,
  'copa-mundo': trophyCopaMundo,
  libertados: trophyLibertados,
  'copa-brasil': trophyCopaBrasil,
}

const TROPHY_LABELS: Record<TrophyKind, string> = {
  'serie-a': 'Campeão Série A',
  'serie-b': 'Campeão Série B',
  'serie-c': 'Campeão Série C',
  'serie-d': 'Campeão Série D',
  'copa-america': 'Copa América',
  'liga-nacoes': 'Liga das Nações',
  'copa-mundo': 'Copa do Mundo',
  libertados: 'Copa Libertados',
  'copa-brasil': 'Copa do Brasil',
}

interface TrophyRoomProps {
  readonly trophies: readonly Trophy[]
}

export const TrophyRoom = ({ trophies }: TrophyRoomProps) => (
  <div className="card card-wide trophy-room">
    <span className="card-label">Sala de troféus</span>
    {trophies.length === 0 ? (
      <p className="muted">A estante está vazia — a primeira taça é a que mais pesa. Vai atrás dela.</p>
    ) : (
      <div className="trophy-shelf">
        {trophies.map((trophy, index) => (
          <div key={`${trophy.kind}-${trophy.year}-${index}`} className={`trophy-item trophy-${trophy.kind}`}>
            <img className="trophy-img" src={TROPHY_IMAGES[trophy.kind]} alt="" aria-hidden="true" />
            <span className="trophy-name">{TROPHY_LABELS[trophy.kind]}</span>
            <span className="trophy-year">Ano {trophy.year}</span>
          </div>
        ))}
      </div>
    )}
  </div>
)
