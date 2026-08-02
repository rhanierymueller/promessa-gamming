import { useState } from 'react'
import bootCopaAmerica from '../assets/awards/boot-copa-america.png'
import bootCopaBrasil from '../assets/awards/boot-copa-brasil.png'
import bootCopaMundo from '../assets/awards/boot-copa-mundo.png'
import bootLibertados from '../assets/awards/boot-libertados.png'
import bootLigaNacoes from '../assets/awards/boot-liga-nacoes.png'
import bootSerieA from '../assets/awards/boot-serie-a.png'
import bootSerieB from '../assets/awards/boot-serie-b.png'
import bootSerieC from '../assets/awards/boot-serie-c.png'
import bootSerieD from '../assets/awards/boot-serie-d.png'
import mvpBronze from '../assets/awards/mvp-bronze.png'
import mvpGold from '../assets/awards/mvp-gold.png'
import mvpSilver from '../assets/awards/mvp-silver.png'
import trophyCopaAmerica from '../assets/trophies/copa-america.png'
import trophyCopaBrasil from '../assets/trophies/copa-brasil.png'
import trophyCopaMundo from '../assets/trophies/copa-mundo.png'
import trophyLibertados from '../assets/trophies/libertados.png'
import trophyLigaNacoes from '../assets/trophies/liga-nacoes.png'
import trophySerieA from '../assets/trophies/serie-a.png'
import trophySerieB from '../assets/trophies/serie-b.png'
import trophySerieC from '../assets/trophies/serie-c.png'
import trophySerieD from '../assets/trophies/serie-d.png'
import { AWARD_NAMES, MVP_TIER, type Award } from '../engine/career/awards'
import type { CompetitionId } from '../engine/career/schedule'
import type { Trophy, TrophyKind } from '../state/save'
import { COMPETITION_STYLES } from './calendar/competitionStyle'

/**
 * As conquistas nas prateleiras do quarto.
 *
 * Cada peça aparece UMA vez com um contador: três títulos de Série A são um
 * troféu com "3×", não três troféus iguais em fila. Uma estante de repetições
 * conta menos que uma estante de conquistas distintas — e a lista de anos
 * está a um clique.
 */

const BOOT_ART: Record<CompetitionId, string> = {
  liga: bootSerieA,
  'copa-brasil': bootCopaBrasil,
  libertados: bootLibertados,
  'copa-america': bootCopaAmerica,
  'liga-nacoes': bootLigaNacoes,
  'copa-mundo': bootCopaMundo,
}

/** A chuteira da liga muda com a divisão em que o gol foi feito. */
const LEAGUE_BOOT: readonly string[] = [bootSerieA, bootSerieB, bootSerieC, bootSerieD]

const MVP_ART = { gold: mvpGold, silver: mvpSilver, bronze: mvpBronze } as const

const TROPHY_ART: Record<TrophyKind, string> = {
  'serie-a': trophySerieA,
  'serie-b': trophySerieB,
  'serie-c': trophySerieC,
  'serie-d': trophySerieD,
  'copa-america': trophyCopaAmerica,
  'liga-nacoes': trophyLigaNacoes,
  'copa-mundo': trophyCopaMundo,
  libertados: trophyLibertados,
  'copa-brasil': trophyCopaBrasil,
}

const TROPHY_NAMES: Record<TrophyKind, string> = {
  'serie-a': 'Campeão da Série A',
  'serie-b': 'Campeão da Série B',
  'serie-c': 'Campeão da Série C',
  'serie-d': 'Campeão da Série D',
  'copa-america': 'Copa América',
  'liga-nacoes': 'Liga das Nações',
  'copa-mundo': 'Copa do Mundo',
  libertados: 'Copa Libertados',
  'copa-brasil': 'Copa do Brasil',
}

/** Uma peça da estante: a arte, o nome e os anos em que veio. */
export interface ShelfPiece {
  readonly id: string
  readonly art: string
  readonly name: string
  readonly detail: string
  /** Cor da competição, para o halo. */
  readonly slug: string
  readonly years: readonly number[]
}

const awardArt = (award: Award): string =>
  award.kind === 'chuteira'
    ? BOOT_ART[award.competition] ?? LEAGUE_BOOT[0]
    : MVP_ART[MVP_TIER[award.competition] ?? 'bronze']

/**
 * Agrupa por PEÇA, não por conquista: mesma chuteira em anos diferentes vira
 * uma entrada com todos os anos dentro.
 */
export const groupAwards = (awards: readonly Award[]): readonly ShelfPiece[] => {
  const byPiece = new Map<string, ShelfPiece>()
  for (const award of awards) {
    const id = `${award.kind}-${award.competition}`
    const style = COMPETITION_STYLES[award.competition]
    const existing = byPiece.get(id)
    byPiece.set(id, {
      id,
      art: awardArt(award),
      name: AWARD_NAMES[award.kind],
      detail: style?.name ?? award.competition,
      slug: style?.slug ?? 'liga',
      years: [...(existing?.years ?? []), award.year].sort((a, b) => a - b),
    })
  }
  return [...byPiece.values()]
}

export const groupTrophies = (trophies: readonly Trophy[]): readonly ShelfPiece[] => {
  const byPiece = new Map<string, ShelfPiece>()
  for (const trophy of trophies) {
    const existing = byPiece.get(trophy.kind)
    byPiece.set(trophy.kind, {
      id: trophy.kind,
      art: TROPHY_ART[trophy.kind],
      name: 'Título',
      detail: TROPHY_NAMES[trophy.kind],
      slug: trophy.kind.startsWith('serie') ? 'liga' : trophy.kind,
      years: [...(existing?.years ?? []), trophy.year].sort((a, b) => a - b),
    })
  }
  return [...byPiece.values()]
}

interface ShelfProps {
  readonly pieces: readonly ShelfPiece[]
  /** Onde a tábua fica na arte, em % da altura da cena. */
  readonly boardTop: number
  readonly label: string
}

/** Uma prateleira da parede, com as peças apoiadas nela. */
export const RoomShelf = ({ pieces, boardTop, label }: ShelfProps) => {
  const [open, setOpen] = useState<ShelfPiece | null>(null)
  if (pieces.length === 0) return null

  return (
    <>
      <ul
        className="room-shelf-row"
        style={{ bottom: `${100 - boardTop}%` }}
        aria-label={label}
      >
        {pieces.map((piece) => (
          <li key={piece.id} className={`room-piece cal-comp-${piece.slug}`}>
            <button
              type="button"
              className="room-piece-btn"
              onClick={() => setOpen(piece)}
              aria-label={`${piece.name} · ${piece.detail} · ${piece.years.length} vez${piece.years.length > 1 ? 'es' : ''}`}
            >
              <img className="room-piece-art" src={piece.art} alt="" aria-hidden="true" />
              {/* o contador só entra quando há repetição: "1×" seria ruído */}
              {piece.years.length > 1 && (
                <span className="room-piece-count">{piece.years.length}×</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          className="room-detail-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={open.detail}
          onClick={() => setOpen(null)}
        >
          <div
            className={`room-detail cal-comp-${open.slug}`}
            onClick={(event) => event.stopPropagation()}
          >
            <img className="room-detail-art" src={open.art} alt="" aria-hidden="true" />
            <p className="room-detail-kind">{open.name}</p>
            <h3 className="room-detail-name">{open.detail}</h3>
            <p className="room-detail-count">
              {open.years.length === 1 ? 'conquistado 1 vez' : `conquistado ${open.years.length} vezes`}
            </p>
            <ul className="room-detail-years">
              {open.years.map((year) => (
                <li key={year}>ano {year}</li>
              ))}
            </ul>
            <button type="button" className="btn room-detail-close" onClick={() => setOpen(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
