// ── Seiten-Scroll sperren, solange ein Overlay offen ist (B-22 AK 4) ────────
// Querformat ist der einzige gestaltete Zustand (R6): Wenn eine Auswahl oder ein
// Steckbrief offen ist, scrollt die Liste im Panel – nicht die Seite darunter.
// Die Klasse auf `html` schneidet den Seiteninhalt ab (Regeln in `index.css`);
// damit wächst `document.documentElement.scrollHeight` nicht über die Sichthöhe.

import { useEffect } from 'react';

/** Offene Overlays. Der Steckbrief kann über der Auswahl liegen (B-23). */
let offen = 0;

export function useScrollLock(): void {
  useEffect(() => {
    const zurueck = window.scrollY;
    offen += 1;
    document.documentElement.classList.add('scroll-lock');
    return () => {
      offen -= 1;
      // Erst das letzte Overlay gibt die Seite frei – und stellt die Position
      // wieder her, die das Sperren gekostet hat.
      if (offen === 0) {
        document.documentElement.classList.remove('scroll-lock');
        window.scrollTo(0, zurueck);
      }
    };
  }, []);
}
