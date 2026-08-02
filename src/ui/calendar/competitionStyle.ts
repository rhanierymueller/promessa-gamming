import { ListOrdered, Trophy, type LucideIcon } from 'lucide-react'
import type { CompetitionId } from '../../engine/career/schedule'

/**
 * A cara de cada competição no calendário. Uma tabela só, lida pela agenda e
 * pela grade do mês — assim as duas nunca discordam sobre a cor de um jogo.
 *
 * Criar um torneio novo custa uma linha aqui.
 */

export interface CompetitionStyle {
  readonly name: string
  /** Sufixo da classe CSS: `.cal-comp-libertados`, `.cal-comp-liga`… */
  readonly slug: string
  readonly icon: LucideIcon
}

export const COMPETITION_STYLES: Record<CompetitionId, CompetitionStyle> = {
  // a liga é a maioria dos jogos: destacar todo sábado cansaria a vista
  liga: { name: 'Liga', slug: 'liga', icon: ListOrdered },
  libertados: { name: 'Libertados', slug: 'libertados', icon: Trophy },
  'copa-brasil': { name: 'Copa do Brasil', slug: 'copa-brasil', icon: Trophy },
  'copa-america': { name: 'Copa América', slug: 'copa-america', icon: Trophy },
  'copa-mundo': { name: 'Copa do Mundo', slug: 'copa-mundo', icon: Trophy },
  'liga-nacoes': { name: 'Liga das Nações', slug: 'liga-nacoes', icon: Trophy },
}

export const competitionStyle = (competition: CompetitionId): CompetitionStyle =>
  COMPETITION_STYLES[competition] ?? COMPETITION_STYLES.liga

/** Classe do bloco de um jogo, para a agenda e para o dia da grade. */
export const competitionClass = (competition: CompetitionId): string =>
  `cal-comp-${competitionStyle(competition).slug}`
