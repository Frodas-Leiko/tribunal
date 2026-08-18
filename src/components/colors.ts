// ── Der Farbcode (R8) ───────────────────────────────────────────────────────
// Bernstein = Zeit und Reise. Signalgrün = getroffene Wahrheit. Hartes Rot =
// geometrischer Fehler. Grau = Struktur. Eine weitere Farbe braucht eine
// Regeländerung, keinen Commit.
//
// Dieselben Werte stehen als CSS-Variablen in `index.css`; hier liegen sie für
// SVG-Attribute und Inline-Stile, die kein `var(--…)` annehmen. Die Konstante
// wohnt in einer eigenen Datei, damit `Visuals.tsx` ausschließlich Bauteile
// exportiert – so wie `progression-view.ts` und `scroll-lock.ts` es vormachen.

export const COLORS = {
  bg: '#1c1f24',
  panel: '#23272e',
  line: '#3a4048',
  text: '#e8e6e1',
  dim: '#9aa0a8',
  amber: '#e8a33d',
  green: '#3fce7a',
  red: '#e5484d',
};
