import { Play } from 'lucide-react'
import celebrateSprite from '../../assets/sprites/s_celebrate.png'

/**
 * A boca do túnel: a luz do gramado no fim, o último empurrão para entrar em
 * campo, e o rodapé.
 */

interface TunnelOutroProps {
  readonly cta: string
  readonly onPlay: () => void
}

export const TunnelOutro = ({ cta, onPlay }: TunnelOutroProps) => (
  <section className="exit">
    <div className="exit-grass" aria-hidden="true" />
    <div className="exit-glow" aria-hidden="true" />

    <div className="exit-inner reveal">
      <img className="exit-sprite" src={celebrateSprite} alt="" aria-hidden="true" />
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
