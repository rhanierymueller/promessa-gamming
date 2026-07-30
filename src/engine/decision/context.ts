import type { PlayerAttributes } from '../career/attributes'
import { perkBonusBom, perkCortaContra, type PerkId } from '../career/perks'
import type { MatchupEdges } from '../match/sectorDuel'
import { exposicaoDaTatica, type Tactic } from '../match/tactics'
import type { Jogada } from './catalog'
import type { Modificadores } from './outcomes'

/**
 * Traduz o estado da partida nos números que a distribuição consome.
 *
 * Existe para manter `weights.ts` puro: o cálculo não conhece perk, tática nem
 * setor, só multiplicadores. Isso mantém o núcleo testável sem montar meia
 * partida e evita ciclo de import entre `decision` e `match`.
 *
 * Sobre o atributo `passe`: ele JÁ influencia a partida por outro caminho —
 * alimenta `attrs.pas` do seu jogador, que entra no overall, que entra nos
 * ratings de setor, que dirigem `teamGoalChance` e as probabilidades de
 * simulação. Aqui ele entra de novo, agora como nível da jogada. A sobreposição
 * é real mas indireta e pequena (um jogador na média de um setor), e não é
 * descontada de propósito: subtrair um efeito difuso custaria legibilidade e
 * ainda seria estimativa. Quem responde pelo resultado final é a sonda de
 * calibragem, que mede o placar de ponta a ponta.
 */
export interface ContextoDaJogada {
  readonly attributes: PlayerAttributes
  readonly perks: readonly PerkId[]
  readonly tatica: Tactic
  /** Sua atuação contagiando o time, −0.5..1 (já passado por captainMomentum). */
  readonly momentum: number
  readonly edges: MatchupEdges
  /** O quanto o jogo está truncado, 0..1. */
  readonly travamento: number
}

export const modificadoresPara = (
  jogada: Jogada,
  contexto: ContextoDaJogada,
): Modificadores => ({
  nivel: contexto.attributes[jogada.atributo],
  bonusBom: perkBonusBom(contexto.perks),
  cortaContra: perkCortaContra(contexto.perks),
  taticaContra: exposicaoDaTatica(contexto.tatica),
  momentum: contexto.momentum,
  edgeAtaque: contexto.edges.attack,
  edgeDefesa: contexto.edges.defense,
  travamento: contexto.travamento,
})
