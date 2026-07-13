import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import './ui/index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemento #root não encontrado no index.html')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
