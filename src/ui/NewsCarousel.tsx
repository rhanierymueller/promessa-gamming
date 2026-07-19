import { useEffect, useMemo, useRef, useState } from 'react'
import agenteUrl from '../assets/npcs/agente.jpg'
import coachUrl from '../assets/npcs/coach.jpg'
import olheiroUrl from '../assets/npcs/olheiro.jpg'
import reporterUrl from '../assets/npcs/reporter.jpg'
import portraitFUrl from '../assets/sprites/f_portrait.png'
import portraitUrl from '../assets/sprites/s_portrait.png'
import type { Club } from '../data/clubs'
import { newsFor, type NewsSource } from '../engine/career/news'
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

interface NewsCarouselProps {
  readonly save: PlayerSave
  readonly club: Club
}

export const NewsCarousel = ({ save, club }: NewsCarouselProps) => {
  const news = useMemo(() => newsFor(save), [save])
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const pausedRef = useRef(false)

  // autoavanço: passa a manchete sozinho; pausa com o ponteiro em cima
  useEffect(() => {
    if (news.length < 2) return
    const interval = setInterval(() => {
      if (pausedRef.current) return
      setIndex((current) => (current + 1) % news.length)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(interval)
  }, [news.length])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[index] as HTMLElement | undefined
    if (card) track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' })
  }, [index])

  if (news.length === 0) return null

  const portraitFor = (source: NewsSource): string | null => {
    if (source === 'jogador') {
      return save.appearance.gender === 'feminino' ? portraitFUrl : portraitUrl
    }
    return PORTRAITS[source] ?? null
  }

  return (
    <section className="news-center" aria-label="Central de notícias">
      <span className="card-label">Central de notícias</span>
      <div
        className="news-track"
        ref={trackRef}
        onPointerEnter={() => { pausedRef.current = true }}
        onPointerLeave={() => { pausedRef.current = false }}
      >
        {news.map((entry) => {
          const portrait = portraitFor(entry.source)
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
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
