import { initialsOf } from '../engine/squad/initials'
import { faceUrlFor } from '../game/faces'
import type { PlayerGender } from '../state/save'

/**
 * Miniatura do rosto para listas. O retrato vem do id, então é sempre o mesmo
 * jogador com a mesma cara.
 *
 * As iniciais ficam SEMPRE no fundo e o retrato entra por cima: a lista é
 * lazy, então sem essa camada a moldura piscaria vazia durante a rolagem — e
 * um retrato ausente ou quebrado deixaria um buraco permanente.
 */

interface PlayerFaceThumbProps {
  readonly playerId: string
  readonly name: string
  readonly gender: PlayerGender
}

export const PlayerFaceThumb = ({ playerId, name, gender }: PlayerFaceThumbProps) => {
  const url = faceUrlFor(playerId, gender)
  return (
    <span className="face-thumb" aria-hidden="true">
      <span className="face-thumb-initials">{initialsOf(name)}</span>
      {url && <img className="face-thumb-img" src={url} alt="" loading="lazy" decoding="async" />}
    </span>
  )
}
