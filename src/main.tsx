import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Kein Router: Die App schaltet ihre drei Ansichten über `useState` in App.tsx.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline-Fähigkeit: Service Worker nur in sicheren Kontexten registrieren,
// stillschweigend ignorieren, wenn die Umgebung ihn blockiert (z. B. Vorschau).
if (
  'serviceWorker' in navigator &&
  (location.protocol === 'https:' || location.hostname === 'localhost')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline nicht verfügbar */ });
  });
}
