import type { Club } from '../data/clubs'
import { nationById } from '../data/nations'
import {
  crestIdentityFor,
  type EmblemKind,
  type PatternKind,
  type PlateKind,
  type ShieldKind,
} from './clubCrestIdentity'
import { NationFlag } from './NationFlag'

/**
 * Heráldica fictícia: cada clube ganha um brasão único e determinístico, com
 * formato, padrão e símbolo ligados à sua identidade regional. Se o jogador
 * enviou escudo próprio, ele continua tendo prioridade (local, só neste save).
 * Seleções nacionais usam a bandeira do país (emoji — símbolo público).
 */

const NATION_PREFIX = 'nation-'

interface ClubCrestProps {
  readonly club: Club
  readonly customUrl?: string
  readonly size?: number
}

const SHIELDS: Readonly<Record<ShieldKind, string>> = {
  classic: 'M12 1 L22 4 V14 C22 21 17 25.5 12 27 C7 25.5 2 21 2 14 V4 Z',
  rounded: 'M12 1 L22 3.5 V16 C22 22.5 17.5 26.5 12 27 C6.5 26.5 2 22.5 2 16 V3.5 Z',
  pennant: 'M12 1 L22 4 V17 L12 27 L2 17 V4 Z',
  crowned: 'M2 5 L6 2 L9 5 L12 1 L15 5 L18 2 L22 5 V15 C22 21 17 25.5 12 27 C7 25.5 2 21 2 15 Z',
  diamond: 'M12 1 L22 7 L20 19 L12 27 L4 19 L2 7 Z',
  roundel: 'M12 1 C18.2 1 22 5.2 22 13.4 C22 21 17.2 25.8 12 27 C6.8 25.8 2 21 2 13.4 C2 5.2 5.8 1 12 1 Z',
  banner: 'M3 2 H21 V19 L16.5 17.2 L12 27 L7.5 17.2 L3 19 Z',
}

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
    case 'hoops':
      return (
        <g fill={color}>
          <rect x="0" y="4" width="24" height="2.8" />
          <rect x="0" y="10" width="24" height="2.8" />
          <rect x="0" y="16" width="24" height="2.8" />
          <rect x="0" y="22" width="24" height="2.8" />
        </g>
      )
    case 'quarters':
      return (
        <g fill={color}>
          <rect x="12" y="0" width="12" height="14" />
          <rect x="0" y="14" width="12" height="14" />
        </g>
      )
    case 'chevron':
      return <path d="M0 6 L12 16 L24 6 V13 L12 23 L0 13 Z" fill={color} />
    case 'cross':
      return (
        <g fill={color}>
          <rect x="9.4" y="0" width="5.2" height="28" />
          <rect x="0" y="10.6" width="24" height="5.2" />
        </g>
      )
    case 'waves':
      return (
        <g fill="none" stroke={color} strokeWidth="2.2" opacity="0.95">
          <path d="M-4 7 Q2 3 8 7 T20 7 T32 7" />
          <path d="M-4 13 Q2 9 8 13 T20 13 T32 13" />
          <path d="M-4 19 Q2 15 8 19 T20 19 T32 19" />
          <path d="M-4 25 Q2 21 8 25 T20 25 T32 25" />
        </g>
      )
    case 'rays':
      return (
        <g fill={color} opacity="0.9">
          <path d="M12 14 L1 2 H8 Z" />
          <path d="M12 14 L23 2 H16 Z" />
          <path d="M12 14 L24 18 V25 Z" />
          <path d="M12 14 L0 25 V18 Z" />
        </g>
      )
    default:
      return null
  }
}

const EmblemPlate = ({
  kind,
  color,
  stroke,
}: {
  kind: PlateKind
  color: string
  stroke: string
}) => {
  switch (kind) {
    case 'round':
      return <circle cx="12" cy="13.5" r="6.1" fill={color} stroke={stroke} strokeWidth="0.7" />
    case 'diamond':
      return <path d="M12 6.8 L18.4 13.5 L12 20.2 L5.6 13.5 Z" fill={color} stroke={stroke} strokeWidth="0.7" />
    case 'banner':
      return <rect x="5" y="8" width="14" height="11" rx="1.5" fill={color} stroke={stroke} strokeWidth="0.7" />
    default:
      return null
  }
}

const Emblem = ({
  kind,
  color,
  accent,
}: {
  kind: EmblemKind
  color: string
  accent: string
}) => {
  const strokeProps = {
    stroke: color,
    strokeWidth: 1.55,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  }

  switch (kind) {
    case 'star':
      return <path d="M12 8.5 L13.6 12 L17.4 12.4 L14.6 15 L15.4 18.7 L12 16.8 L8.6 18.7 L9.4 15 L6.6 12.4 L10.4 12 Z" fill={color} />
    case 'crown':
      return (
        <g>
          <path d="M7 10 L9.2 13 L12 8.8 L14.8 13 L17 10 L16.2 17.5 H7.8 Z" fill={color} />
          <rect x="7.6" y="17" width="8.8" height="1.8" rx="0.6" fill={accent} />
        </g>
      )
    case 'lion':
      return (
        <g>
          <path d="M12 7.3 L14 8.6 L16.7 8.2 L16.2 10.7 C18.3 13 17.6 17.4 15.2 19.2 L12 20.2 L8.8 19.2 C6.4 17.4 5.7 13 7.8 10.7 L7.3 8.2 L10 8.6 Z" fill={color} />
          <path d="M9.1 12.1 L10.8 12.7 M14.9 12.1 L13.2 12.7 M10.2 16.5 C11.2 17.3 12.8 17.3 13.8 16.5" fill="none" stroke={accent} strokeWidth="0.9" strokeLinecap="round" />
          <path d="M12 13.4 L13 14.6 L12 15.4 L11 14.6 Z" fill={accent} />
        </g>
      )
    case 'wheat':
      return (
        <g {...strokeProps}>
          <path d="M12 19 V8.5" />
          <path d="M12 11 C9.5 9.5 8.6 10.4 9.1 12.3 C10 13.2 11 13.3 12 13" />
          <path d="M12 13.2 C14.5 11.7 15.4 12.6 14.9 14.4 C14 15.3 13 15.4 12 15.1" />
          <path d="M12 15.2 C9.8 14 8.9 15 9.5 16.7 C10.2 17.5 11.2 17.6 12 17.4" />
        </g>
      )
    case 'sun':
      return (
        <g stroke={color} strokeWidth="1.35" strokeLinecap="round">
          <circle cx="12" cy="13.5" r="3.2" fill={color} stroke="none" />
          <path d="M12 7.5 V9 M12 18 V19.5 M6 13.5 H7.5 M16.5 13.5 H18 M7.8 9.3 L8.9 10.4 M15.1 16.6 L16.2 17.7 M16.2 9.3 L15.1 10.4 M8.9 16.6 L7.8 17.7" />
        </g>
      )
    case 'rail':
      return (
        <g {...strokeProps}>
          <path d="M9 8.5 L8.2 19 M15 8.5 L15.8 19" />
          <path d="M8.8 10.2 H15.2 M8.6 12.8 H15.4 M8.4 15.4 H15.6 M8.2 18 H15.8" />
        </g>
      )
    case 'wave':
      return (
        <g {...strokeProps} strokeWidth="1.8">
          <path d="M6.8 11.4 C9.4 8.4 12.2 9.2 13.4 11.4 C14.2 12.8 15.5 13.1 17.2 11.9" />
          <path d="M6.4 14.2 C8.4 12.9 10.2 13 12 14.2 C13.9 15.5 15.7 15.3 17.6 13.8" />
          <path d="M7.2 17 C9.2 15.8 10.8 16 12.4 17 C14.1 18 15.6 17.8 17 16.8" />
        </g>
      )
    case 'diamond':
      return <path d="M12 8 L16.6 13.5 L12 19 L7.4 13.5 Z" fill={color} />
    case 'anchor':
      return (
        <g {...strokeProps}>
          <circle cx="12" cy="9.2" r="1.7" />
          <path d="M12 10.9 V18.6 M9 13 H15" />
          <path d="M7.4 15.4 C7.9 18.3 9.9 19.5 12 19.5 C14.1 19.5 16.1 18.3 16.6 15.4" />
        </g>
      )
    case 'tower':
      return (
        <g fill={color}>
          <path d="M8 9 H10 V7.8 H11.2 V9 H12.8 V7.8 H14 V9 H16 V19 H8 Z" />
          <rect x="10.7" y="14" width="2.6" height="5" rx="1.2" fill={accent} />
          <rect x="9.3" y="11" width="1.5" height="1.8" fill={accent} />
          <rect x="13.2" y="11" width="1.5" height="1.8" fill={accent} />
        </g>
      )
    case 'wind':
      return (
        <g {...strokeProps}>
          <path d="M6 10.5 H14.5 C17.3 10.5 17.6 7.5 15.4 7.5 C14.4 7.5 13.8 8 13.5 8.7" />
          <path d="M6 13.5 H17 C19.1 13.5 19.2 16.4 17 16.4 C16 16.4 15.4 15.9 15.1 15.1" />
          <path d="M7.2 16.8 H12.2" />
        </g>
      )
    case 'horseshoe':
      return <path d="M8 9.2 V14.8 C8 20.4 16 20.4 16 14.8 V9.2 H13.6 V14.8 C13.6 17.3 10.4 17.3 10.4 14.8 V9.2 Z" fill={color} />
    case 'feather':
      return (
        <g {...strokeProps}>
          <path d="M8 19 C9 13 11.1 9 16.8 7.8 C17.1 13.4 13.9 17 8 19 Z" fill={color} stroke="none" />
          <path d="M8 19 L15.4 10 M10.7 15.8 L9.4 13.1 M13 13.1 L15.3 13.5" stroke={accent} />
        </g>
      )
    case 'lighthouse':
      return (
        <g>
          <path d="M10 10 H14 L15.4 19 H8.6 Z" fill={color} />
          <rect x="9.2" y="8.2" width="5.6" height="2.5" rx="0.8" fill={accent} />
          <path d="M6.2 9.4 L9 9 M15 9 L17.8 9.4" {...strokeProps} />
          <rect x="11.2" y="14" width="1.6" height="5" fill={accent} />
        </g>
      )
    case 'cactus':
      return <path d="M10.4 19 V9.8 C10.4 7.7 13.6 7.7 13.6 9.8 V12.2 H15 V10.8 C15 9.2 17.2 9.2 17.2 10.8 V14.3 C17.2 15.4 16.4 16.2 15.2 16.2 H13.6 V19 Z M10.4 15.2 H8.9 C7.7 15.2 6.8 14.4 6.8 13.2 V11.4 C6.8 9.8 9 9.8 9 11.4 V12.6 H10.4 Z" fill={color} />
    case 'island':
      return (
        <g>
          <path d="M6 18 C8.8 15.8 15.2 15.8 18 18 Z" fill={color} />
          <path d="M12 16 V10.5 M12 11 C9.8 9.2 8.1 10.2 7.5 11.5 M12 11 C14.2 9.2 15.9 10.2 16.5 11.5" {...strokeProps} />
          <path d="M7 19.2 Q9 18 11 19.2 T15 19.2 T19 19.2" fill="none" stroke={accent} strokeWidth="1.2" />
        </g>
      )
    case 'compass':
      return (
        <g>
          <circle cx="12" cy="13.5" r="5" fill="none" stroke={color} strokeWidth="1.1" />
          <path d="M12 7.8 L14 13.5 L12 19.2 L10 13.5 Z" fill={color} />
          <path d="M6.3 13.5 L12 11.5 L17.7 13.5 L12 15.5 Z" fill={accent} />
        </g>
      )
    case 'globe':
      return (
        <g {...strokeProps} strokeWidth="1.2">
          <circle cx="12" cy="13.5" r="5.2" />
          <path d="M6.8 13.5 H17.2 M12 8.3 C9.8 10.4 9.8 16.6 12 18.7 M12 8.3 C14.2 10.4 14.2 16.6 12 18.7" />
        </g>
      )
    case 'peak':
      return (
        <g fill={color}>
          <path d="M8.6 18.5 L12 10.5 L15.4 18.5 Z" />
          <path d="M5.6 18.5 L8.2 13 L10.4 18.5 Z" opacity="0.75" />
        </g>
      )
    case 'mesa':
      return <path d="M6.5 18.5 L8.3 12 H15.7 L17.5 18.5 H14.8 L14.1 15.3 H9.9 L9.2 18.5 Z" fill={color} />
    case 'gear':
      return (
        <g stroke={color} strokeWidth="1.7" fill="none">
          <circle cx="12" cy="13.5" r="3.2" />
          <path d="M12 7.5 V9 M12 18 V19.5 M6 13.5 H7.5 M16.5 13.5 H18 M7.8 9.3 L8.9 10.4 M15.1 16.6 L16.2 17.7 M16.2 9.3 L15.1 10.4 M8.9 16.6 L7.8 17.7" />
        </g>
      )
    case 'coffee':
      return (
        <g transform="rotate(28 12 13.5)">
          <ellipse cx="12" cy="13.5" rx="4.2" ry="5.5" fill={color} />
          <path d="M12 8.3 C10.3 11.3 13.7 15.5 12 18.7" fill="none" stroke={accent} strokeWidth="1.2" />
        </g>
      )
    case 'scales':
      return (
        <g {...strokeProps}>
          <path d="M12 8 V19 M8 19 H16 M7 11 H17 M9 11 L7 15 M15 11 L17 15" />
          <path d="M5.2 15 C5.8 17.6 8.2 17.6 8.8 15 Z M15.2 15 C15.8 17.6 18.2 17.6 18.8 15 Z" fill={color} />
        </g>
      )
    case 'hook':
      return <path d="M12 8 V16 C12 20.3 17.6 20.5 18 16.2 C16.7 17.2 15.4 17.2 14.8 16.3 C14.4 15.7 14.6 14.9 15.3 14.2" {...strokeProps} strokeWidth="2" />
    case 'bird':
      return <path d="M5.5 14.5 C8.2 9.3 11.1 10 12 12.2 C12.9 10 15.8 9.3 18.5 14.5 C15.4 12.9 13.4 14.5 12 18.2 C10.6 14.5 8.6 12.9 5.5 14.5 Z" fill={color} />
    case 'palm':
      return (
        <g>
          <path d="M11 19 C12.2 15.5 12.4 12.6 12 9.8" {...strokeProps} strokeWidth="2" />
          <path d="M12 10 C8.6 7.8 7 9.4 6.2 11.2 C8.2 10.2 10 10.6 12 11.5 C14 8.3 16.5 8.6 18 10 C15.6 10 14 10.7 12.5 12 C15.8 11.2 17.3 12.8 17.8 14.1 C15.9 13.2 14.3 13.3 12.4 14" fill={color} />
        </g>
      )
    case 'pickaxe':
      return (
        <g {...strokeProps} strokeWidth="1.9">
          <path d="M8 19 L15.8 8.3 M6.5 10.8 C9.4 8.1 13.5 7.6 17.5 9.5" />
        </g>
      )
    case 'flower':
      return (
        <g fill={color}>
          <circle cx="12" cy="10" r="2.3" />
          <circle cx="15.3" cy="12.2" r="2.3" />
          <circle cx="14" cy="16" r="2.3" />
          <circle cx="10" cy="16" r="2.3" />
          <circle cx="8.7" cy="12.2" r="2.3" />
          <circle cx="12" cy="13.3" r="2" fill={accent} />
        </g>
      )
    case 'drop':
      return <path d="M12 7 C12 7 7.8 12.5 7.8 15.4 C7.8 21 16.2 21 16.2 15.4 C16.2 12.5 12 7 12 7 Z" fill={color} />
    case 'anvil':
      return <path d="M6 9 H18 L16 12.2 H13.8 V15.5 L16.5 18.5 H7.5 L10.2 15.5 V12.2 H8.2 Z" fill={color} />
    case 'tree':
      return (
        <g fill={color}>
          <rect x="10.8" y="14" width="2.4" height="5.2" />
          <circle cx="12" cy="11.5" r="4.1" />
          <circle cx="9.1" cy="13.2" r="2.6" />
          <circle cx="14.9" cy="13.2" r="2.6" />
        </g>
      )
    case 'cane':
      return (
        <g {...strokeProps}>
          <path d="M10.5 19 L12.2 8 M13.2 19 L14.8 9.5" />
          <path d="M11.7 11 C9.5 10 8.1 10.7 7.2 12 M14.3 12 C16.4 10.8 17.5 11.6 18 13.1 M13.5 15 C11.5 13.8 10.2 14.4 9.3 15.8" />
        </g>
      )
    case 'ship':
      return (
        <g>
          <path d="M6 16 H18 L15.8 19 H8.2 Z" fill={color} />
          <path d="M12 8.2 V16 M12 9 L16.2 14 H12 Z M11.2 10 L7.7 14 H11.2 Z" {...strokeProps} fill={color} />
        </g>
      )
    case 'gate':
      return (
        <g fill={color}>
          <rect x="7" y="9" width="2.7" height="10" />
          <rect x="14.3" y="9" width="2.7" height="10" />
          <path d="M9.7 12 C9.7 8.8 14.3 8.8 14.3 12 V14 C13.3 12.5 10.7 12.5 9.7 14 Z" />
          <rect x="9.2" y="17" width="5.6" height="2" />
        </g>
      )
    case 'brick':
      return (
        <g fill={color}>
          <rect x="6" y="9" width="5.3" height="3.2" rx="0.4" />
          <rect x="12.1" y="9" width="5.9" height="3.2" rx="0.4" />
          <rect x="6" y="13" width="3.4" height="3.2" rx="0.4" />
          <rect x="10.2" y="13" width="5.2" height="3.2" rx="0.4" />
          <rect x="16.2" y="13" width="1.8" height="3.2" rx="0.4" />
          <rect x="6" y="17" width="6.2" height="2.2" rx="0.4" />
          <rect x="13" y="17" width="5" height="2.2" rx="0.4" />
        </g>
      )
    case 'sprout':
      return (
        <g>
          <path d="M12 19 V12.5" {...strokeProps} />
          <path d="M12 14 C8.4 14 7.3 11.5 7.2 9.6 C10 9.5 12 10.7 12 14 Z M12 12.5 C15.2 12.4 16.7 10.4 16.8 8.6 C14.1 8.5 12 9.8 12 12.5 Z" fill={color} />
        </g>
      )
    case 'cocoa':
      return (
        <g transform="rotate(-20 12 13.5)">
          <ellipse cx="12" cy="13.5" rx="3.7" ry="5.7" fill={color} />
          <path d="M10 9 C11.1 11.7 11 15.9 10 18 M12 8 C13 11 13 16 12 19 M14 9 C14.9 12 14.7 16 14 18" fill="none" stroke={accent} strokeWidth="0.8" />
        </g>
      )
    case 'canoe':
      return (
        <g>
          <path d="M5.5 15.2 C8 18.8 16 18.8 18.5 15.2 C14 16.1 10 16.1 5.5 15.2 Z" fill={color} />
          <path d="M8 10 L15.5 18" {...strokeProps} />
        </g>
      )
    case 'crystal':
      return (
        <g>
          <path d="M12 7 L17 11.5 L15 19 H9 L7 11.5 Z" fill={color} />
          <path d="M12 7 V19 M7 11.5 H17 M7 11.5 L12 19 L17 11.5" fill="none" stroke={accent} strokeWidth="0.8" />
        </g>
      )
    case 'horns':
      return (
        <g {...strokeProps} strokeWidth="2">
          <path d="M11 16 C8.2 16 6 13.4 6.6 9 C7.7 11.2 9 11.4 11 11.1" />
          <path d="M13 16 C15.8 16 18 13.4 17.4 9 C16.3 11.2 15 11.4 13 11.1" />
          <path d="M10.5 14 H13.5 V18 H10.5 Z" fill={color} />
        </g>
      )
    case 'leaf':
      return (
        <g>
          <path d="M7 17.8 C7.8 10.1 12.4 7.7 17.5 8.2 C17.1 14.6 13.6 18.4 7 17.8 Z" fill={color} />
          <path d="M7.5 17.5 L15.6 10 M10.3 14.9 L9.8 11.7 M12.7 12.7 L15.5 13" fill="none" stroke={accent} strokeWidth="0.9" />
        </g>
      )
    case 'fish':
      return (
        <g fill={color}>
          <path d="M7 13.5 C9.5 9.5 14.2 9.5 17 13.5 C14.2 17.5 9.5 17.5 7 13.5 Z" />
          <path d="M17 13.5 L20 10.5 V16.5 Z" />
          <circle cx="10" cy="12.7" r="0.8" fill={accent} />
        </g>
      )
    case 'mangrove':
      return (
        <g {...strokeProps}>
          <path d="M12 12.5 V16 M12 15 L8.5 19 M12 15 L15.5 19 M12 16 L12 20 M10.4 15.7 L7 17.3 M13.6 15.7 L17 17.3" />
          <path d="M7.3 12.8 C7.5 8.4 11.5 7.6 12 10 C12.5 7.6 16.5 8.4 16.7 12.8 C14.2 11.7 9.8 11.7 7.3 12.8 Z" fill={color} stroke="none" />
        </g>
      )
    case 'rain':
      return (
        <g>
          <path d="M7 13.5 C6.2 10.7 8.8 9.2 10.6 10.3 C11.5 7.8 15.4 8.4 15.5 11 C18.3 10.8 19 14.6 16.4 15.2 H8.1 C6 15.2 5.4 13.7 7 13.5 Z" fill={color} />
          <path d="M9 16.7 L8.2 19 M12.3 16.7 L11.5 19 M15.6 16.7 L14.8 19" stroke={accent} strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )
    case 'condor':
      return (
        <g>
          <path d="M5.4 12.6 C8.2 10.9 10.2 11.8 12 13.9 C13.8 11.8 15.8 10.9 18.6 12.6 C16.5 13.3 15 14.6 14 16.2 L12 18.9 L10 16.2 C9 14.6 7.5 13.3 5.4 12.6 Z" fill={color} />
          <circle cx="12" cy="11.2" r="1.6" fill={color} />
          <path d="M12 9.9 L13.4 10.8 L12 11.4 Z" fill={accent} />
        </g>
      )
    case 'jaguar':
      return (
        <g>
          <path d="M12 7.6 L14.3 9 L16.6 8.6 L16.1 11 C17.9 13.2 17.3 17.2 15 18.9 L12 19.9 L9 18.9 C6.7 17.2 6.1 13.2 7.9 11 L7.4 8.6 L9.7 9 Z" fill={color} />
          <path d="M9.4 12.4 L10.9 13 M14.6 12.4 L13.1 13 M10.4 16.6 C11.3 17.3 12.7 17.3 13.6 16.6" fill="none" stroke={accent} strokeWidth="0.9" strokeLinecap="round" />
          <circle cx="9.2" cy="15" r="0.65" fill={accent} />
          <circle cx="14.8" cy="15" r="0.65" fill={accent} />
          <circle cx="12" cy="17.9" r="0.6" fill={accent} />
        </g>
      )
    case 'volcano':
      return (
        <g>
          <path d="M4.8 19.4 L9.6 10.4 H14.4 L19.2 19.4 Z" fill={color} />
          <path d="M9.6 10.4 L10.9 12.6 L12 11.2 L13.1 12.6 L14.4 10.4 Z" fill={accent} />
          <path d="M10.4 8.6 C10.4 7.4 12 7.6 12 6.4 M13.6 8.6 C13.6 7.6 14.9 7.7 14.9 6.8" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
        </g>
      )
    case 'harp':
      return (
        <g>
          <path d="M8 19.4 C8 13.4 10.4 9.4 15.6 7.8" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
          <path d="M8 19.4 H15.6 V7.8" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M10.4 18.2 V11.6 M12.1 18.2 V10.2 M13.8 18.2 V9.1" fill="none" stroke={accent} strokeWidth="0.85" strokeLinecap="round" />
        </g>
      )
    case 'llama':
      return (
        <g>
          <path d="M9 19.2 V14.4 C9 12.6 10.4 11.6 12.2 11.6 H14 V19.2 H12.4 V15.6 H10.6 V19.2 Z" fill={color} />
          <path d="M14 11.6 C14 9.8 15.2 8.6 16.4 8.6 C17 8.6 17.4 9 17.4 9.8 V12 C17.4 12.9 16.7 13.4 15.8 13.4 H14 Z" fill={color} />
          <path d="M16.1 8.6 L15.8 6.9 M17.2 8.8 L17.9 7.2" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
          <circle cx="16.5" cy="10.6" r="0.6" fill={accent} />
        </g>
      )
    case 'orchid':
      return (
        <g>
          <path d="M12 7.4 C13.6 8.6 13.6 11 12 12.2 C10.4 11 10.4 8.6 12 7.4 Z" fill={color} />
          <path d="M16.9 10.6 C16.6 12.6 14.5 13.7 12.8 13.1 C13.5 11.2 15.3 10.2 16.9 10.6 Z" fill={color} />
          <path d="M7.1 10.6 C8.7 10.2 10.5 11.2 11.2 13.1 C9.5 13.7 7.4 12.6 7.1 10.6 Z" fill={color} />
          <path d="M15.5 17.4 C13.9 18.4 11.9 17.6 11.6 15.6 C13.4 15 15 15.7 15.5 17.4 Z" fill={color} />
          <path d="M8.5 17.4 C9 15.7 10.6 15 12.4 15.6 C12.1 17.6 10.1 18.4 8.5 17.4 Z" fill={color} />
          <circle cx="12" cy="13.9" r="1.5" fill={accent} />
        </g>
      )
    case 'maize':
      return (
        <g>
          <path d="M12 8.2 C14 9.4 14.6 12.4 14 15.4 C13.6 17.4 12.8 18.8 12 19.4 C11.2 18.8 10.4 17.4 10 15.4 C9.4 12.4 10 9.4 12 8.2 Z" fill={color} />
          <path d="M12 9.8 V18.4 M10.7 11.6 L13.3 11.6 M10.4 13.8 L13.6 13.8 M10.6 16 L13.4 16" fill="none" stroke={accent} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M10.2 12.4 C8.2 12 7.2 13.6 7.6 16 C9.2 16.2 10 15 10.2 13.4" fill={color} />
        </g>
      )
    case 'cordillera':
      return (
        <g>
          <path d="M4.6 19.2 L9 11.4 L11.6 15.6 L14.4 9.4 L19.4 19.2 Z" fill={color} />
          <path d="M9 11.4 L10.3 13.7 L9 14.3 L7.8 13.6 Z M14.4 9.4 L16 12.5 L14.4 13.2 L12.9 12.4 Z" fill={accent} />
        </g>
      )
  }
}

const colorLuminance = (hex: string): number => {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = (value >> 16) & 0xff
  const green = (value >> 8) & 0xff
  const blue = value & 0xff
  return (red * 0.299 + green * 0.587 + blue * 0.114) / 255
}

const contrastingInk = (background: string): string =>
  colorLuminance(background) > 0.62 ? '#171220' : '#F7F1E5'

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
  const identity = crestIdentityFor(club.id)
  const shield = SHIELDS[identity.shield]
  const plateColor = contrastingInk(club.colors.primary)
  const emblemColor = identity.plate === 'none'
    ? contrastingInk(club.colors.primary)
    : club.colors.primary
  const emblemAccent = identity.plate === 'none'
    ? club.colors.primary
    : plateColor
  const clipId = `crest-${club.id}`

  return (
    <svg className="club-crest" width={size} height={size} viewBox="0 0 24 28" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={shield} />
        </clipPath>
      </defs>
      <path
        d={shield}
        fill={club.colors.primary}
        stroke="#100c1a"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <g clipPath={`url(#${clipId})`}>
        <Pattern kind={identity.pattern} color={club.colors.secondary} />
        <path d="M12 0 L24 0 V28 H12 Z" fill="rgba(255,255,255,0.07)" />
        <path d="M0 21 Q12 27 24 21 V30 H0 Z" fill="rgba(0,0,0,0.12)" />
      </g>
      <EmblemPlate
        kind={identity.plate}
        color={plateColor}
        stroke={club.colors.secondary}
      />
      <Emblem kind={identity.emblem} color={emblemColor} accent={emblemAccent} />
      <path
        d={shield}
        fill="none"
        stroke={club.colors.secondary}
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
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
