import { useId } from 'react'
import type { Formation } from '../engine/squad/formation'
import { initialsOf } from '../engine/squad/initials'
import { overallAt, positionFit, type SquadPlayer } from '../engine/squad/players'
import { facePresentationFor } from '../game/faces'
import type { PlayerGender } from '../state/save'

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
  /** Gênero do elenco: escolhe o banco de retratos dos atletas. */
  readonly gender: PlayerGender
  /** Retrato configurado no Perfil — só para o SEU craque. */
  readonly userFaceUrl?: string | null
  readonly primaryColor: string
  readonly onSelect: (player: SquadPlayer) => void
}

const W = 300
const H = 420
const MARGIN = 16
const FACE_RADIUS = 14

/** Layout da engine (x 0-0.5 atacando à direita) → prancheta vertical. */
const toBoard = (point: { readonly x: number; readonly y: number }): { x: number; y: number } => ({
  x: MARGIN + point.y * (W - MARGIN * 2),
  y: MARGIN + 20 + (1 - point.x / 0.5) * (H - MARGIN * 2 - 56),
})

const firstName = (name: string): string => name.split(' ')[0]

export const FormationBoard = ({
  formation,
  players,
  userSlot,
  gender,
  userFaceUrl,
  primaryColor,
  onSelect,
}: FormationBoardProps) => {
  const boardId = `formation-${useId().replace(/:/g, '')}`

  return (
    <svg
      className="formation-board"
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      aria-label={`Mesa tática ${formation.label}`}
    >
      <defs>
        <pattern id={`${boardId}-stripes`} width={W} height="60" patternUnits="userSpaceOnUse">
          <rect width={W} height="30" fill="rgba(255, 255, 255, 0.025)" />
        </pattern>
        {formation.layout.map((_, slot) => (
          <clipPath key={slot} id={`${boardId}-face-${slot}`} clipPathUnits="userSpaceOnUse">
            <circle r={FACE_RADIUS} />
          </clipPath>
        ))}
      </defs>

      {/* gramado */}
      <rect x="0" y="0" width={W} height={H} rx="10" fill="#1c3a24" />
      <rect x="0" y="0" width={W} height={H} rx="10" fill={`url(#${boardId}-stripes)`} />

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
        const effectiveOverall = overallAt(player, formation.slots[slot])
        const facePresentation = isUser ? null : facePresentationFor(player.id, gender)
        const faceUrl = isUser ? userFaceUrl ?? null : facePresentation?.url ?? null
        const faceShift = isUser ? 0 : facePresentation?.xShiftPercent ?? 0
        const faceTopCrop = isUser ? 0 : facePresentation?.topCropPercent ?? 0
        const faceTopCropUnits = (FACE_RADIUS * 2 * faceTopCrop) / 100
        const ringColor = isWrong ? '#e85d75' : isUser ? '#ffd23f' : primaryColor

        return (
          <g
            key={player.id}
            className={`board-player${isUser ? ' board-player-user' : ''}${isWrong ? ' board-player-wrong' : ''}`}
            transform={`translate(${x}, ${y})`}
            onClick={() => onSelect(player)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              onSelect(player)
            }}
            role="button"
            tabIndex={0}
            aria-label={`${player.name} (${formation.slots[slot]}), overall ${effectiveOverall}`}
          >
            <g className="board-player-token">
              <circle className="board-player-halo" r={FACE_RADIUS + 7} fill={ringColor} />
              <circle
                className="board-player-ring"
                r={FACE_RADIUS + 2}
                fill={ringColor}
                stroke={isWrong ? '#ff9aac' : isUser ? '#fff6d6' : 'rgba(255, 255, 255, 0.8)'}
                strokeWidth={isWrong || isUser ? 1.8 : 1.2}
              />
              <circle r={FACE_RADIUS} fill={isUser ? '#5b4710' : '#171126'} />
              {faceUrl ? (
                <image
                  className={`board-player-face${isUser ? ' board-player-face-user' : ''}`}
                  href={faceUrl}
                  x={-FACE_RADIUS + (FACE_RADIUS * 2 * faceShift) / 100}
                  y={-FACE_RADIUS - faceTopCropUnits}
                  width={FACE_RADIUS * 2}
                  height={FACE_RADIUS * 2 + faceTopCropUnits}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${boardId}-face-${slot})`}
                  aria-hidden="true"
                />
              ) : (
                <text
                  className="board-player-initials"
                  y="3"
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="700"
                  fill="#efe9dc"
                  aria-hidden="true"
                >
                  {initialsOf(player.name)}
                </text>
              )}

              <g className="board-player-overall" transform="translate(11, 11)" aria-hidden="true">
                <circle
                  r="7.5"
                  fill="#171126"
                  stroke={ringColor}
                  strokeWidth="1.4"
                />
                <text
                  y="2.6"
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="800"
                  fill={isUser ? '#ffd23f' : '#ffffff'}
                >
                  {effectiveOverall}
                </text>
              </g>
            </g>

            <text
              className="board-player-name"
              y="29"
              textAnchor="middle"
              fontSize="10"
              fontWeight={isUser ? 700 : 400}
              fill={isUser ? '#ffd23f' : '#efe9dc'}
              stroke="rgba(0, 0, 0, 0.7)"
              strokeWidth="2.5"
              paintOrder="stroke"
            >
              {firstName(player.name)}
            </text>
            <text
              className="board-player-position"
              y="40"
              textAnchor="middle"
              fontSize="8"
              fill="rgba(239, 233, 220, 0.72)"
              stroke="rgba(0, 0, 0, 0.6)"
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
}
