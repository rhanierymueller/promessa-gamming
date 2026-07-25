import { nextFloat, type RngResult, type RngState } from '../rng'
import {
  advance,
  applyDefenseResult,
  applyDiceResult,
  applyPassResult,
  applyShotResult,
  currentMoment,
  isFinished,
} from './match'
import type { MatchConfig, MatchMoment, MatchState } from './types'

/**
 * "Simular até o final": resolve o resto da partida sem mini-games.
 * Os lances do jogador viram rolagens de dado com probabilidades derivadas
 * dos atributos dele — quem treinou converte mais.
 */

export interface AutoPlayProbs {
  /** Chance de um chute/falta do jogador virar gol. */
  readonly shotGoal: number
  /** Chance de um passe do jogador completar. */
  readonly passComplete: number
  /** Chance de defender a falta do adversário. */
  readonly defenseSave: number
}

export interface AutoPlayEvent {
  readonly kind: MatchMoment['kind']
  readonly minute: number
  readonly success: boolean
}

export interface AutoPlayResult {
  readonly state: MatchState
  readonly events: readonly AutoPlayEvent[]
}

const AUTO_PASS_RATING_DELTA = 0.3

export const simulateToEnd = (
  state: MatchState,
  config: MatchConfig,
  probs: AutoPlayProbs,
  rng: RngState,
): RngResult<AutoPlayResult> => {
  let current = state
  let dice = rng
  const events: AutoPlayEvent[] = []

  while (!isFinished(current)) {
    const moment = currentMoment(current)
    switch (moment.kind) {
      case 'playerShot':
      case 'playerFreeKick': {
        const roll = nextFloat(dice)
        dice = roll.next
        const isGoal = roll.value < probs.shotGoal
        current = applyShotResult(current, isGoal ? 'goal' : 'save', false, config)
        events.push({ kind: moment.kind, minute: moment.minute, success: isGoal })
        break
      }
      case 'playerPass': {
        const roll = nextFloat(dice)
        dice = roll.next
        const completed = roll.value < probs.passComplete
        current = applyPassResult(
          current,
          completed,
          completed ? AUTO_PASS_RATING_DELTA : -AUTO_PASS_RATING_DELTA,
          config,
        )
        events.push({ kind: moment.kind, minute: moment.minute, success: completed })
        break
      }
      case 'opponentFreeKick': {
        const roll = nextFloat(dice)
        dice = roll.next
        const saved = roll.value < probs.defenseSave
        current = applyDefenseResult(current, saved, config)
        events.push({ kind: moment.kind, minute: moment.minute, success: saved })
        break
      }
      case 'diceDuel': {
        // simular a dividida é moeda ao ar: os dois lados têm o mesmo dado
        const roll = nextFloat(dice)
        dice = roll.next
        const won = roll.value < 0.5
        current = applyDiceResult(current, won, config)
        events.push({ kind: moment.kind, minute: moment.minute, success: won })
        break
      }
      case 'teamGoal':
      case 'opponentGoal':
        current = advance(current)
        events.push({ kind: moment.kind, minute: moment.minute, success: true })
        break
      default:
        current = advance(current)
    }
  }

  return { value: { state: current, events }, next: dice }
}
