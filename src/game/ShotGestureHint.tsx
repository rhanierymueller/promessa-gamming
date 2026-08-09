import { Pointer } from 'lucide-react'
import '../ui/styles/onboarding.css'

/**
 * A mãozinha do primeiro chute: demonstra o gesto em cima do palco.
 *
 * Na partida o lance abre direto no "pronto" — sem o briefing do treino.
 * Quem nunca chutou não sabe que precisa ARRASTAR da bola até o gol, então
 * uma mão repete o movimento até o primeiro chute sair. É só demonstração:
 * não captura toque nenhum (pointer-events: none no CSS).
 */
export const ShotGestureHint = () => (
  <div className="gesture-hint" aria-hidden="true">
    <span className="gesture-trail" />
    <span className="gesture-hand">
      <Pointer size={34} />
    </span>
    <p className="gesture-caption">Arraste da bola até o gol para chutar</p>
  </div>
)
