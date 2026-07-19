import { Star } from 'lucide-react'
import { starsFor } from '../engine/market/market'

/** Estrelas do overall (0.5 a 5, meia estrela via recorte) — estilo FIFA. */

interface OverallStarsProps {
  readonly overall: number
  readonly size?: number
}

export const OverallStars = ({ overall, size = 12 }: OverallStarsProps) => {
  const stars = starsFor(overall)
  const percent = (stars / 5) * 100
  return (
    <span className="ovr-stars" role="img" aria-label={`${stars} de 5 estrelas`}>
      <span className="ovr-stars-row" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} size={size} />
        ))}
      </span>
      <span className="ovr-stars-fill" style={{ width: `${percent}%` }} aria-hidden="true">
        <span className="ovr-stars-row">
          {Array.from({ length: 5 }, (_, index) => (
            <Star key={index} size={size} fill="currentColor" />
          ))}
        </span>
      </span>
    </span>
  )
}
