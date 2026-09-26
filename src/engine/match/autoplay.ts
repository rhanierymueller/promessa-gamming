import { modificadoresPara, type ContextoDaJogada } from '../decision/context'
import { sortearJogadas } from '../decision/draw'
import type { Desfecho } from '../decision/outcomes'
import { escolhaDoPerfil, type Perfil } from '../decision/profile'
import { jogarDecisao } from '../decision/resolve'
import { nextFloat, type RngResult, type RngState } from '../rng'
import {
  advance,
  applyDecisionResult,
  applyDefenseResult,
  applyDiceResult,
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
  /** Chance de defender a falta do adversário. */
  readonly defenseSave: number
}

/**
 * Como as decisões são resolvidas quando o jogador não está no comando.
 *
 * Usa o MESMO catálogo, a MESMA distribuição e a MESMA rolagem de assistência
 * do jogo manual — só a escolha do menu é que vem de um perfil em vez de um
 * clique. Sem isso, simular e jogar produziriam placares de mundos diferentes:
 * uma probabilidade única não representa cinco desfechos.
 */
export interface AutoPlayDecision {
  readonly contexto: ContextoDaJogada
  readonly perfil: Perfil
}

export interface AutoPlayEvent {
  readonly kind: MatchMoment['kind']
  readonly minute: number
  readonly success: boolean
  /** Só nos momentos de decisão: qual desfecho saiu. */
  readonly desfecho?: Desfecho
}

export interface AutoPlayResult {
  readonly state: MatchState
  readonly events: readonly AutoPlayEvent[]
}

export const simulateToEnd = (
  state: MatchState,
  config: MatchConfig,
  probs: AutoPlayProbs,
  decision: AutoPlayDecision,
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
      case 'playerDecision': {
        const menu = sortearJogadas(dice)
        dice = menu.next
        const jogada = escolhaDoPerfil(menu.value, decision.perfil)
        const lance = jogarDecisao(jogada, modificadoresPara(jogada, decision.contexto), dice)
        dice = lance.next
        const { desfecho, notaDelta } = lance.value.resolucao

        current = applyDecisionResult(
          current,
          desfecho,
          notaDelta,
          lance.value.assistConvertida,
          config,
        )
        events.push({
          kind: moment.kind,
          minute: moment.minute,
          success: desfecho === 'gol' || desfecho === 'chance',
          desfecho,
        })
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
      case 'kickoff':
      case 'commentary':
      case 'fulltime':
        current = advance(current)
        break
      default: {
        /*
         * Guarda de exaustividade no lugar de um `default` que engolia tudo.
         * Com o catch-all antigo, esquecer de tratar um momento JOGÁVEL novo
         * não dava erro de compilação: caía aqui, chamava advance() e explodia
         * em runtime dentro do clique de "Simular até o fim". Agora o TypeScript
         * acusa na hora de adicionar o momento.
         */
        const naoTratado: never = moment
        throw new Error(`momento não tratado na simulação: ${String(naoTratado)}`)
      }
    }
  }

  return { value: { state: current, events }, next: dice }
}
