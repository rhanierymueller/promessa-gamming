import { useState } from 'react'
import { ShotStage } from '../ShotStage'

type Lance = 'chute' | 'falta' | 'defesa'

/**
 * Bancada do TESTE 3D: abre com `?stage3d` na URL, sem precisar de save nem
 * de passar pelo menu. Serve para comparar os dois renderizadores lado a
 * lado e para tirar screenshot do lance em cada modo.
 */
export const Stage3DPlayground = () => {
  const [lance, setLance] = useState<Lance>('chute')
  const [renderer, setRenderer] = useState<'pixel' | '3d'>('3d')
  const [round, setRound] = useState(0)

  const key = `${lance}-${renderer}-${round}`
  return (
    <main className="shell">
      <header className="header">
        <p className="eyebrow">Promessa · bancada</p>
        <h1>Lance em {renderer === '3d' ? '3D' : 'pixel'}</h1>
      </header>
      <div className="renderer-toggle" role="group" aria-label="Tipo de lance">
        {(['chute', 'falta', 'defesa'] as const).map((item) => (
          <button key={item} type="button" aria-pressed={lance === item} onClick={() => setLance(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="renderer-toggle" role="group" aria-label="Estilo gráfico">
        <button type="button" aria-pressed={renderer === 'pixel'} onClick={() => setRenderer('pixel')}>
          Pixel
        </button>
        <button type="button" aria-pressed={renderer === '3d'} onClick={() => setRenderer('3d')}>
          3D
        </button>
        <button type="button" onClick={() => setRound((r) => r + 1)}>
          Reiniciar
        </button>
      </div>
      <ShotStage
        key={key}
        renderer={renderer}
        shots={3}
        autoStart={lance !== 'defesa'}
        freeKick={lance === 'falta'}
        wallColor="#D94B4B"
        kitColor="#2F6FD6"
        defense={lance === 'defesa' ? { skill: 0.3, kitColor: '#D94B4B' } : undefined}
      />
      <footer className="footer">PROMESSA · bancada do renderizador</footer>
    </main>
  )
}
