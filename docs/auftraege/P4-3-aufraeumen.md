# Paket 3 · Aufräumen

**Items:** B-29 · **Regeln:** §5.1, §5.5, R8 · **Konzept:** §7
**Dateien:** `src/pages/Home.tsx`, `src/App.css`, `src/main.tsx`,
`src/components/ui/*`, `src/hooks/use-mobile.ts`, `src/lib/utils.ts`,
`components.json`, `package.json`, `src/components/Visuals.tsx`,
`src/lib/engine.ts`, `src/lib/midi.ts`
**Voraussetzung:** Paket 2 (B-26 · B-27) · **Nachfolger:** – (P4 abgeschlossen)

---

## Ziel

`npm run lint` läuft auf null. Was im Verzeichnis liegt, gehört zur App – und was zur
App gehört, wird auch benutzt.

---

## Auftrag 1 · Toten Code entfernen (B-29, Teil 1)

### Befund (gemessen)

Vom Einstiegspunkt `src/main.tsx` aus erreicht die App genau diese fremden Bausteine:
`react`, `react-dom/client`, `react-router` und `@fontsource/oswald`. Alles andere in
`package.json` – 43 der 47 Abhängigkeiten, darunter sämtliche `@radix-ui/*`,
`recharts`, `lucide-react`, `zod`, `react-hook-form`, `cmdk`, `embla-carousel-react`,
`vaul`, `sonner`, `date-fns` – existiert ausschließlich für `src/components/ui/`.

- **`src/components/ui/`**: 53 Dateien, 304 KB. Kein Bauteil außerhalb dieses
  Verzeichnisses importiert daraus – geprüft über alle `import`-Zeilen in `src/*.tsx`,
  `src/sections/`, `src/components/*.tsx` und `src/lib/`. Die Sammlung referenziert nur
  sich selbst.
- **`src/lib/utils.ts`** (der `cn()`-Helfer) und **`src/hooks/use-mobile.ts`** werden
  ausschließlich von `ui/` benutzt. `components.json` ist deren Konfiguration.
- **`src/pages/Home.tsx`** ist unveränderte Vite-Vorlage („Vite + React", Zähler-Knopf)
  und importiert **`src/App.css`** – die einzige Verwendung dieser Datei. Beide sind
  von `main.tsx` aus nicht erreichbar.
- **`src/main.tsx`** hüllt `App` in `BrowserRouter`, obwohl keine Route existiert; die
  App schaltet ihre Ansichten über `useState` in [App.tsx](../../src/App.tsx).
- **`Visuals.tsx:276`**: `export const tribunalStyle: CSSProperties = {}` – ein leerer
  Export, den niemand liest.
- Die Backlog-Zeile nennt außerdem `as unknown as`-Zugriffe auf `Metronome.ensure()`
  und den doppelten AudioContext unter `StrictMode`. **Beides ist erledigt:** Eine Suche
  nach `as unknown as` in `src/` findet nichts mehr, und `start()` nimmt den Kontext seit
  R18 als Parameter entgegen ([engine.ts:549](../../src/lib/engine.ts)), während `stop()`
  `metroRef` nullt. Die beiden Punkte entfallen aus dem Item, statt neu erfunden zu werden.

### Entscheidung vor dem Bau

Die Komponentensammlung in `ui/` ist ein vollständiges Fremd-Designsystem. Sie zu
behalten heißt, 43 Abhängigkeiten zu pflegen, die keine Zeile der App benutzt; sie
enthält außerdem eigene Farbwerte und widerspricht damit R8, sobald jemand daraus
etwas übernimmt.

*Empfehlung:* entfernen. Der Griff ist über `git` jederzeit rückholbar, und die App hat
mit `index.css` und `Visuals.tsx` ihre eigene, gebundene Bildsprache. Wird stattdessen
beschlossen, die Sammlung als Vorrat zu behalten, bleibt sie liegen – dann aber mit
einer Zeile Begründung in diesem Auftrag und ohne dass ihre Lint-Fehler weiter als
„bestehend" durchgereicht werden.

### Umbau

- `src/pages/`, `src/App.css`, `src/components/ui/`, `src/hooks/use-mobile.ts`,
  `src/lib/utils.ts` und `components.json` entfernen.
- `BrowserRouter` und `react-router` entfernen.
- Nicht mehr benutzte Abhängigkeiten aus `package.json` streichen; `package-lock.json`
  neu erzeugen.
- `tailwind.config.js`, `postcss.config.js` und die drei `@tailwind`-Zeilen in
  `index.css` bleiben nur, wenn nach dem Entfernen noch eine Tailwind-Klasse benutzt
  wird – `Visuals.tsx` verwendet `className="w-full"` an drei Stellen (Zeilen 52, 133
  und 212). Prüfen, nicht raten.
- `tribunalStyle` entfernen.

### Akzeptanzkriterien (B-29, Teil 1)

1. Vorlage entfernt, ungenutzte Abhängigkeiten und Hüllen entfernt.
2. `npm run build` und `npm test` laufen unverändert; die App zeigt dieselben Ansichten
   wie vorher.
3. Kein Verzeichnis unter `src/` enthält Dateien, die von `main.tsx` aus nicht
   erreichbar sind.

**Prüfweg:**

- AK 1/2: `npm run build` und `npm test` vor und nach dem Entfernen; die Bundle-Größe
  wird im Commit vermerkt (sie ändert sich kaum – toter Code fiel schon dem
  Tree-Shaking zum Opfer; entfernt wird er trotzdem, weil er gelesen und gepflegt wird).
- AK 3 im Browser: Stufenplan, Einheit im Demo-Modus und Statistik einmal durchklicken;
  Konsole ohne Fehler.

---

## Auftrag 2 · `npm run lint` auf null (B-29, Teil 2)

### Befund (gemessen)

`npm run lint` meldet heute **13 Fehler** – nicht neu, aber auch nie behoben. Regelwerk
§5.1 verlangt einen sauberen Lauf; jedes Paket seit P0 hat stattdessen nur „keine neuen
Fehler" nachgewiesen. Die 13 verteilen sich so:

| Ort | Anzahl | Regel |
|---|---|---|
| `src/components/ui/*` (badge, button, button-group, form, navigation-menu, sidebar ×2, toggle) | 8 | `react-refresh/only-export-components`, `Cannot call impure function during render` |
| `Visuals.tsx:11` (`COLORS`) und `:276` (`tribunalStyle`) | 2 | `react-refresh/only-export-components` |
| `Visuals.tsx:204` | 1 | `Cannot call impure function during render` |
| `engine.ts:129` | 1 | `Cannot access refs during render` |
| `midi.ts:24` | 1 | `Cannot access refs during render` |

Acht davon verschwinden mit Auftrag 1. Die restlichen fünf sind echter Code:

- **`Visuals.tsx:204`**: `SubdivisionBar` liest `performance.now()` mitten im Rendern.
  Die Schleife darüber erzwingt ohnehin jeden Bildschirmrahmen ein neues Rendern
  ([Visuals.tsx:190–196](../../src/components/Visuals.tsx)) – die Uhr gehört in diese
  Schleife, nicht in den Rumpf.
- **`engine.ts:129`** (`onPassRef.current = onPass`) und **`midi.ts:24`**
  (`onNoteRef.current = onNote`): beide schreiben während des Renderns in eine Ref.

### Umbau

- `COLORS` (und was sonst kein Bauteil ist) zieht aus `Visuals.tsx` in eine eigene
  Datei um – dieselbe Trennung, die `progression-view.ts` und `scroll-lock.ts` in P3
  bereits vorgemacht haben.
- Die Uhrzeit für den Cursor wird in der `requestAnimationFrame`-Schleife gelesen und
  als Zustand gehalten; der Rumpf bleibt rein. Die Zeitdomäne ändert sich dabei nicht:
  Es bleibt die kalibrierte `performance.now`-Domäne aus R19.
- Die beiden Ref-Zuweisungen wandern in einen Effekt. Sie sind der übliche Weg, einen
  frischen Callback zu halten, ohne ihn zur Abhängigkeit zu machen – im Effekt ist er
  auch der zulässige.
- Keine Regel wird abgeschaltet, um Ruhe zu bekommen. Wird eine Ausnahme nötig, steht
  sie mit Begründung in `eslint.config.js` und wird hier genannt.

### Akzeptanzkriterien (B-29, Teil 2)

1. `npm run lint` meldet null Fehler und null Warnungen.
2. Keine Regel wurde deaktiviert oder herabgestuft, um dorthin zu kommen; jede
   Ausnahme steht mit Begründung in `eslint.config.js`.
3. Der Cursor der Subdivisions-Leiste läuft weiterhin flüssig und trifft die Zählzeit –
   im Demo-Modus bei 60 und bei 100 bpm geprüft.

**Prüfweg:**

- AK 1/2: `npm run lint` und `git diff eslint.config.js`.
- AK 3 im Demo-Modus: Eine Einheit starten und die Serie auf 8 spielen; der Balken
  läuft, die gemessenen Abweichungen bleiben in derselben Größenordnung wie vorher.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm test` ohne Fehler
- [ ] `npm run lint` ohne Fehler **und ohne Warnungen** – zum ersten Mal seit P0
- [ ] Alle Akzeptanzkriterien beider Aufträge einzeln nachweisbar
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Zwei Commits:** „B-29: Toten Code entfernen (§5.5)" und
      „B-29: Lint auf null (§5.1)"

---

## Abgrenzung

- **Kein Neubau** (§6). Dieses Paket entfernt und verschiebt; es schreibt keine
  Musiklogik neu und ändert kein Verhalten. Jede Verhaltensänderung, die auffällt, ist
  ein Fehler dieses Pakets.
- **Der Service Worker** (`public/sw.js`) und das Manifest bleiben unangetastet – sie
  gehören zu R7 und wurden in Paket 2 zuletzt geprüft.
- **B-30 ❓, B-31 ❓, B-32 ❓ und B-13 ❓** bleiben offen. Nach diesem Paket ist P4
  abgeschlossen, und die vier Entscheidungen sind das Einzige, was noch aussteht.
