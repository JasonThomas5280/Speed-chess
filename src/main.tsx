import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// chessground board base + piece set (data-URI SVGs, no extra network assets)
import '@lichess-org/chessground/assets/chessground.base.css'
import '@lichess-org/chessground/assets/chessground.cburnett.css'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
