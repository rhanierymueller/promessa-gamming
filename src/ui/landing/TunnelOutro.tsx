import { Play } from 'lucide-react'
import celeb0 from '../../assets/sprites/celeb_0.png'
import celeb1 from '../../assets/sprites/celeb_1.png'
import celeb2 from '../../assets/sprites/celeb_2.png'
import celeb3 from '../../assets/sprites/celeb_3.png'
import { CELEBRATION_NAMES } from '../../game/assets'

/**
 * A boca do túnel: a luz do gramado no fim, o último empurrão para entrar em
 * campo, e o rodapé.
 */

interface TunnelOutroProps {
  readonly cta: string
  readonly onPlay: () => void
}

/*
 * As quatro comemorações que o jogo oferece, revezando em laço. A troca é só
 * CSS: cada quadro roda o mesmo ciclo com um atraso negativo diferente, então
 * não há timer, nem re-render, nem estado para sincronizar.
 *
 * A altura de cada um sai da altura natural vezes a mesma unidade — os quadros
 * têm tamanhos bem diferentes e, forçados à mesma altura, o atleta encolhia e
 * crescia a cada troca.
 */
const CELEBRATIONS: readonly { readonly art: string; readonly height: number }[] = [
  { art: celeb0, height: 135 },
  { art: celeb1, height: 93 },
  { art: celeb2, height: 139 },
  { art: celeb3, height: 132 },
]

export const TunnelOutro = ({ cta, onPlay }: TunnelOutroProps) => (
  <section className="exit">
    <div className="exit-grass" aria-hidden="true" />
    <div className="exit-glow" aria-hidden="true" />

    <div className="exit-inner reveal">
      <div className="exit-celebs" aria-hidden="true">
        {CELEBRATIONS.map((celebration, index) => (
          <img
            key={celebration.art}
            className="exit-celeb"
            src={celebration.art}
            alt={CELEBRATION_NAMES[index]}
            style={{
              height: `calc(${celebration.height} * var(--celeb-u))`,
              animationDelay: `${index * 0.4}s`,
            }}
          />
        ))}
      </div>
      <h2 className="exit-title">A torcida já grita o seu nome</h2>
      <p className="exit-sub">
        Do outro lado do túnel tem gramado molhado, um time da Série D com o seu nome no escudo
        e uma carreira inteira para você estragar ou fazer história.
      </p>
      <button className="btn landing-cta" onClick={onPlay}>
        <Play size={18} aria-hidden="true" /> {cta}
      </button>
    </div>

    <footer className="tunnel-footer">PROMESSA · mundo 100% fictício · em desenvolvimento</footer>
  </section>
)
