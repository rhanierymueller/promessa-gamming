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
  'estados-unidos': (
    <g>
      {hStripes(['#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234', '#FFFFFF', '#B22234'])}
      <rect width="10" height="9.7" fill="#3C3B6E" />
      {star(5, 4.8, 2.4, '#FFFFFF')}
    </g>
  ),
  honduras: (
    <g>
      {hStripes(['#0073CF', '#FFFFFF', '#0073CF'])}
      {star(12, 8.5, 2, '#0073CF')}
    </g>
  ),
  'holanda-nz': (
    <g>
      <rect width={W} height={H} fill="#00247D" />
      <rect width="10" height="7" fill="#012169" />
      <polygon points="0,0 10,7 10,5.6 2,0" fill="#FFFFFF" />
      <polygon points="10,0 0,7 0,5.6 8,0" fill="#FFFFFF" />
      <rect x="4.2" y="0" width="1.6" height="7" fill="#CC142B" />
      <rect x="0" y="2.7" width="10" height="1.6" fill="#CC142B" />
      {star(17, 4.5, 1.5, '#CC142B')}
      {star(19.5, 11, 1.5, '#CC142B')}
    </g>
  ),
  australia: (
    <g>
      <rect width={W} height={H} fill="#00247D" />
      <rect width="10" height="7" fill="#012169" />
      <polygon points="0,0 10,7 10,5.6 2,0" fill="#FFFFFF" />
      <polygon points="10,0 0,7 0,5.6 8,0" fill="#FFFFFF" />
      <rect x="4.2" y="0" width="1.6" height="7" fill="#CC142B" />
      <rect x="0" y="2.7" width="10" height="1.6" fill="#CC142B" />
      {star(5, 12.6, 2, '#FFFFFF')}
      {star(18, 8.5, 2.2, '#FFFFFF')}
    </g>
  ),
  japao: (
    <g>
      <rect width={W} height={H} fill="#FFFFFF" />
      <circle cx="12" cy="8.5" r="4.6" fill="#BC002D" />
    </g>
  ),
  'coreia-do-sul': (
    <g>
      <rect width={W} height={H} fill="#FFFFFF" />
      <path d="M7.4 8.5a4.6 4.6 0 0 1 9.2 0z" fill="#CD2E3A" />
      <path d="M7.4 8.5a4.6 4.6 0 0 0 9.2 0z" fill="#0047A0" />
      <rect x="2" y="4" width="3.4" height="0.9" fill="#1A1A1A" />
      <rect x="18.6" y="12.1" width="3.4" height="0.9" fill="#1A1A1A" />
    </g>
  ),
  'africa-do-sul': (
    <g>
      {hStripes(['#DE3831', '#FFFFFF', '#007A4D', '#FFFFFF', '#002395'], [3, 1, 3, 1, 3])}
      <polygon points="0,0 8,8.5 0,17" fill="#000000" />
      <polygon points="0,3 5.5,8.5 0,14" fill="#FFB612" />
    </g>
  ),
  nigeria: vStripes(['#008751', '#FFFFFF', '#008751']),
  argelia: (
    <g>
      {vStripes(['#006233', '#FFFFFF'])}
      <circle cx="12" cy="8.5" r="3.6" fill="#D21034" />
      <circle cx="13.2" cy="8.5" r="3" fill={'#FFFFFF'} />
    </g>
  ),
  gana: (
    <g>
      {hStripes(['#CE1126', '#FCD116', '#006B3F'])}
      {star(12, 8.5, 2.2, '#000000')}
    </g>
  ),
  camaroes: (
    <g>
      {vStripes(['#007A5E', '#CE1126', '#FCD116'])}
      {star(12, 8.5, 2.2, '#FCD116')}
    </g>
  ),
  'costa-do-marfim': vStripes(['#F77F00', '#FFFFFF', '#009E60']),
  grecia: (
    <g>
      {hStripes(['#0D5EAF', '#FFFFFF', '#0D5EAF', '#FFFFFF', '#0D5EAF'])}
      <rect width="9.6" height="9.6" fill="#0D5EAF" />
      <rect x="3.9" y="0" width="1.8" height="9.6" fill="#FFFFFF" />
      <rect x="0" y="3.9" width="9.6" height="1.8" fill="#FFFFFF" />
    </g>
  ),
  eslovenia: (
    <g>
      {hStripes(['#FFFFFF', '#0000FF', '#FF0000'])}
      <rect x="2" y="2" width="5" height="5" fill="#0000FF" />
      <rect x="2.7" y="2.7" width="3.6" height="3.6" fill="#FFFFFF" />
    </g>
  ),
  eslovaquia: (
    <g>
      {hStripes(['#FFFFFF', '#0B4EA2', '#EE1C25'])}
      <rect x="3" y="4" width="5.4" height="8" rx="2" fill="#EE1C25" />
      <rect x="4" y="5" width="3.4" height="5.6" rx="1.4" fill="#FFFFFF" />
    </g>
  ),
  servia: (
    <g>
      {hStripes(['#C6363C', '#0C4076', '#FFFFFF'])}
      <rect x="6" y="4" width="5" height="8" rx="2" fill="#C6363C" />
    </g>
  ),
  dinamarca: (
    <g>
      <rect width={W} height={H} fill="#C60C30" />
      <rect x="7" y="0" width="2.6" height={H} fill="#FFFFFF" />
      <rect x="0" y="7.2" width={W} height="2.6" fill="#FFFFFF" />
    </g>
  ),
  noruega: (
    <g>
      <rect width={W} height={H} fill="#BA0C2F" />
      <rect x="6.4" y="0" width="3.8" height={H} fill="#FFFFFF" />
      <rect x="0" y="6.6" width={W} height="3.8" fill="#FFFFFF" />
      <rect x="7.4" y="0" width="1.8" height={H} fill="#00205B" />
      <rect x="0" y="7.6" width={W} height="1.8" fill="#00205B" />
    </g>
  ),
  suica: (
    <g>
      <rect width={W} height={H} fill="#DA291C" />
      <rect x="10.6" y="4" width="2.8" height="9" fill="#FFFFFF" />
      <rect x="7.6" y="7" width="8.8" height="3" fill="#FFFFFF" />
    </g>
  ),

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

/** Ids com bandeira desenhada — o teste garante que cobre todas as seleções. */
export const FLAG_IDS: readonly string[] = Object.keys(FLAGS)

export const NationFlag = ({ nationId, size = 18, title }: NationFlagProps) => {
  /*
   * Nunca devolve null: a linha do mercado é uma grade de colunas fixas e a
   * bandeira ocupa uma delas. Sumindo o elemento, todo o resto desliza uma
   * coluna e o nome do jogador vira uma letra só.
   */
  const art = FLAGS[nationId] ?? <rect width={W} height={H} fill="#2A2438" />
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
