import { ChevronDown, Gamepad2, Play, Shirt, Trophy, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'
import estadioBg from '../assets/backgrounds/estadio.jpg'
import ballSprite from '../assets/sprites/ball.png'
import keeperSprite from '../assets/sprites/k_fly.png'
import celebrateSprite from '../assets/sprites/s_celebrate.png'
import kickSprite from '../assets/sprites/s_kick.png'

/**
 * Landing page do jogo — a "home". Hero com parallax de scroll (as camadas
 * de pixel-art se movem em velocidades diferentes) e seções que revelam ao
 * entrar na tela. Sair da carreira volta para cá.
 */

interface LandingProps {
  readonly hasSave: boolean
  readonly onPlay: () => void
}

const FEATURES = [
  {
    icon: Gamepad2,
    title: 'O chute é seu',
    text: 'Mire com o dedo, calibre força e altura na régua e vença goleiros que leem a sua curva. Habilidade real, não dado escondido.',
  },
  {
    icon: Shirt,
    title: 'Você é o técnico',
    text: 'Escolha a formação, escale os 11, batize os seus jogadores. Escalar um zagueiro no ataque? Pode — e o time sente.',
  },
  {
    icon: Trophy,
    title: 'Carreira viva',
    text: '4 divisões, acesso e queda, jovens que evoluem com potencial, veteranos que penduram as chuteiras aos 38.',
  },
  {
    icon: Users,
    title: 'Ligas com amigos',
    text: 'Crie uma liga por código de convite e dispute o ranking semanal com a sua turma. Zebra do seu amigo? Inaceitável.',
  },
] as const

const STATS = [
  { value: '56', label: 'clubes fictícios' },
  { value: '4', label: 'divisões' },
  { value: '1000+', label: 'jogadores gerados' },
  { value: '16', label: 'seleções' },
] as const

export const Landing = ({ hasSave, onPlay }: LandingProps) => {
  const rootRef = useRef<HTMLDivElement>(null)

  // parallax: camadas do hero andam em velocidades diferentes ao scrollar
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let frame = 0
    const onScroll = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        root.style.setProperty('--scroll', String(y))
        for (const layer of root.querySelectorAll<HTMLElement>('[data-speed]')) {
          const speed = Number(layer.dataset.speed)
          const spin = layer.dataset.spin ? ` rotate(${y * 0.2}deg)` : ''
          layer.style.transform = `translateY(${y * speed}px)${spin}`
        }
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  // reveal: seções aparecem quando entram na tela
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.18 },
    )
    for (const element of root.querySelectorAll('.reveal')) observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const cta = hasSave ? 'Continuar carreira' : 'Começar a carreira'

  return (
    <div className="landing" ref={rootRef}>
      <nav className="landing-nav">
        <span className="landing-brand">PROMESSA</span>
        <button className="btn landing-nav-cta" onClick={onPlay}>
          <Play size={14} aria-hidden="true" /> Jogar
        </button>
      </nav>

      <header className="landing-hero" style={{ backgroundImage: `url(${estadioBg})` }}>
        <div className="landing-hero-glow" aria-hidden="true" />
        <img
          className="hero-sprite hero-keeper"
          src={keeperSprite}
          alt=""
          data-speed="0.32"
          aria-hidden="true"
        />
        <img
          className="hero-sprite hero-kicker"
          src={kickSprite}
          alt=""
          data-speed="0.16"
          aria-hidden="true"
        />
        <img
          className="hero-sprite hero-ball"
          src={ballSprite}
          alt=""
          data-speed="0.45"
          data-spin="1"
          aria-hidden="true"
        />
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

      <section className="landing-section">
        <h2 className="landing-section-title reveal">Feito para quem decide o jogo</h2>
        <div className="landing-features">
          {FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className="landing-card reveal"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <feature.icon size={26} aria-hidden="true" className="landing-card-icon" />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-strip reveal">
        {STATS.map((stat) => (
          <div key={stat.label} className="landing-stat">
            <span className="landing-stat-value">{stat.value}</span>
            <span className="landing-stat-label">{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="landing-final reveal">
        <img className="landing-final-sprite" src={celebrateSprite} alt="" aria-hidden="true" />
        <h2>A torcida já grita o seu nome.</h2>
        <button className="btn landing-cta" onClick={onPlay}>
          <Play size={18} aria-hidden="true" /> {cta}
        </button>
      </section>

      <footer className="landing-footer">
        PROMESSA · mundo 100% fictício · em desenvolvimento
      </footer>
    </div>
  )
}
