/** @type {import('tailwindcss').Config} */
// Tailwind bleibt, weil `Visuals.tsx` an drei Stellen `className="w-full"` benutzt
// (Zeilen 52, 133, 212) – die einzige Tailwind-Klasse der App. Die Bildsprache
// selbst steht in `index.css` und ist an R8 gebunden.
//
// Das Theme ist leer: Die frühere Erweiterung (Farb-, Radius- und Animations-Token
// auf `hsl(var(--…))`) gehörte zur entfernten Sammlung unter `src/components/ui/`.
// Ihre Variablen hat die App nie definiert, und Tailwind gibt ungenutzte Utilities
// ohnehin nicht aus. Gemessen: Gegenüber der alten Konfiguration fallen genau drei
// Regeln weg – `@keyframes enter`, `@keyframes exit` und `.running` aus dem Plugin
// `tailwindcss-animate`. Keine davon wird im Quelltext referenziert.
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
