import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/nunito-sans'
import '@fontsource/caveat/500.css'
import '@fontsource/caveat/600.css'
import './styles/index.css'
import { App } from './app/App'
import { registerServiceWorker } from './lib/notifications/push'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

// Push-only service worker (CR-04); no offline caching.
if (import.meta.env.PROD) void registerServiceWorker()

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
