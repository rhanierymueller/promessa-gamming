import type { SquadPosition } from './players'

/**
 * Formações táticas do SEU time — você é o técnico. Cada formação define os
 * 11 slots (posição) e o desenho no gramado da mesa tática (normalizado,
 * atacando para a direita; o rival é espelhado pela LivePitch).
 */

export type FormationId = '4-3-3' | '4-4-2' | '3-5-2'

/** Posições de linha que o craque pode escolher (goleiro não). */
export type PlayerFieldPosition = Exclude<SquadPosition, 'GOL'>

export interface FormationPoint {
  readonly x: number
  readonly y: number
}

export interface Formation {
  readonly id: FormationId
  readonly label: string
  readonly slots: readonly SquadPosition[]
  readonly layout: readonly FormationPoint[]
}

export const FORMATIONS: Record<FormationId, Formation> = {
  '4-3-3': {
    id: '4-3-3',
    label: '4-3-3 clássico',
    slots: ['GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MEI', 'MEI', 'PON', 'ATA', 'PON'],
    layout: [
      { x: 0.05, y: 0.5 },
      { x: 0.17, y: 0.16 }, { x: 0.15, y: 0.39 }, { x: 0.15, y: 0.61 }, { x: 0.17, y: 0.84 },
      { x: 0.28, y: 0.5 }, { x: 0.3, y: 0.28 }, { x: 0.3, y: 0.72 },
      { x: 0.43, y: 0.18 }, { x: 0.45, y: 0.5 }, { x: 0.43, y: 0.82 },
    ],
  },
  '4-4-2': {
    id: '4-4-2',
    label: '4-4-2 raiz',
    slots: ['GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'MEI', 'VOL', 'VOL', 'MEI', 'ATA', 'ATA'],
    layout: [
      { x: 0.05, y: 0.5 },
      { x: 0.17, y: 0.16 }, { x: 0.15, y: 0.39 }, { x: 0.15, y: 0.61 }, { x: 0.17, y: 0.84 },
      { x: 0.31, y: 0.14 }, { x: 0.28, y: 0.4 }, { x: 0.28, y: 0.6 }, { x: 0.31, y: 0.86 },
      { x: 0.44, y: 0.38 }, { x: 0.44, y: 0.62 },
    ],
  },
  '3-5-2': {
    id: '3-5-2',
    label: '3-5-2 com alas',
    slots: ['GOL', 'ZAG', 'ZAG', 'ZAG', 'LD', 'VOL', 'MEI', 'MEI', 'LE', 'ATA', 'ATA'],
    layout: [
      { x: 0.05, y: 0.5 },
      { x: 0.15, y: 0.28 }, { x: 0.13, y: 0.5 }, { x: 0.15, y: 0.72 },
      { x: 0.3, y: 0.11 }, { x: 0.26, y: 0.5 }, { x: 0.33, y: 0.35 }, { x: 0.33, y: 0.65 }, { x: 0.3, y: 0.89 },
      { x: 0.45, y: 0.4 }, { x: 0.45, y: 0.6 },
    ],
  },
}

export const FORMATION_IDS: readonly FormationId[] = ['4-3-3', '4-4-2', '3-5-2']

/**
 * Identidade tática do clube: cada time joga do SEU jeito, e sempre o mesmo
 * jeito (derivado do id, nada guardado). O elenco nasce montado para essa
 * forma — no seu clube você é o técnico e pode mudar por cima dela.
 */
export const formationIdFor = (clubId: string): FormationId => {
  let hash = 0x811c9dc5
  for (let i = 0; i < clubId.length; i++) {
    hash ^= clubId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return FORMATION_IDS[(hash >>> 0) % FORMATION_IDS.length]
}

const SECTOR: Record<PlayerFieldPosition, readonly SquadPosition[]> = {
  ATA: ['ATA', 'PON'],
  PON: ['PON', 'ATA'],
  MEI: ['MEI', 'VOL'],
  VOL: ['VOL', 'MEI'],
  LD: ['LD', 'ZAG', 'LE'],
  LE: ['LE', 'ZAG', 'LD'],
  ZAG: ['ZAG', 'LD', 'LE'],
}

/** Slot da formação onde o SEU craque joga: posição exata, senão o setor. */
export const userSlotIndex = (id: FormationId, position: PlayerFieldPosition): number => {
  const { slots } = FORMATIONS[id]
  for (const wanted of SECTOR[position]) {
    const index = slots.indexOf(wanted)
    if (index > 0) return index
  }
  return slots.length - 1
}
