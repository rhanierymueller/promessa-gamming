import type { MatchRecord } from './save'

/**
 * W.O. por abandono: quando uma partida começa, ela fica marcada como
 * "pendente" no storage. Terminar a partida limpa a marca; se o jogador
 * fechar/recarregar no meio, a marca sobrevive e na volta o adversário
 * leva a vitória por 3×0 (computada no histórico e na temporada).
 */

const PENDING_KEY = 'promessa.pending-match'

export const WO_OPPONENT_GOALS = 3
/** Nota de quem abandonou o time em campo. */
export const WO_RATING = 3

export interface PendingMatch {
  readonly opponentId: string
  readonly kind: 'liga' | 'torneio' | 'libertados' | 'copa-brasil'
  readonly seed: number
}

type PendingStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const markPendingMatch = (storage: PendingStorage, pending: PendingMatch): void => {
  storage.setItem(PENDING_KEY, JSON.stringify(pending))
}

export const clearPendingMatch = (storage: PendingStorage): void => {
  storage.removeItem(PENDING_KEY)
}

export const readPendingMatch = (storage: PendingStorage): PendingMatch | null => {
  const raw = storage.getItem(PENDING_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const candidate = parsed as Record<string, unknown>
    if (typeof candidate.opponentId !== 'string' || candidate.opponentId.length === 0) return null
    const KINDS: readonly PendingMatch['kind'][] = ['liga', 'torneio', 'libertados', 'copa-brasil']
    if (!KINDS.includes(candidate.kind as PendingMatch['kind'])) return null
    if (typeof candidate.seed !== 'number' || !Number.isFinite(candidate.seed)) return null
    return {
      opponentId: candidate.opponentId,
      kind: candidate.kind as PendingMatch['kind'],
      seed: candidate.seed,
    }
  } catch {
    return null
  }
}

/** A derrota computada de quem saiu no meio do jogo. */
export const forfeitRecord = (pending: PendingMatch, playedAt: number): MatchRecord => ({
  opponentId: pending.opponentId,
  teamGoals: 0,
  opponentGoals: WO_OPPONENT_GOALS,
  rating: WO_RATING,
  playerGoals: 0,
  playedAt,
  competition:
    pending.kind === 'torneio'
      ? 'selecao'
      : pending.kind === 'libertados'
        ? 'libertados'
        : pending.kind === 'copa-brasil'
          ? 'copa-brasil'
          : 'liga',
})
