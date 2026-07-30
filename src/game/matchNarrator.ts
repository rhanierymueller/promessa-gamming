import {
  narrationForMoment,
  SIM_LINES,
  withCast,
} from '../data/narration'
import type { AutoPlayEvent } from '../engine/match/autoplay'
import type { MatchMoment } from '../engine/match/types'
import type { LogLine } from './logLine'

/**
 * Quem escolhe as palavras da partida.
 *
 * Saiu de `MatchScreen.tsx` porque montar texto não é responsabilidade de quem
 * controla o relógio, o placar e os mini-games — e o arquivo já passava de
 * 1100 linhas. É puro: dados entram, linha de narração sai.
 */

export interface NarratorCast {
  /** Seu craque. */
  readonly playerName: string
  /** Os homens de frente do seu time, para dar nome ao gol do companheiro. */
  readonly finishers: readonly string[]
  /** Os atacantes deles, para o contra-ataque ter autor. */
  readonly rivalStrikers: readonly string[]
}

export interface MatchNarrator {
  /** Elenco do lance: a mesma variação sempre escolhe os mesmos coadjuvantes. */
  readonly castFor: (variation: number) => { name: string; mate: string; rival: string }
  /** Narração do plano já preenchida com os nomes desta partida. */
  readonly narrateMoment: (moment: MatchMoment) => string
  /** Linha de log de um lance resolvido pela simulação automática. */
  readonly simLineFor: (event: AutoPlayEvent) => LogLine
}

const escolher = (lista: readonly string[], variacao: number, padrao: string): string =>
  lista.length === 0 ? padrao : lista[Math.abs(variacao) % lista.length]

export const createMatchNarrator = ({
  playerName,
  finishers,
  rivalStrikers,
}: NarratorCast): MatchNarrator => {
  const castFor = (variation: number) => ({
    name: playerName,
    mate: escolher(finishers, variation, 'o companheiro'),
    rival: escolher(rivalStrikers, variation, 'o camisa 9 deles'),
  })

  const narrateMoment = (moment: MatchMoment): string => {
    const variation = 'templateId' in moment ? moment.templateId : moment.minute
    return withCast(narrationForMoment(moment), castFor(variation))
  }

  /** Só os desfechos de decisão: cada um tem tom e frase próprios. */
  const LINHAS_DE_DECISAO = {
    gol: { text: SIM_LINES.decisionGoal, tone: 'good' as const },
    chance: { text: SIM_LINES.decisionChance, tone: 'good' as const },
    nada: { text: SIM_LINES.decisionNothing, tone: 'normal' as const },
    perdeu: { text: SIM_LINES.decisionLost, tone: 'bad' as const },
    contra: { text: SIM_LINES.decisionCounter, tone: 'bad' as const },
  }

  const simLineFor = (event: AutoPlayEvent): LogLine => {
    const cast = castFor(event.minute)
    const { minute } = event
    switch (event.kind) {
      case 'playerShot':
      case 'playerFreeKick':
        return {
          minute,
          text: withCast(event.success ? SIM_LINES.shotGoal : SIM_LINES.shotMiss, cast),
          tone: event.success ? 'good' : 'bad',
        }
      case 'playerDecision': {
        const linha = LINHAS_DE_DECISAO[event.desfecho ?? 'nada']
        return { minute, text: withCast(linha.text, cast), tone: linha.tone }
      }
      case 'opponentFreeKick':
        return {
          minute,
          text: withCast(event.success ? SIM_LINES.defenseSave : SIM_LINES.defenseConcede, cast),
          tone: event.success ? 'good' : 'bad',
        }
      case 'teamGoal':
        return { minute, text: withCast(SIM_LINES.planTeamGoal, cast), tone: 'good' }
      default:
        return { minute, text: withCast(SIM_LINES.planOpponentGoal, cast), tone: 'bad' }
    }
  }

  return { castFor, narrateMoment, simLineFor }
}
