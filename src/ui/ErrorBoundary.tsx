import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CAREER_KEYS } from '../state/localData'
import { clearPendingMatch } from '../state/pendingMatch'

/**
 * Rede de segurança para exceções em render.
 *
 * Sem isto, qualquer erro não tratado deixa a tela BRANCA — sem mensagem e sem
 * caminho de volta. Num jogo com carreira salva isso parece perda de
 * progresso, que é a pior leitura possível: o save está intacto no aparelho,
 * e recarregar resolve na maioria dos casos.
 *
 * O botão de recomeçar existe para o caso raro de o próprio save estar
 * corrompido e derrubar a tela a cada carga — sem ele, a pessoa ficaria presa
 * num laço de erro. Por isso ele PEDE CONFIRMAÇÃO: apagar a carreira é
 * definitivo e não pode acontecer por um clique de impaciência.
 */

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly message: string | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { message: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { message: error instanceof Error ? error.message : 'Erro inesperado' }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    /*
     * Um crash NÃO é abandono de partida.
     *
     * Sem isto, a única saída prática desta tela é recarregar — e no boot o
     * loadSaveChargingForfeit encontra a partida pendente e cobra W.O. 3×0 com
     * nota 3, gravado. Ou seja: um bug nosso custava uma derrota real e
     * definitiva na carreira de quem jogou. A pendência existe para conter
     * quem sai de uma partida que está perdendo, não para punir quem foi
     * vítima de exceção.
     */
    clearPendingMatch(localStorage)
    // sem serviço de telemetria: o console é o que existe para diagnosticar
    // um relato de jogador ("deu tela de erro na hora do pênalti")
    console.error('Promessa quebrou:', error, info.componentStack)
  }

  private readonly reload = (): void => {
    window.location.reload()
  }

  private readonly restart = (): void => {
    if (!window.confirm('Isso APAGA a sua carreira deste aparelho. Tem certeza?')) return
    for (const key of CAREER_KEYS) localStorage.removeItem(key)
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.message === null) return this.props.children
    return (
      <main className="shell">
        <div className="card crash-box">
          <h2>Algo quebrou</h2>
          <p className="muted">
            O jogo encontrou um erro e não conseguiu continuar. <strong>Sua carreira está
            salva</strong> — recarregar costuma resolver.
          </p>
          <p className="crash-detail">{this.state.message}</p>
          <div className="legal-actions">
            <button className="btn" onClick={this.reload}>Recarregar o jogo</button>
            <button className="btn btn-secondary" onClick={this.restart}>
              Recomeçar do zero
            </button>
          </div>
          <p className="muted crash-note">
            Use "recomeçar do zero" só se o erro voltar toda vez que você recarrega.
          </p>
        </div>
      </main>
    )
  }
}
