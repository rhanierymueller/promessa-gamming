import { writeRenderer, type StageRenderer } from '../state/render3d'

interface RendererToggleProps {
  readonly value: StageRenderer
  readonly onChange: (renderer: StageRenderer) => void
}

/**
 * Chave de TESTE entre o desenho em pixel (PNG) e o 3D (Three.js) do lance.
 * A escolha fica salva e vale também para os lances da partida.
 */
export const RendererToggle = ({ value, onChange }: RendererToggleProps) => {
  const pick = (renderer: StageRenderer): void => {
    if (renderer === value) return
    writeRenderer(renderer)
    onChange(renderer)
  }
  return (
    <div className="renderer-toggle" role="group" aria-label="Estilo gráfico do lance">
      <button type="button" aria-pressed={value === 'pixel'} onClick={() => pick('pixel')}>
        Pixel
      </button>
      <button type="button" aria-pressed={value === '3d'} onClick={() => pick('3d')}>
        3D · teste
      </button>
    </div>
  )
}
