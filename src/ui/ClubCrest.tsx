import type { Club } from '../data/clubs'
import { nationById } from '../data/nations'
import { NationFlag } from './NationFlag'

/**
 * Heráldica procedural: cada clube ganha um brasão ÚNICO e determinístico —
 * formato + padrão + emblema derivados do id. 100% fictício. Se o jogador
 * enviou escudo próprio, o dele aparece (local, só neste save).
 * Seleções nacionais usam a bandeira do país (emoji — símbolo público).
 */

const NATION_PREFIX = 'nation-'

interface ClubCrestProps {
  readonly club: Club
  readonly customUrl?: string
  readonly size?: number
}

/** Hash estável do id → escolhas de heráldica. */
const hashId = (id: string): number => {
  let hash = 2166136261
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const SHIELDS = [
  // clássico pontudo
  'M12 1 L22 4 V14 C22 21 17 25.5 12 27 C7 25.5 2 21 2 14 V4 Z',
  // base redonda
  'M12 1 L22 3.5 V16 C22 22.5 17.5 26.5 12 27 C6.5 26.5 2 22.5 2 16 V3.5 Z',
  // flâmula angular
  'M12 1 L22 4 V17 L12 27 L2 17 V4 Z',
] as const

type PatternKind = 'solid' | 'stripes' | 'sash' | 'band' | 'halves'
const PATTERNS: readonly PatternKind[] = ['solid', 'stripes', 'sash', 'band', 'halves']

type EmblemKind = 'star' | 'ring' | 'diamond' | 'bolt' | 'pine' | 'anchor' | 'peak' | 'ball'
const EMBLEMS: readonly EmblemKind[] = ['star', 'ring', 'diamond', 'bolt', 'pine', 'anchor', 'peak', 'ball']

const Pattern = ({ kind, color }: { kind: PatternKind; color: string }) => {
  switch (kind) {
    case 'stripes':
      return (
        <g fill={color}>
          <rect x="5" y="0" width="3.4" height="28" />
          <rect x="10.3" y="0" width="3.4" height="28" />
          <rect x="15.6" y="0" width="3.4" height="28" />
        </g>
      )
    case 'sash':
      return <rect x="-6" y="10" width="38" height="6" transform="rotate(-28 12 14)" fill={color} />
    case 'band':
      return <rect x="0" y="11" width="24" height="6.5" fill={color} />
    case 'halves':
      return <rect x="12" y="0" width="12" height="28" fill={color} />
    default:
      return null
  }
}

const Emblem = ({ kind, color }: { kind: EmblemKind; color: string }) => {
  switch (kind) {
    case 'star':
      return <path d="M12 8.5 L13.6 12 L17.4 12.4 L14.6 15 L15.4 18.7 L12 16.8 L8.6 18.7 L9.4 15 L6.6 12.4 L10.4 12 Z" fill={color} />
    case 'ring':
      return <circle cx="12" cy="13.5" r="4.4" fill="none" stroke={color} strokeWidth="2.2" />
    case 'diamond':
      return <path d="M12 8 L16.6 13.5 L12 19 L7.4 13.5 Z" fill={color} />
    case 'bolt':
      return <path d="M13.6 7.5 L8.4 14.6 L11.4 14.6 L10 19.8 L15.6 12.6 L12.6 12.6 Z" fill={color} />
    case 'pine':
      return (
        <g fill={color}>
          <path d="M12 7.5 L15.6 13 H8.4 Z" />
          <path d="M12 10.8 L16.4 16.6 H7.6 Z" />
          <rect x="11" y="16.6" width="2" height="2.8" />
        </g>
      )
    case 'anchor':
      return (
        <g stroke={color} strokeWidth="1.9" fill="none" strokeLinecap="round">
          <circle cx="12" cy="9.2" r="1.7" />
          <line x1="12" y1="10.9" x2="12" y2="18.6" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <path d="M7.6 15.6 C8 18.4 10 19.6 12 19.6 C14 19.6 16 18.4 16.4 15.6" />
        </g>
      )
    case 'peak':
      return (
        <g fill={color}>
          <path d="M8.6 18.5 L12 10.5 L15.4 18.5 Z" />
          <path d="M5.6 18.5 L8.2 13 L10.4 18.5 Z" opacity="0.75" />
        </g>
      )
    case 'ball':
      return (
        <g>
          <circle cx="12" cy="13.5" r="4.2" fill={color} />
          <path d="M12 10.8 L14 12.4 L13.2 14.9 H10.8 L10 12.4 Z" fill="rgba(0,0,0,0.4)" />
        </g>
      )
  }
}

export const ClubCrest = ({ club, customUrl, size = 18 }: ClubCrestProps) => {
  if (club.id.startsWith(NATION_PREFIX)) {
    const nation = nationById(club.id.slice(NATION_PREFIX.length))
    if (nation) {
      return <NationFlag nationId={nation.id} size={size} title={`Bandeira de ${nation.name}`} />
    }
  }
  if (customUrl) {
    return (
      <img
        className="club-crest"
        src={customUrl}
        width={size}
        height={size}
        alt={`Escudo de ${club.name}`}
      />
    )
  }
  const hash = hashId(club.id)
  const shield = SHIELDS[hash % SHIELDS.length]
  const pattern = PATTERNS[(hash >> 3) % PATTERNS.length]
  const emblem = EMBLEMS[(hash >> 7) % EMBLEMS.length]
  // emblema em branco quando o padrão já usa a cor secundária no centro
  const busyCenter = pattern === 'band' || pattern === 'sash' || pattern === 'halves'
  const emblemColor = busyCenter ? '#F5F0E6' : club.colors.secondary
  const clipId = `crest-${club.id}`

  return (
    <svg className="club-crest" width={size} height={size} viewBox="0 0 24 28" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={shield} />
        </clipPath>
      </defs>
      <path d={shield} fill={club.colors.primary} />
      <g clipPath={`url(#${clipId})`}>
        <Pattern kind={pattern} color={club.colors.secondary} />
        <path d="M12 1 L22 4 V28 H12 Z" fill="rgba(255,255,255,0.09)" />
      </g>
      <Emblem kind={emblem} color={emblemColor} />
      <path d={shield} fill="none" stroke={club.colors.secondary} strokeWidth="1.4" />
    </svg>
  )
}

/** Redimensiona a imagem enviada para 64×64 e devolve como data URL PNG. */
export const fileToCrestDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('falha ao ler o arquivo'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('arquivo não é uma imagem válida'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas indisponível'))
          return
        }
        ctx.drawImage(img, 0, 0, 64, 64)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
