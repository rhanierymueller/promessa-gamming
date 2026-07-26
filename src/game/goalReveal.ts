import type { LogLine } from './logLine'

/**
 * Gols em trânsito entre a engine e o gramado.
 *
 * A engine contabiliza o gol no instante do sorteio — ela precisa disso para
 * avançar o cursor do plano e saber quando a partida acabou. A mesa tática,
 * porém, leva vários segundos até a bola entrar na rede. Este módulo segura a
 * APRESENTAÇÃO (placar exibido e narração) nesse intervalo, para o número só
 * mudar quando o jogador vê o gol acontecer.
 *
 * Regra de ouro: um gol pendente pode atrasar, NUNCA sumir. Toda saída daqui
 * revela o que estava pendente.
 */

export type GoalSide = 'team' | 'opponent'

export interface PendingGoal {
  /** Id da diretiva que o campo está coreografando para este gol. */
  readonly directiveId: number
  readonly side: GoalSide
  /** Narração que entra no log junto com o gol. */
  readonly line: LogLine
}

export interface GoalRevealState {
  readonly pending: readonly PendingGoal[]
}

export interface Reveal {
  readonly state: GoalRevealState
  /** Narrações que passam a valer agora, na ordem em que os gols saíram. */
  readonly lines: readonly LogLine[]
}

export interface Score {
  readonly team: number
  readonly opponent: number
}

export const EMPTY_REVEAL: GoalRevealState = { pending: [] }

/** Enfileira um gol já somado pela engine e ainda invisível ao jogador. */
export const queueGoal = (state: GoalRevealState, goal: PendingGoal): GoalRevealState => ({
  pending: [...state.pending, goal],
})

/** Quantos gols de cada lado a engine somou e o campo ainda não mostrou. */
export const hiddenGoals = (state: GoalRevealState): Score =>
  state.pending.reduce<Score>(
    (total, goal) =>
      goal.side === 'team'
        ? { ...total, team: total.team + 1 }
        : { ...total, opponent: total.opponent + 1 },
    { team: 0, opponent: 0 },
  )

/** Placar como o jogador deve vê-lo: o da engine menos o que ainda não aconteceu em campo. */
export const visibleScore = (score: Score, state: GoalRevealState): Score => {
  const hidden = hiddenGoals(state)
  return {
    team: Math.max(0, score.team - hidden.team),
    opponent: Math.max(0, score.opponent - hidden.opponent),
  }
}

const split = (state: GoalRevealState, keep: (goal: PendingGoal) => boolean): Reveal => {
  const revealed = state.pending.filter((goal) => !keep(goal))
  if (revealed.length === 0) return { state, lines: [] }
  return {
    state: { pending: state.pending.filter(keep) },
    lines: revealed.map((goal) => goal.line),
  }
}

/**
 * O campo terminou a coreografia da diretiva `directiveId`: revela esse gol e
 * todos os anteriores. Os anteriores foram substituídos em campo por esta
 * diretiva e nunca vão reportar conclusão — segurá-los esconderia gols para
 * sempre.
 */
export const revealUpTo = (state: GoalRevealState, directiveId: number): Reveal =>
  split(state, (goal) => goal.directiveId > directiveId)

/** Desiste da espera (lance, fim de jogo, tempo-limite): tudo pendente vira visível. */
export const revealAll = (state: GoalRevealState): Reveal => split(state, () => false)
