import {
  BadgeDollarSign,
  CalendarDays,
  CircleHelp,
  Dice5,
  Goal,
  House,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import './styles/onboarding.css'

/**
 * O tour de boas-vindas: uma sequência curta de cartões, na primeira visita.
 *
 * Modal em vez de setinhas apontando a interface: os alvos (abas, cards)
 * mudam de lugar entre celular e computador — e um cartão que se explica
 * sozinho envelhece melhor do que coordenadas de tela.
 */

export interface TourStep {
  readonly icon: LucideIcon
  readonly title: string
  readonly text: string
}

/** Primeira entrada no jogo, logo após o login/criação do craque. */
export const HOME_TOUR_STEPS: readonly TourStep[] = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao Promessa',
    text: 'Você é uma jovem promessa do futebol. Jogue partidas, ganhe nota, evolua o craque e leve sua carreira da várzea ao topo.',
  },
  {
    icon: House,
    title: 'Tudo começa no Início',
    text: 'A aba Início mostra o próximo compromisso, as notícias e os treinos. É dali que você entra em campo.',
  },
  {
    icon: CalendarDays,
    title: 'Calendário e Liga',
    text: 'O Calendário reúne os jogos de todas as competições. Na aba Liga ficam a tabela e o seu retrospecto na temporada.',
  },
  {
    icon: Star,
    title: 'Seu craque evolui',
    text: 'Boas atuações rendem pontos de treino. Na aba Jogador você gasta esses pontos para subir Finalização, Passe, Cobrança e Defesa.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Time e Mercado',
    text: 'No botão Mais você encontra o elenco do seu time, o mercado de transferências e o editor para deixar a liga com a sua cara.',
  },
  {
    icon: CircleHelp,
    title: 'Ficou com dúvida?',
    text: 'O botão “?” no alto da tela abre as perguntas mais comuns. Ele fica sempre por lá. Boa carreira!',
  },
]

/** Primeira vez que uma partida abre — antes de a bola rolar. */
export const MATCH_TOUR_STEPS: readonly TourStep[] = [
  {
    icon: Trophy,
    title: 'Dia de jogo',
    text: 'A partida corre ao vivo no campinho. Você acompanha o placar, o relógio e a narração dos lances.',
  },
  {
    icon: Goal,
    title: 'A jogada chega em você',
    text: 'Quando o lance é seu, o jogo para: pode ser um chute a gol, uma cobrança de falta, uma defesa ou uma decisão com a bola no pé.',
  },
  {
    icon: Dice5,
    title: 'O lance dos dados',
    text: 'Dividida de bola vira duelo de dados: melhor soma leva o gol. Em mata-mata empatado, são os dados que decidem a vaga.',
  },
  {
    icon: Star,
    title: 'Sua nota vale ouro',
    text: 'No apito final sua atuação vira uma nota — ela rende pontos de treino e mexe com a moral do craque. Sair no meio do jogo conta como derrota por W.O.',
  },
]

interface OnboardingTourProps {
  readonly steps: readonly TourStep[]
  /** Chamado uma vez só, tanto ao concluir quanto ao pular. */
  readonly onDone: () => void
}

export const OnboardingTour = ({ steps, onDone }: OnboardingTourProps) => {
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  if (!step) return null
  const isLastStep = stepIndex === steps.length - 1

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-modal">
        <span className="tour-icon" aria-hidden="true">
          <step.icon size={28} />
        </span>
        <h2 className="tour-title" id="tour-title">{step.title}</h2>
        <p className="tour-text">{step.text}</p>

        <div className="tour-dots" aria-hidden="true">
          {steps.map((_, index) => (
            <span key={index} className={`tour-dot${index === stepIndex ? ' tour-dot-active' : ''}`} />
          ))}
        </div>

        <div className="tour-actions">
          {!isLastStep && (
            <button type="button" className="tour-skip" onClick={onDone}>
              Pular
            </button>
          )}
          <button
            type="button"
            className="btn tour-next"
            onClick={() => (isLastStep ? onDone() : setStepIndex(stepIndex + 1))}
          >
            {isLastStep ? 'Vamos jogar!' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
