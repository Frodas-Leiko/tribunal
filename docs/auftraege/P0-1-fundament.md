# Paket 1 · Fundament: Testrunner und Tribunal-Vollständigkeit

**Items:** B-28 (nur Setup) · B-05 · **Regeln:** R23, R2, R3, §5.4
**Dateien:** `package.json`, `vite.config.ts`, `src/lib/music.ts`, `src/lib/engine.ts`
**Voraussetzung:** keine · **Nachfolger:** Paket 2

---

## Ziel

Ein laufender Testrunner und ein Tribunal, das die zwei häufigsten Anfängerfehler benennt,
statt sie mit „Akkord nicht gefunden" abzuwerten.

Dieses Paket fasst **keine Timer, keinen Zustand und kein Audio** an. Es ist bewusst so
geschnitten, dass es konfliktfrei vor den Pakete 2 und 3 liegt.

---

## Auftrag 1 · Testrunner einrichten (B-28, Teil 1)

Regelwerk §5.4 verlangt automatische Tests für Musik-Logik. Heute existiert kein Runner.
Hier wird **nur die Infrastruktur** gebaut – die volle Testabdeckung aus B-28 AK 2 entsteht
mit den jeweiligen Items.

**Akzeptanzkriterien**

1. `vitest` als devDependency, `npm test` läuft und ist CI-tauglich (kein Watch-Modus im
   Default-Lauf).
2. Konfiguration im bestehenden `vite.config.ts` (kein zweites Config-File), Environment
   `node` – die Musik-Logik braucht kein DOM.
3. Der Alias `@/` gilt im Test genauso wie im Build.
4. `npm run build` und `npm run lint` bleiben grün; die Testdateien laufen durch ESLint,
   ohne neue Warnungen zu erzeugen.

**Nicht in diesem Auftrag:** Tests für `diatonicChords`, `spellTriad` oder die
Akkordfolgen-Auflösung. Die gehören zu B-07 / B-19 / B-20 und würden hier gegen Logik
schreiben, die in P1 und P3 absichtlich noch geändert wird.

---

## Auftrag 2 · Tribunal deckt fehlende und überzählige Töne ab (B-05)

### Befund (verifiziert)

`tribunal()` in [engine.ts:129](../../src/lib/engine.ts) paart ausschließlich *fehlende
Zieltöne* mit *überzähligen gespielten Tönen*. Beide Schleifen laufen leer, sobald eine
der beiden Mengen leer ist:

- **zu wenige Töne** (2 statt 3, kein Extra-Ton) → äußere Schleife findet einen fehlenden
  Ton, innere Schleife hat keinen Partner → `best` bleibt `null`
- **ein Ton zu viel** (3 richtige + 1 zusätzlicher) → äußere Schleife bricht bei jedem
  Zielton via `if (playedPcs.has(pc)) return` ab → `best` bleibt `null`

In beiden Fällen erscheint „Akkord nicht gefunden – Mulde komplett neu formen", obwohl fast
alles stimmte. Das verletzt R2: die große Zeile enthält keine ausführbare Anweisung.

### Umbau

`tribunal()` wird aus dem `useCallback` in `useSession` heraus nach `src/lib/music.ts`
verschoben – als reine Funktion ohne React. Nur so ist AK 5 erfüllbar. Die Funktion ist
bereits vollständig zustandsfrei; der Aufruf in `engine.ts` wird zum Import.

Der Cast `const b = best as { idx: number; diff: number }` in Zeile 142 ist ein Workaround
gegen eine TypeScript-Narrowing-Schwäche und entfällt beim Umbau ersatzlos (Regelwerk §5.5).

### Fallunterscheidung und Rangfolge

R3 erlaubt **genau einen** Hinweis. Die Rangfolge ist der gröbste Fehler zuerst:

| Rang | Fall | Groß (R2) | Klein (R2) |
|---|---|---|---|
| 1 | Vektor: falscher Ton lässt sich einem Zielton zuordnen | `Kleiner Finger (Finger 5): eine Taste tiefer` | `Quinte −1 Halbton` |
| 2 | Zielton fehlt, kein überzähliger Ton | `Kleiner Finger (Finger 5) fehlt` | `Quinte fehlt` |
| 3 | alle Zieltöne da, ein Ton zu viel | `Ein Ton zu viel: Fis loslassen` | `nicht in D-Dur` |
| 4 | kein einziger Zielton getroffen | `Akkord nicht gefunden` | `Ziel: … – Mulde komplett neu formen` |

Die Rangfolge ist fast überschneidungsfrei: Rang 2 und 3 setzen jeweils voraus, dass die
andere Menge leer ist – sonst hätte Rang 1 bereits gegriffen. Der einzige Überlappungsfall
(ein fehlender Ton, zwei überzählige) wird nach R3 vom Vektor abgedeckt.

Für die kleine Zeile in Rang 3 wird der Tonartname gebraucht (`nicht in D-Dur`), für den
Tonnamen `pcName()` – beides liegt in `music.ts`, was den Zielort der Funktion bestätigt.
Die Signatur wird entsprechend erweitert.

Rang 4 ist der Notnagel aus R23 und darf **nur** noch erscheinen, wenn `playedPcs` keinen
einzigen Zielton enthält. Die heutige Aufrufstelle behandelt `null` als Rang 4 – nach dem
Umbau gibt die Funktion diesen Fall selbst zurück; der `null`-Zweig an beiden Aufrufstellen
([engine.ts:249](../../src/lib/engine.ts) und [engine.ts:407](../../src/lib/engine.ts))
entfällt.

### Akzeptanzkriterien (aus dem Backlog)

1. Fehlender Ton → `FINGER 5 fehlt` / klein: `Quinte fehlt`.
2. Überzähliger Ton → `Ein Ton zu viel: Fis loslassen` / klein: `nicht in D-Dur`.
3. Bestehender Vektorfall bleibt unverändert (R3: weiterhin nur **ein** Hinweis).
4. „Akkord nicht gefunden" erscheint nur noch, wenn **kein einziger** Zielton getroffen wurde.
5. Alle vier Fälle sind durch Unit-Tests abgedeckt.

Zusätzlich, weil es beim Umbau anfällt:

6. `direction` bleibt für die Statistik erhalten (`recordAttempt` nutzt sie); für die Fälle
   ohne Richtung wird `0` zurückgegeben, nicht `null` erraten.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` laufen ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien beider Aufträge einzeln nachweisbar
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Zwei Commits**: „B-28: Testrunner (vitest)" und „B-05: Tribunal deckt fehlende und
      überzählige Töne ab (R23)"

## Abgrenzung

**Nicht anfassen** – gehört zu späteren Paketen oder Prioritäten:

- `Scheduler`, `Metronome`, `AudioContext` → Paket 2
- `pausedRef`, `evalTimersRef`, `resumeTimerRef`, `notesRef`, Sammelfenster → Paket 3
- `evaluate()` über die eine geänderte Aufrufzeile hinaus → Paket 3
- Register-Prüfung, `localStorage` in `engine.ts`, `/8` in `Session.tsx` → P1/P2/P4

Die Änderung an `engine.ts` beschränkt sich auf: Import statt lokale Funktion, und die zwei
Aufrufstellen. Alles darüber hinaus kollidiert mit Paket 3.
