/**
 * Flag de TESTE do renderizador 3D do lance (Three.js no lugar dos PNGs).
 *
 * Fica em localStorage para o jogador ligar uma vez e ver a partida inteira
 * no modo novo; `?render=3d` / `?render=pixel` na URL também mudam a flag,
 * para abrir direto no modo desejado.
 */
export type StageRenderer = 'pixel' | '3d'

const KEY = 'promessa:renderer'

const fromQuery = (): StageRenderer | null => {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('render')
  return value === '3d' || value === 'pixel' ? value : null
}

export const readRenderer = (): StageRenderer => {
  const query = fromQuery()
  if (query) {
    writeRenderer(query)
    return query
  }
  try {
    return localStorage.getItem(KEY) === '3d' ? '3d' : 'pixel'
  } catch {
    return 'pixel'
  }
}

export const writeRenderer = (renderer: StageRenderer): void => {
  try {
    localStorage.setItem(KEY, renderer)
  } catch {
    // sem storage (modo privado): a escolha vale só para esta sessão
  }
}
