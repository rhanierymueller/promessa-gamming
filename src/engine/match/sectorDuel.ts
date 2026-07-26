import type { SectorRatings } from '../squad/sectors'

/**
 * Como os setores de dois times se enfrentam.
 *
 * A ideia, em uma frase: cada gol nasce do ATAQUE de um lado contra a DEFESA
 * do outro, e o MEIO decide quantas vezes isso acontece.
 *
 *   ataque forte × defesa forte → jogo pegado, poucos gols e disputados
 *   ataque forte × defesa fraca → goleada provável
 *   meio forte dos dois lados   → muitas chances para os dois
 *
 * "Provável", nunca garantido: tudo isto desloca PROBABILIDADE, e o sorteio
 * continua podendo entregar a zebra — é o que o jogo tem de futebol.
 */

/** Diferença de overall que representa domínio total de um setor. */
const SECTOR_SPAN = 30

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Vantagem de um setor sobre o outro, de -1 (dominado) a 1 (dominante).
 * Zero quando os dois estão no mesmo nível.
 */
export const sectorEdge = (mine: number, theirs: number): number =>
  clamp((mine - theirs) / SECTOR_SPAN, -1, 1)

export interface MatchupEdges {
  /** Seu ataque contra a defesa deles: quanto você ameaça. */
  readonly attack: number
  /** Sua defesa contra o ataque deles: quanto você segura. */
  readonly defense: number
  /** Meio contra meio: quem constrói mais. */
  readonly midfield: number
}

export const matchupEdges = (mine: SectorRatings, theirs: SectorRatings): MatchupEdges => ({
  attack: sectorEdge(mine.ata, theirs.def),
  defense: sectorEdge(mine.def, theirs.ata),
  midfield: sectorEdge(mine.mei, theirs.mei),
})

/**
 * O quanto o jogo promete ser TRUNCADO: dois setores fortes se anulando
 * seguram o placar, mesmo com os dois times sendo bons. 0 = jogo aberto,
 * 1 = jogo travado.
 */
const TIGHT_FROM = 70
const TIGHT_SPAN = 25

export const tightness = (mine: SectorRatings, theirs: SectorRatings): number => {
  /*
   * Vale o duelo MAIS forte, não a média: basta um lado do campo virar um
   * paredão contra um ataque de respeito para o jogo ficar truncado. Pela
   * média, esse confronto era diluído pelo outro setor e sumia.
   */
  const duels = [
    Math.min(mine.def, theirs.ata),
    Math.min(theirs.def, mine.ata),
  ]
  return clamp((Math.max(...duels) - TIGHT_FROM) / TIGHT_SPAN, 0, 1)
}
