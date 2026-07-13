interface StarsProps {
  readonly strength: number
}

export const Stars = ({ strength }: StarsProps) => (
  <span className="stars" aria-label={`força ${strength} de 5`}>
    {'★'.repeat(strength)}
    <span className="stars-empty">{'★'.repeat(5 - strength)}</span>
  </span>
)
