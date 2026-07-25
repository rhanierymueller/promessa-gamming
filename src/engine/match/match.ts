import { createRng, nextFloat, nextInt, type RngResult, type RngState } from '../rng'
import type { ShotOutcomeKind } from '../shot/types'
import { clampRating, shotRatingDelta } from './rating'
import type { MatchConfig, MatchMoment, MatchState, PlayerMomentKind } from './types'

const KICKOFF_MINUTE = 1
const FULLTIME_MINUTE = 90

interface PlanDraft {
  readonly moments: readonly MatchMoment[]
  readonly rng: RngState
}

const withMinute = (draft: PlanDraft, build: (minute: number, rng: RngState) => RngResult<MatchMoment>): PlanDraft => {
  const minuteRoll = nextInt(draft.rng, 3, 88)
  const built = build(minuteRoll.value, minuteRoll.next)
  return { moments: [...draft.moments, built.value], rng: built.next }
}

const rollCount = (rng: RngState, chance: number, max: number): RngResult<number> => {
  let count = 0
  let current = rng
  for (let i = 0; i < max; i++) {
    const roll = nextFloat(current)
    if (roll.value < chance) count++
    current = roll.next
  }
  return { value: count, next: current }
}

const buildPlan = (rng: RngState, config: MatchConfig): RngResult<readonly MatchMoment[]> => {
  let draft: PlanDraft = { moments: [], rng }

  const addMoments = (
    count: number,
    make: (minute: number, templateId: number) => MatchMoment,
  ): void => {
    for (let i = 0; i < count; i++) {
      draft = withMinute(draft, (minute, r) => {
        const template = nextInt(r, 0, config.commentaryTemplates - 1)
        return { value: make(minute, template.value), next: template.next }
      })
    }
  }

  addMoments(config.commentaryMoments, (minute, templateId) => ({ kind: 'commentary', minute, templateId }))
  addMoments(config.playerShots, (minute, templateId) => ({ kind: 'playerShot', minute, templateId }))
  addMoments(config.playerFreeKicks, (minute, templateId) => ({ kind: 'playerFreeKick', minute, templateId }))
  addMoments(config.playerPasses, (minute, templateId) => ({ kind: 'playerPass', minute, templateId }))
  addMoments(config.opponentFreeKicks, (minute, templateId) => ({ kind: 'opponentFreeKick', minute, templateId }))
  // no máximo um por partida, e só quando o sorteio manda
  const dice = rollCount(draft.rng, config.diceDuelChance, 1)
  draft = { ...draft, rng: dice.next }
  addMoments(dice.value, (minute, templateId) => ({ kind: 'diceDuel', minute, templateId }))

  const teamGoals = rollCount(draft.rng, config.teamGoalChance, config.maxTeamGoals)
  draft = { ...draft, rng: teamGoals.next }
  addMoments(teamGoals.value, (minute, templateId) => ({ kind: 'teamGoal', minute, templateId }))

  const opponentGoals = rollCount(draft.rng, config.opponentGoalChance, config.maxOpponentGoals)
  draft = { ...draft, rng: opponentGoals.next }
  addMoments(opponentGoals.value, (minute, templateId) => ({ kind: 'opponentGoal', minute, templateId }))

  const ordered = [...draft.moments].sort((a, b) => a.minute - b.minute)
  return {
    value: [
      { kind: 'kickoff', minute: KICKOFF_MINUTE },
      ...ordered,
      { kind: 'fulltime', minute: FULLTIME_MINUTE },
    ],
    next: draft.rng,
  }
}

export const startMatch = (seed: number, config: MatchConfig): MatchState => {
  const plan = buildPlan(createRng(seed), config)
  return {
    plan: plan.value,
    cursor: 0,
    score: { team: 0, opponent: 0 },
    rating: config.baseRating,
    stats: { shots: 0, goals: 0, golacos: 0, passes: 0, passesCompleted: 0 },
    rng: plan.next,
  }
}

export const currentMoment = (state: MatchState): MatchMoment => state.plan[state.cursor]

export const isFinished = (state: MatchState): boolean => state.cursor >= state.plan.length

export const isPlayerMoment = (moment: MatchMoment): moment is MatchMoment & { kind: PlayerMomentKind } =>
  moment.kind === 'playerShot' ||
  moment.kind === 'playerFreeKick' ||
  moment.kind === 'playerPass' ||
  moment.kind === 'opponentFreeKick' ||
  moment.kind === 'diceDuel'

/** Avança momentos NÃO jogáveis, aplicando o efeito no placar. */
export const advance = (state: MatchState): MatchState => {
  if (isFinished(state)) return state
  const moment = currentMoment(state)
  if (isPlayerMoment(moment)) {
    throw new Error(`momento ${moment.kind} exige resultado do mini-game — use applyShotResult/applyPassResult`)
  }
  const score =
    moment.kind === 'teamGoal'
      ? { ...state.score, team: state.score.team + 1 }
      : moment.kind === 'opponentGoal'
        ? { ...state.score, opponent: state.score.opponent + 1 }
        : state.score
  return { ...state, score, cursor: state.cursor + 1 }
}

/** Avança um momento automático, opcionalmente ANULANDO o efeito no placar (tática). */
export const advanceAuto = (state: MatchState, keepEffect: boolean): MatchState => {
  if (isFinished(state)) return state
  const moment = currentMoment(state)
  if (isPlayerMoment(moment)) {
    throw new Error(`momento ${moment.kind} exige resultado do mini-game`)
  }
  if (!keepEffect) return { ...state, cursor: state.cursor + 1 }
  return advance(state)
}

/** Gol emergente de lance corrido (contra-ataque, vacilo) — fora do plano. */
export const applyExtraGoal = (state: MatchState, side: 'team' | 'opponent'): MatchState => ({
  ...state,
  score:
    side === 'team'
      ? { ...state.score, team: state.score.team + 1 }
      : { ...state.score, opponent: state.score.opponent + 1 },
})

export const applyShotResult = (
  state: MatchState,
  outcome: ShotOutcomeKind,
  isGolaco: boolean,
  config: MatchConfig,
): MatchState => {
  const moment = currentMoment(state)
  if (moment.kind !== 'playerShot' && moment.kind !== 'playerFreeKick') {
    throw new Error(`applyShotResult fora de hora: momento atual é ${moment.kind}`)
  }
  const isGoal = outcome === 'goal'
  return {
    ...state,
    cursor: state.cursor + 1,
    score: isGoal ? { ...state.score, team: state.score.team + 1 } : state.score,
    rating: clampRating(state.rating + shotRatingDelta(outcome, isGolaco), config),
    stats: {
      ...state.stats,
      shots: state.stats.shots + 1,
      goals: state.stats.goals + (isGoal ? 1 : 0),
      golacos: state.stats.golacos + (isGoal && isGolaco ? 1 : 0),
    },
  }
}

const DEFENSE_SAVE_RATING = 0.8
const DEFENSE_CONCEDE_RATING = -0.2

/** Falta do adversário: defesa sobe a nota; gol sofrido conta no placar deles. */
/** Nota do lance de dados: ganhar a dividida rende, perder cobra. */
const DICE_WIN_RATING = 0.5
const DICE_LOSS_RATING = -0.3

/**
 * Fecha o lance decisivo no dado: quem venceu marca. Diferente do chute, a
 * nota mexe pouco — foi a sorte que decidiu, não o pé do craque.
 */
export const applyDiceResult = (
  state: MatchState,
  playerWon: boolean,
  config: MatchConfig,
): MatchState => {
  const moment = currentMoment(state)
  if (moment.kind !== 'diceDuel') {
    throw new Error(`applyDiceResult fora de hora: momento atual é ${moment.kind}`)
  }
  return {
    ...state,
    cursor: state.cursor + 1,
    score: playerWon
      ? { ...state.score, team: state.score.team + 1 }
      : { ...state.score, opponent: state.score.opponent + 1 },
    stats: playerWon ? { ...state.stats, goals: state.stats.goals + 1 } : state.stats,
    rating: clampRating(state.rating + (playerWon ? DICE_WIN_RATING : DICE_LOSS_RATING), config),
  }
}

/**
 * Desempate do mata-mata no lance dos dados, DEPOIS do apito final. Não é um
 * momento do plano: entra quando o jogo eliminatório termina igual e alguém
 * precisa avançar. O gol entra no placar como um gol de prorrogação, então o
 * resto do sistema (torneio, histórico, tabela) lê o resultado já decidido,
 * sem precisar saber que houve desempate.
 */
export const applyDecider = (state: MatchState, playerWon: boolean): MatchState => ({
  ...state,
  score: playerWon
    ? { ...state.score, team: state.score.team + 1 }
    : { ...state.score, opponent: state.score.opponent + 1 },
})

/** O jogo acabou empatado e a competição exige um vencedor? */
export const needsDecider = (state: MatchState, decisive: boolean): boolean =>
  decisive && isFinished(state) && state.score.team === state.score.opponent

export const applyDefenseResult = (
  state: MatchState,
  saved: boolean,
  config: MatchConfig,
): MatchState => {
  const moment = currentMoment(state)
  if (moment.kind !== 'opponentFreeKick') {
    throw new Error(`applyDefenseResult fora de hora: momento atual é ${moment.kind}`)
  }
  return {
    ...state,
    cursor: state.cursor + 1,
    score: saved ? state.score : { ...state.score, opponent: state.score.opponent + 1 },
    rating: clampRating(state.rating + (saved ? DEFENSE_SAVE_RATING : DEFENSE_CONCEDE_RATING), config),
  }
}

export const applyPassResult = (
  state: MatchState,
  completed: boolean,
  ratingDelta: number,
  config: MatchConfig,
): MatchState => {
  const moment = currentMoment(state)
  if (moment.kind !== 'playerPass') {
    throw new Error(`applyPassResult fora de hora: momento atual é ${moment.kind}`)
  }
  return {
    ...state,
    cursor: state.cursor + 1,
    rating: clampRating(state.rating + ratingDelta, config),
    stats: {
      ...state.stats,
      passes: state.stats.passes + 1,
      passesCompleted: state.stats.passesCompleted + (completed ? 1 : 0),
    },
  }
}
