import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import './ui/index.css'
import { ErrorBoundary } from './ui/ErrorBoundary'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento #root não encontrado no index.html')

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
