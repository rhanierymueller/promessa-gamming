import type { ReactNode } from 'react'
import { nationById } from '../data/nations'
import { ovrClass } from '../engine/squad/overallTier'
import type { SquadPosition } from '../engine/squad/players'
import { formatMoney } from '../engine/market/market'
import type { PlayerGender } from '../state/save'
import { NationFlag } from './NationFlag'
import { OverallStars } from './OverallStars'
import { PlayerFaceThumb } from './PlayerFaceThumb'

/**
 * Linha de jogador do mercado: retrato, identidade em duas alturas, nota
 * destacada e preço. A mesma linha serve a vitrine e o histórico de
 * contratações — o histórico só não tem overall (é derivado por temporada).
 */

interface MarketRowProps {
  readonly playerId: string
  readonly name: string
  readonly position: SquadPosition
  readonly nationality: string
  readonly age: number
  readonly price: number
  readonly gender: PlayerGender
  /** Ausente no histórico: a contratação não guarda overall. */
  readonly overall?: number
  /** Preço acima da verba deixa o valor apagado, casando com o botão. */
  readonly isAffordable?: boolean
  /** Botão de contratar ou selo de reforço. */
  readonly action: ReactNode
  readonly onSelect?: () => void
}

export const MarketRow = ({
  playerId,
  name,
  position,
  nationality,
  age,
  price,
  gender,
  overall,
  isAffordable = true,
  action,
  onSelect,
}: MarketRowProps) => {
  const nationName = nationById(nationality)?.name ?? 'Bandeira'
  const isClickable = Boolean(onSelect)

  return (
    <div
      className={`market-row${isClickable ? '' : ' market-row-history'}`}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <PlayerFaceThumb playerId={playerId} name={name} gender={gender} />

      <span className="market-id">
        <span className="market-name">{name}</span>
        <span className="market-meta">
          <span className="squad-pos">{position}</span>
          <NationFlag nationId={nationality} size={14} title={nationName} />
          <span className="market-meta-age">{age} anos</span>
          {overall !== undefined && (
            <span className="market-meta-stars">
              <OverallStars overall={overall} size={10} />
            </span>
          )}
        </span>
      </span>

      {overall === undefined ? (
        <span className="market-ovr-empty" aria-hidden="true" />
      ) : (
        <span className={`market-ovr ${ovrClass(overall)}`} title={`Overall ${overall}`}>
          {overall}
        </span>
      )}

      <span className={`market-price${isAffordable ? '' : ' market-price-over'}`}>
        {formatMoney(price)}
      </span>

      {action}
    </div>
  )
}
