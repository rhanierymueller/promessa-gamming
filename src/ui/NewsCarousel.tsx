import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import agenteUrl from '../assets/npcs/agente.jpg'
import coachUrl from '../assets/npcs/coach.jpg'
import olheiroUrl from '../assets/npcs/olheiro.jpg'
import reporterUrl from '../assets/npcs/reporter.jpg'
import portraitFUrl from '../assets/sprites/f_portrait.png'
import portraitUrl from '../assets/sprites/s_portrait.png'
import type { Club } from '../data/clubs'
import { newsFor, type NewsItem, type NewsSource } from '../engine/career/news'
import { faceUrlFor } from '../game/faces'
import type { PlayerSave } from '../state/save'
import { ClubCrest } from './ClubCrest'
import { NationFlag } from './NationFlag'

/** Central de notícias da Home: carrossel que reage ao que acontece no jogo. */

const PORTRAITS: Partial<Record<NewsSource, string>> = {
  reporter: reporterUrl,
  olheiro: olheiroUrl,
  agente: agenteUrl,
  comentarista: coachUrl,
}

const AUTO_ADVANCE_MS = 6000

/**
 * Qual cartão está sob os olhos, dada a posição da rolagem.
 *
 * É o que mantém os pontinhos e o autoavanço em dia com quem arrastou a mão:
 * sem isso o carrossel andava por conta e voltava ao cartão antigo no próximo
 * tique, desfazendo o gesto do jogador.
 */
export const nearestIndex = (offsets: readonly number[], scrollLeft: number): number => {
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  offsets.forEach((offset, index) => {
    const distance = Math.abs(offset - scrollLeft)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  return best
}

/** Onde cada cartão começa dentro da trilha. */
const cardOffsets = (track: HTMLElement): number[] =>
  [...track.children].map((child) => (child as HTMLElement).offsetLeft - track.offsetLeft)

interface NewsCarouselProps {
  readonly save: PlayerSave
  readonly club: Club
}

export const NewsCarousel = ({ save, club }: NewsCarouselProps) => {
  const news = useMemo(() => newsFor(save), [save])
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const pausedRef = useRef(false)
  /* espelho do índice: os handlers de ponteiro leem o valor do momento, e não
     o que estava congelado no fechamento quando o gesto começou */
  const indexRef = useRef(0)
  /* trocou de cartão porque o JOGADOR arrastou — então não rolar de volta */
  const fromScrollRef = useRef(false)
  const dragRef = useRef<{ pointerId: number; startX: number; startScroll: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  // autoavanço: passa a manchete sozinho; pausa com o ponteiro em cima
  useEffect(() => {
    if (news.length < 2) return
    const interval = setInterval(() => {
      if (pausedRef.current) return
      const next = (indexRef.current + 1) % news.length
      indexRef.current = next
      setIndex(next)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(interval)
  }, [news.length])

  useEffect(() => {
    // veio do arrasto: o cartão JÁ está no lugar, mexer seria brigar com a mão
    if (fromScrollRef.current) {
      fromScrollRef.current = false
      return
    }
    const track = trackRef.current
    if (!track) return
    const offset = cardOffsets(track)[index]
    if (offset !== undefined) track.scrollTo({ left: offset, behavior: 'smooth' })
  }, [index])

  if (news.length === 0) return null

  /** A rolagem manda: os pontinhos seguem o dedo, não o contrário. */
  const syncFromScroll = () => {
    const track = trackRef.current
    if (!track) return
    const next = nearestIndex(cardOffsets(track), track.scrollLeft)
    if (next === indexRef.current) return
    fromScrollRef.current = true
    indexRef.current = next
    setIndex(next)
  }

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    // o toque já arrasta sozinho, com inércia — sequestrá-lo pioraria o gesto
    if (event.pointerType === 'touch') return
    const track = trackRef.current
    if (!track || news.length < 2) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: track.scrollLeft,
    }
    setDragging(true)
    pausedRef.current = true
    track.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag || !track) return
    track.scrollLeft = drag.startScroll - (event.clientX - drag.startX)
  }

  const endDrag = () => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag || !track) return
    if (track.hasPointerCapture(drag.pointerId)) track.releasePointerCapture(drag.pointerId)
    dragRef.current = null
    setDragging(false)
    // solta no cartão mais perto: o encaixe do CSS fica desligado no arrasto
    const next = nearestIndex(cardOffsets(track), track.scrollLeft)
    fromScrollRef.current = true
    indexRef.current = next
    setIndex(next)
    track.scrollTo({ left: cardOffsets(track)[next] ?? 0, behavior: 'smooth' })
  }

  const goTo = (target: number) => {
    indexRef.current = target
    setIndex(target)
  }

  const portraitFor = (entry: NewsItem): string | null => {
    // entrevista: o rosto é o de quem falou, o mesmo das cartas do elenco
    if (entry.speaker) return faceUrlFor(entry.speaker.playerId, save.appearance.gender)
    if (entry.source === 'jogador') {
      return save.appearance.gender === 'feminino' ? portraitFUrl : portraitUrl
    }
    return PORTRAITS[entry.source] ?? null
  }

  return (
    <section className="news-center" aria-label="Central de notícias">
      <span className="card-label">Central de notícias</span>
      <div
        className={`news-track${dragging ? ' news-track-dragging' : ''}`}
        ref={trackRef}
        onScroll={syncFromScroll}
        onPointerEnter={() => { pausedRef.current = true }}
        onPointerLeave={() => { pausedRef.current = false }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {news.map((entry) => {
          const portrait = portraitFor(entry)
          return (
            <article key={entry.id} className="news-card">
              <div className="news-media">
                {entry.source === 'clube' ? (
                  entry.context === 'selecao' ? (
                    <NationFlag nationId={save.nationalityId} size={64} title="Bandeira da seleção" />
                  ) : (
                    <ClubCrest club={club} customUrl={save.customClubCrests[club.id]} size={64} />
                  )
                ) : (
                  portrait && (
                    <img
                      className={`news-portrait${entry.source === 'jogador' ? ' news-portrait-pixel' : ''}`}
                      src={portrait}
                      alt=""
                      aria-hidden="true"
                    />
                  )
                )}
              </div>
              <div className="news-text">
                <span className="news-kicker">{entry.kicker}</span>
                <h3 className="news-headline">{entry.headline}</h3>
                <p className="news-body">{entry.body}</p>
              </div>
            </article>
          )
        })}
      </div>
      {news.length > 1 && (
        <div className="news-dots" role="tablist" aria-label="Notícias">
          {news.map((entry, dotIndex) => (
            <button
              key={entry.id}
              role="tab"
              aria-selected={index === dotIndex}
              aria-label={`Notícia ${dotIndex + 1}`}
              className={`news-dot${index === dotIndex ? ' news-dot-active' : ''}`}
              onClick={() => goTo(dotIndex)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
