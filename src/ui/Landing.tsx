import { ChevronDown, Play } from 'lucide-react'
import { useEffect, useRef } from 'react'
import estadioBg from '../assets/backgrounds/estadio.jpg'
import ballSprite from '../assets/sprites/ball.png'
import keeperSprite from '../assets/sprites/k_fly.png'
import followSprite from '../assets/sprites/s_kick2.png'
import kickSprite from '../assets/sprites/s_kick_noball.png'
import { LedBoard } from './landing/LedBoard'
import { StickerWall } from './landing/StickerWall'
import { TunnelOutro } from './landing/TunnelOutro'
import { useRevealOnScroll } from './landing/useRevealOnScroll'
import './styles/landing.css'

/**
 * Landing page do jogo — a "home". O hero é a coreografia do chute controlada
 * pelo scroll; depois dele o jogador atravessa o túnel do vestiário até a boca
 * que dá no gramado. Sair da carreira volta para cá.
 */

interface LandingProps {
  readonly hasSave: boolean
  readonly onPlay: () => void
}

/** Fração da altura da tela que completa o lance do hero. */
const KICK_SCROLL_SPAN = 0.85
/** Ponto do lance em que o goleiro inicia o mergulho. */
const DIVE_START = 0.4
/** Altura da curva da bola, em fração da altura da tela. */
const BALL_ARC_HEIGHT = 0.2
/** Ponto do lance em que o pé encontra a bola: até aqui ela fica colada nele. */
const CONTACT = 0.14
/** Onde a bola descansa dentro da caixa do atleta, em fração dela. */
const FOOT_X = 0.7
const FOOT_Y = 0.9
/** Inclinação do corpo, em graus: recuo antes do contato e giro depois. */
const LEAN_BACK = -9.2
const LEAN_SWING = 17
const LEAN_FOLLOW = 4.6

export const Landing = ({ hasSave, onPlay }: LandingProps) => {
  const rootRef = useRef<HTMLDivElement>(null)

  // coreografia do lance: o scroll é a linha do tempo — o camisa 10 avança,
  // a bola sai do pé dele, cruza o estádio em curva e o goleiro voa na defesa
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ball = root.querySelector<HTMLElement>('.hero-ball')
    const keeper = root.querySelector<HTMLElement>('.hero-keeper')
    const kicker = root.querySelector<HTMLElement>('.hero-kicker')
    const follow = root.querySelector<HTMLElement>('.hero-follow')
    if (!ball || !keeper || !kicker || !follow) return
    // sem movimento: a cena continua montada, só congelada antes do contato
    const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let frame = 0
    const render = (): void => {
      const y = window.scrollY
      root.style.setProperty('--scroll', String(y))
      const progress = isStill ? 0 : Math.min(1, y / (window.innerHeight * KICK_SCROLL_SPAN))
      const dive = Math.max(0, (progress - DIVE_START) / (1 - DIVE_START))

      // goleiro mergulha para baixo e para dentro, girando no ar
      const keeperDx = -dive * keeper.offsetWidth * 0.28
      const keeperDy = dive * keeper.offsetHeight * 0.34
      keeper.style.transform = `translate(${keeperDx}px, ${keeperDy}px) rotate(${dive * 14}deg) scaleX(-1)`

      // o chute de verdade: o corpo recua, encontra a bola e gira no
      // follow-through, trocando de quadro no contato — como na partida
      const isFollow = progress >= CONTACT
      const swing = Math.min(1, progress / CONTACT)
      const lean = isFollow ? LEAN_FOLLOW : LEAN_BACK + swing * LEAN_SWING
      const step = `translateX(${Math.min(1, progress * 4) * 22}px) rotate(${lean}deg)`
      kicker.style.opacity = isFollow ? '0' : '1'
      follow.style.opacity = isFollow ? '1' : '0'
      kicker.style.transform = step
      follow.style.transform = step

      // bola: colada no pé até o contato, depois a curva até a luva
      // (offsetLeft/Top ignoram transforms, então medem a posição de repouso)
      const restX = kicker.offsetLeft + kicker.offsetWidth * FOOT_X - ball.offsetLeft - ball.offsetWidth / 2
      const restY = kicker.offsetTop + kicker.offsetHeight * FOOT_Y - ball.offsetTop - ball.offsetHeight / 2
      const flight = Math.max(0, (progress - CONTACT) / (1 - CONTACT))
      const targetX = keeper.offsetLeft + keeperDx - ball.offsetWidth * 0.3
      const targetY = keeper.offsetTop + keeperDy + keeper.offsetHeight * 0.3
      const arc = Math.sin(flight * Math.PI) * window.innerHeight * BALL_ARC_HEIGHT
      const dx = restX + (targetX - ball.offsetLeft - restX) * flight
      const dy = restY + (targetY - ball.offsetTop - restY) * flight - arc
      ball.style.transform = `translate(${dx}px, ${dy}px) rotate(${flight * 540}deg)`
    }
    render()
    if (isStill) return

    const onScroll = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(render)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  useRevealOnScroll(rootRef)

  const cta = hasSave ? 'Continuar carreira' : 'Começar a carreira'

  return (
    <div className="landing" ref={rootRef}>
      <nav className="landing-nav">
        <span className="landing-brand">PROMESSA</span>
        <button type="button" className="landing-nav-cta" onClick={onPlay}>
          <Play size={13} aria-hidden="true" /> Jogar
        </button>
      </nav>

      <div className="landing-hero-stage">
      <header className="landing-hero" style={{ backgroundImage: `url(${estadioBg})` }}>
        <div className="landing-hero-glow" aria-hidden="true" />
        <img className="hero-sprite hero-keeper" src={keeperSprite} alt="" aria-hidden="true" />
        <img className="hero-sprite hero-striker hero-kicker" src={kickSprite} alt="" aria-hidden="true" />
        <img className="hero-sprite hero-striker hero-follow" src={followSprite} alt="" aria-hidden="true" />
        <img className="hero-sprite hero-ball" src={ballSprite} alt="" aria-hidden="true" />
        <div className="landing-hero-content">
          <p className="landing-eyebrow">Da várzea à seleção</p>
          <h1 className="landing-title">
            PROME<span className="landing-title-accent">SSA</span>
          </h1>
          <p className="landing-tagline">
            O RPG de carreira onde o gol sai do SEU dedo: chute, escale, suba
            de divisão e vire lenda — direto no navegador, de graça.
          </p>
          <button className="btn landing-cta" onClick={onPlay}>
            <Play size={18} aria-hidden="true" /> {cta}
          </button>
          <span className="landing-hint">
            <ChevronDown size={16} aria-hidden="true" /> role para conhecer
          </span>
        </div>
      </header>
      </div>

      <StickerWall />
      <LedBoard />
      <TunnelOutro cta={cta} onPlay={onPlay} />
    </div>
  )
}
