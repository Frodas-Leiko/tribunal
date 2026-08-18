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

// Kennung des Builds, von Vite eingesetzt (siehe `define` in vite.config.ts).
declare const __BUILD_ID__: string;

// Offline-Fähigkeit (R7): Service Worker nur in sicheren Kontexten – und nur im
// gebauten Stand. In der Entwicklung liefert Vite ohne Inhaltshash aus; ein Cache
// friert die App dort auf den ersten Besuch ein (B-33). Eine vorgefundene
// Registrierung wird deshalb abgeräumt, statt Handarbeit zu verlangen.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      // Die Kennung steht in der Adresse: Sie ändert sich mit jedem Build und ist
      // damit das Signal, an dem der Browser den Worker erneuert – und über die
      // der Worker seinen Cache benennt.
      navigator.serviceWorker.register(`./sw.js?v=${__BUILD_ID__}`)
        .catch(() => { /* offline nicht verfügbar – die App läuft trotzdem */ });
    });
  } else {
    void navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then(() => caches.keys())
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tribunal-')).map((k) => caches.delete(k))))
      .catch(() => { /* nichts abzuräumen, oder kein sicherer Kontext */ });
  }
}
