import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import './ui/index.css'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { Stage3DPlayground } from './game/three/Stage3DPlayground'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento #root não encontrado no index.html')

// bancada do teste 3D do lance: `?stage3d` abre direto, sem save nem menu
const playground = new URLSearchParams(window.location.search).has('stage3d')

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      {playground ? <Stage3DPlayground /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
