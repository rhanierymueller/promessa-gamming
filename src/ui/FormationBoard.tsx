import type { Formation } from '../engine/squad/formation'
import { overallAt, positionFit, type SquadPlayer } from '../engine/squad/players'

/**
 * Prancheta tática: a própria metade do campo, na vertical (gol embaixo,
 * ataque para cima), com os 11 titulares dispostos na formação escolhida.
 */

interface FormationBoardProps {
  readonly formation: Formation
  /** Titulares na ordem dos slots da formação. */
  readonly players: readonly (SquadPlayer | undefined)[]
  /** Slot do SEU craque (-1 quando o time não é o seu). */
  readonly userSlot: number
  readonly primaryColor: string
  readonly onSelect: (player: SquadPlayer) => void
}

const W = 300
const H = 420
const MARGIN = 16

/** Layout da engine (x 0-0.5 atacando à direita) → prancheta vertical. */
const toBoard = (point: { readonly x: number; readonly y: number }): { x: number; y: number } => ({
  x: MARGIN + point.y * (W - MARGIN * 2),
  y: MARGIN + 20 + (1 - point.x / 0.5) * (H - MARGIN * 2 - 56),
})

const firstName = (name: string): string => name.split(' ')[0]

export const FormationBoard = ({ formation, players, userSlot, primaryColor, onSelect }: FormationBoardProps) => (
  <svg
    className="formation-board"
    viewBox={`0 0 ${W} ${H}`}
    role="group"
    aria-label={`Mesa tática ${formation.label}`}
  >
    {/* gramado */}
    <rect x="0" y="0" width={W} height={H} rx="10" fill="#1c3a24" />
    <rect x="0" y="0" width={W} height={H} rx="10" fill="url(#board-stripes)" />
    <defs>
      <pattern id="board-stripes" width={W} height="60" patternUnits="userSpaceOnUse">
        <rect width={W} height="30" fill="rgba(255, 255, 255, 0.025)" />
      </pattern>
    </defs>
    {/* linhas: meio-campo no topo, área embaixo */}
    <g stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1.5" fill="none">
      <rect x={8} y={8} width={W - 16} height={H - 16} rx="6" />
      <line x1={8} y1={26} x2={W - 8} y2={26} />
      <path d={`M ${W / 2 - 40} 26 A 40 40 0 0 0 ${W / 2 + 40} 26`} />
      <rect x={W / 2 - 72} y={H - 60} width={144} height={52} />
      <rect x={W / 2 - 34} y={H - 32} width={68} height={24} />
      <path d={`M ${W / 2 - 36} ${H - 60} A 38 38 0 0 1 ${W / 2 + 36} ${H - 60}`} />
    </g>

    {formation.layout.map((point, slot) => {
      const player = players[slot]
      if (!player) return null
      const { x, y } = toBoard(point)
      const isUser = slot === userSlot
      const isWrong = positionFit(player, formation.slots[slot]) === 'improvisado'
      return (
        <g
          key={player.id}
          className="board-player"
          transform={`translate(${x}, ${y})`}
          onClick={() => onSelect(player)}
          role="button"
          aria-label={`${player.name} (${formation.slots[slot]})`}
        >
          <circle
            r="13"
            fill={isUser ? '#ffd23f' : primaryColor}
            stroke={isWrong ? '#e85d75' : isUser ? '#fff6d6' : 'rgba(255, 255, 255, 0.75)'}
            strokeWidth={isWrong ? 2.5 : isUser ? 2.5 : 1.5}
          />
          <text
            y="4"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill={isUser ? '#1a1428' : '#ffffff'}
          >
            {overallAt(player, formation.slots[slot])}
          </text>
          <text
            y="26"
            textAnchor="middle"
            fontSize="10"
            fontWeight={isUser ? 700 : 400}
            fill={isUser ? '#ffd23f' : '#efe9dc'}
            stroke="rgba(0, 0, 0, 0.6)"
            strokeWidth="2.5"
            paintOrder="stroke"
          >
            {firstName(player.name)}
          </text>
          <text
            y="37"
            textAnchor="middle"
            fontSize="8"
            fill="rgba(239, 233, 220, 0.65)"
            stroke="rgba(0, 0, 0, 0.5)"
            strokeWidth="2"
            paintOrder="stroke"
          >
            {formation.slots[slot]}
          </text>
        </g>
      )
    })}
  </svg>
)
