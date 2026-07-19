import type { ReactElement } from 'react'

/**
 * Bandeiras das seleções desenhadas em SVG (ícones nítidos em qualquer
 * plataforma — emoji de bandeira renderiza diferente em cada sistema).
 * Bandeiras nacionais são símbolos de uso livre; os desenhos são
 * simplificações geométricas.
 */

const W = 24
const H = 17

const hStripes = (colors: readonly string[], weights?: readonly number[]): ReactElement => {
  const total = weights ? weights.reduce((sum, weight) => sum + weight, 0) : colors.length
  let y = 0
  return (
    <g>
      {colors.map((color, index) => {
        const height = (H * (weights ? weights[index] : 1)) / total
        const rect = <rect key={index} x="0" y={y} width={W} height={height + 0.2} fill={color} />
        y += height
        return rect
      })}
    </g>
  )
}

const vStripes = (colors: readonly string[], weights?: readonly number[]): ReactElement => {
  const total = weights ? weights.reduce((sum, weight) => sum + weight, 0) : colors.length
  let x = 0
  return (
    <g>
      {colors.map((color, index) => {
        const width = (W * (weights ? weights[index] : 1)) / total
        const rect = <rect key={index} x={x} y="0" width={width + 0.2} height={H} fill={color} />
        x += width
        return rect
      })}
    </g>
  )
}

const star = (cx: number, cy: number, r: number, color: string): ReactElement => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.4
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`
  }).join(' ')
  return <polygon points={points} fill={color} />
}

const FLAGS: Record<string, ReactElement> = {
  brasil: (
    <g>
      <rect width={W} height={H} fill="#009B3A" />
      <polygon points="12,2 21.5,8.5 12,15 2.5,8.5" fill="#FEDF00" />
      <circle cx="12" cy="8.5" r="3.4" fill="#002776" />
    </g>
  ),
  argentina: (
    <g>
      {hStripes(['#74ACDF', '#FFFFFF', '#74ACDF'])}
      <circle cx="12" cy="8.5" r="2" fill="#F6B40E" />
    </g>
  ),
  uruguai: (
    <g>
      {hStripes(['#FFFFFF', '#0038A8', '#FFFFFF', '#0038A8', '#FFFFFF', '#0038A8', '#FFFFFF'])}
      <rect width="10" height="9.7" fill="#FFFFFF" />
      <circle cx="5" cy="4.8" r="2.6" fill="#F6B40E" />
    </g>
  ),
  colombia: hStripes(['#FCD116', '#003893', '#CE1126'], [2, 1, 1]),
  chile: (
    <g>
      {hStripes(['#FFFFFF', '#D52B1E'])}
      <rect width="8" height="8.5" fill="#0039A6" />
      {star(4, 4.25, 2.4, '#FFFFFF')}
    </g>
  ),
  paraguai: (
    <g>
      {hStripes(['#D52B1E', '#FFFFFF', '#0038A8'])}
      <circle cx="12" cy="8.5" r="2.2" fill="none" stroke="#8C9199" strokeWidth="0.9" />
      {star(12, 8.5, 1.1, '#009B3A')}
    </g>
  ),
  equador: (
    <g>
      {hStripes(['#FFD100', '#0072CE', '#EF3340'], [2, 1, 1])}
      <circle cx="12" cy="8.5" r="2.4" fill="#FFD100" stroke="#6C4F2B" strokeWidth="0.8" />
    </g>
  ),
  mexico: (
    <g>
      {vStripes(['#006847', '#FFFFFF', '#CE1126'])}
      <circle cx="12" cy="8.5" r="2.2" fill="#8C6239" />
    </g>
  ),
  portugal: (
    <g>
      {vStripes(['#046A38', '#DA291C'], [2, 3])}
      <circle cx="9.6" cy="8.5" r="2.8" fill="#FFE900" />
      <circle cx="9.6" cy="8.5" r="1.5" fill="#DA291C" />
    </g>
  ),
  espanha: hStripes(['#AA151B', '#F1BF00', '#AA151B'], [1, 2, 1]),
  franca: vStripes(['#0055A4', '#FFFFFF', '#EF4135']),
  italia: vStripes(['#008C45', '#F4F9FF', '#CD212A']),
  alemanha: hStripes(['#1A1A1A', '#DD0000', '#FFCE00']),
  inglaterra: (
    <g>
      <rect width={W} height={H} fill="#FFFFFF" />
      <rect x="10" y="0" width="4" height={H} fill="#CE1124" />
      <rect x="0" y="6.5" width={W} height="4" fill="#CE1124" />
    </g>
  ),
  holanda: hStripes(['#AE1C28', '#FFFFFF', '#21468B']),
  belgica: vStripes(['#1A1A1A', '#FDDA24', '#EF3340']),
}

interface NationFlagProps {
  readonly nationId: string
  /** Largura em px; a altura segue a proporção 24×17. */
  readonly size?: number
  readonly title?: string
}

export const NationFlag = ({ nationId, size = 18, title }: NationFlagProps) => {
  const art = FLAGS[nationId]
  if (!art) return null
  const clipId = `flag-${nationId}`
  return (
    <svg
      className="club-crest nation-flag"
      width={size}
      height={(size * H) / W}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={title ?? 'Bandeira'}
    >
      <defs>
        <clipPath id={clipId}>
          <rect width={W} height={H} rx="2.4" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{art}</g>
      <rect
        width={W}
        height={H}
        rx="2.4"
        fill="none"
        stroke="rgba(255, 255, 255, 0.28)"
        strokeWidth="1"
      />
    </svg>
  )
}
