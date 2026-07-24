import { FIRST_NAMES, SURNAMES } from '../../data/squadNames'
import { createRng, nextFloat, nextInt } from '../rng'

/**
 * O RIVAL: um atacante gerado com a sua carreira que disputa a artilharia
 * da divisão temporada após temporada. Todo RPG precisa de um nêmesis —
 * ele provoca quando está na frente e nunca some de vez.
 */

export interface RivalState {
  readonly name: string
  readonly clubId: string
  /** Gols do rival na temporada corrente. */
  readonly seasonGoals: number
  readonly careerGoals: number
  /** Seus gols de liga na temporada — o outro lado do duelo. */
  readonly mySeasonGoals: number
}

/** Gera o nêmesis: nome de boleiro + um clube da SUA divisão (nunca o seu). */
export const createRival = (seed: number, candidateClubIds: readonly string[]): RivalState => {
  const rng = createRng(seed)
  const first = nextInt(rng, 0, FIRST_NAMES.length - 1)
  const last = nextInt(first.next, 0, SURNAMES.length - 1)
  const club = nextInt(last.next, 0, Math.max(0, candidateClubIds.length - 1))
  return {
    name: `${FIRST_NAMES[first.value]} ${SURNAMES[last.value]}`,
    clubId: candidateClubIds[club.value] ?? '',
    seasonGoals: 0,
    careerGoals: 0,
    mySeasonGoals: 0,
  }
}

/** Distribuição dos gols do rival por rodada (média ~0.9 por jogo). */
const GOAL_TABLE: readonly { readonly upTo: number; readonly goals: number }[] = [
  { upTo: 0.38, goals: 0 },
  { upTo: 0.78, goals: 1 },
  { upTo: 0.95, goals: 2 },
  { upTo: 1, goals: 3 },
]

/** Quantos gols o rival marca na rodada — determinístico por seed+rodada. */
export const rivalRoundGoals = (seed: number, round: number): number => {
  const roll = nextFloat(createRng((seed ^ Math.imul(round + 1, 0x85ebca6b)) >>> 0))
  return GOAL_TABLE.find((entry) => roll.value < entry.upTo)?.goals ?? 0
}

const BIG_GAP = 3

/** A boca do rival acompanha o placar da artilharia. */
export const rivalTaunt = (rival: RivalState): string => {
  const gap = rival.seasonGoals - rival.mySeasonGoals
  if (gap >= BIG_GAP) return `${rival.name} debocha na entrevista: "tá vendo o topo daqui de cima?"`
  if (gap > 0) return `${rival.name} está na sua frente na artilharia — e faz questão de lembrar.`
  if (gap === 0) return `Empate com ${rival.name} na artilharia. Cada gol agora vale ouro.`
  if (gap > -BIG_GAP) return `${rival.name} vem logo atrás na artilharia, farejando cada chance.`
  return `Até ${rival.name} admite: "essa temporada o palco é dele". Por enquanto.`
}
