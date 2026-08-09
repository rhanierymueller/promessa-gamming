import { CircleHelp, X } from 'lucide-react'
import { useState } from 'react'
import './styles/onboarding.css'

/**
 * Ajuda permanente: o "?" no cabeçalho abre as perguntas mais comuns.
 *
 * O tour roda uma vez; isto aqui fica para sempre. Cada pergunta é um
 * <details> nativo — abre e fecha sem estado, e o navegador cuida do teclado.
 */

interface FaqEntry {
  readonly question: string
  readonly answer: string
}

export const FAQ_ENTRIES: readonly FaqEntry[] = [
  {
    question: 'Como jogo uma partida?',
    answer:
      'Na aba Início, o card do próximo compromisso tem o botão de jogar. A partida corre ao vivo e para quando um lance é seu: chute, cobrança, defesa ou decisão com a bola no pé.',
  },
  {
    question: 'Como o meu craque evolui?',
    answer:
      'Cada partida rende uma nota. Notas boas viram pontos de treino, e na aba Jogador você gasta esses pontos para subir Finalização, Passe, Cobrança e Defesa. Quanto mais alto o nível, mais caro o próximo.',
  },
  {
    question: 'Para que servem os treinos do Início?',
    answer:
      'São campos de prática: chute, falta, defesa e o duelo de dados. Não gastam nem rendem pontos — servem para você afiar a mão sem o peso de uma partida oficial.',
  },
  {
    question: 'O que é o lance dos dados?',
    answer:
      'É a dividida do jogo: três dados para cada lado, a melhor soma leva o gol. Empatou, morte súbita. Em mata-mata que termina empatado, são os dados que decidem quem avança.',
  },
  {
    question: 'O que são as habilidades?',
    answer:
      'Em certos momentos da carreira o jogo oferece uma habilidade especial (como Folha seca ou Frieza). A escolha é definitiva e muda como o craque se comporta nos lances.',
  },
  {
    question: 'Como sou convocado para a seleção?',
    answer:
      'O olheiro da seleção só olha as Séries A e B. Termine a temporada em boa fase numa dessas divisões e a convocação aparece no Início.',
  },
  {
    question: 'Meu progresso fica salvo?',
    answer:
      'Sim. A carreira é salva neste aparelho a cada mudança e, se você estiver logado, sincroniza com a nuvem — dá para continuar de outro celular ou computador.',
  },
  {
    question: 'O que acontece se eu sair no meio de uma partida?',
    answer:
      'A partida abandonada conta como derrota por W.O. quando você voltar. Termine o jogo para valer a sua atuação.',
  },
  {
    question: 'Posso usar nomes reais de clubes e jogadores?',
    answer:
      'Pode. A aba Editor (no botão Mais) deixa você renomear clubes, trocar escudos e batizar os companheiros de time do seu jeito.',
  },
]

interface HelpFaqProps {
  /** Abre já expandida — usado nos testes, que renderizam sem clique. */
  readonly defaultOpen?: boolean
}

export const HelpFaq = ({ defaultOpen = false }: HelpFaqProps) => {
  const [isOpen, setOpen] = useState(defaultOpen)

  return (
    <>
      <button
        type="button"
        className="help-btn"
        aria-label="Ajuda"
        title="Ajuda"
        onClick={() => setOpen(true)}
      >
        <CircleHelp size={18} />
      </button>

      {isOpen && (
        <div
          className="tour-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="faq-title"
          onClick={() => setOpen(false)}
        >
          <div className="tour-modal faq-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="faq-close"
              aria-label="Fechar a ajuda"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
            <h2 className="tour-title" id="faq-title">Perguntas comuns</h2>
            <div className="faq-list">
              {FAQ_ENTRIES.map((entry) => (
                <details key={entry.question} className="faq-item">
                  <summary className="faq-question">{entry.question}</summary>
                  <p className="faq-answer">{entry.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
