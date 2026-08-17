# Paket 2 · Eine Tür zum Speicher, ein mitlaufendes Level

**Items:** B-17 · B-15 · **Regeln:** R24, R25, R10, R4
**Dateien:** `src/lib/store.ts`, `src/lib/engine.ts`, `eslint.config.js`,
`src/sections/Home.tsx`, `src/sections/Stats.tsx`, neu `src/lib/store.test.ts`
**Voraussetzung:** Paket 1 · **Nachfolger:** Paket 3

---

## Ziel

Ein einziger Zugang zum Speicher, mit Schema-Version und Migration – und darauf aufbauend
ein Tempo-Level, das **innerhalb** einer Einheit mitwächst.

Die Reihenfolge ist gegenüber dem Backlog getauscht (dort B-15 vor B-17): B-15 schreibt
genau die Funktion um, die B-17 aus `engine.ts` herausholt. Andersherum entstünde ein
direkter `localStorage`-Zugriff, den der nächste Commit sofort wieder entfernt.

---

## Auftrag 1 · Persistenz zentralisieren und versionieren (B-17)

### Befund (gemessen)

`registerSuccess()` in [engine.ts:207–209](../../src/lib/engine.ts) liest und schreibt
`localStorage` direkt, mit dem Literal `'tribunal.progress.v1'`:

```ts
const stored = JSON.parse(localStorage.getItem('tribunal.progress.v1') ?? '{}');
const res = passTempo(stored, config.keyId, config.mode);
localStorage.setItem('tribunal.progress.v1', JSON.stringify(res.map));
```

Das umgeht `store.ts` samt dessen `try`/`catch` (voller Speicher, privater Modus) – und
`passTempo()` speichert selbst bereits ([store.ts:74](../../src/lib/store.ts)), sodass
derselbe Datensatz zweimal geschrieben wird. Zwei Wahrheiten, ein dupliziertes Key-Literal.

Zusätzlich trägt kein gespeicherter Datensatz eine `version`
([store.ts:27–28](../../src/lib/store.ts)): `JSON.parse` liefert beim Schema-Bruch
irgendein Objekt, dessen fehlende Felder still zu `undefined` werden. Der Nutzer erfährt
nichts (R25).

### Umbau

1. **Eine Tür.** `engine.ts` ruft nur noch `passTempo()`; das Nachladen und Zurückschreiben
   entfällt. Die Engine kennt keinen Speicher-Schlüssel mehr.
2. **Version am Datensatz.** Fortschritt und Statistik bekommen `version`. Beim Laden:
   bekannte ältere Version → migrieren; unbekannte oder kaputte Daten → Standardwerte,
   **ohne** das Alte zu überschreiben, bis der Nutzer es erfährt (R25).
3. **Sichtbarer Rückfall.** `loadProgress()`/`loadStats()` melden den Zustand
   (`ok | migriert | zurückgefallen`) mit; die Statistik-Seite zeigt eine Zeile, wenn
   nicht `ok`. Kein stiller Datenverlust.
4. **Lint-Regel** (AK 1). In `eslint.config.js` ein `no-restricted-properties`- bzw.
   `no-restricted-syntax`-Eintrag gegen `localStorage`/`sessionStorage`, mit Ausnahme für
   `src/lib/store.ts`. Die Regel ist Teil des Auftrags: AK 1 verlangt sie ausdrücklich.

### Akzeptanzkriterien (B-17)

1. Kein `localStorage`-Zugriff außerhalb von `store.ts` (per Lint-Regel abgesichert).
2. Alle gespeicherten Datensätze tragen ein `version`-Feld mit Migrationspfad.
3. Ein Schema-Bruch fällt sichtbar auf Standardwerte zurück und löscht nichts stillschweigend.

**Prüfweg (ohne MIDI):** Unit-Tests über die Migration (v1 → aktuell, kaputtes JSON,
fehlende Felder, fremde Version). In der App: bestehenden Fortschritt anlegen, Schlüssel im
Browser-Speicher verfälschen, neu laden → Standardwerte **und** sichtbarer Hinweis; die
verfälschten Rohdaten sind noch da.

---

## Auftrag 2 · Mehrfaches Level-Up innerhalb einer Einheit (B-15)

### Befund (gemessen)

[engine.ts:206](../../src/lib/engine.ts): `if (tempoRef.current === config.levelTempo)`.
`config.levelTempo` wird beim Start eingefroren
([Home.tsx:41–49](../../src/sections/Home.tsx), `SessionConfig`), `tempoRef` steigt nach
jeder bestandenen Serie um `TEMPO_STEP` ([engine.ts:213](../../src/lib/engine.ts)). Ab der
**zweiten** Serie derselben Einheit ist die Bedingung dauerhaft falsch: Der Nutzer landet
im Zweig „freies Tempo · Fortschritt zählt auf Level X" und muss die Einheit verlassen und
neu starten, um weiterzukommen. Das ist der gefühlte Stillstand im Fortschritt.

Derselbe Vergleich speist den Setup-Hinweis
([Home.tsx:188](../../src/sections/Home.tsx)): Er erscheint heute auch dann, wenn der
Nutzer den Regler gar nicht angefasst hat – sobald das Level-Tempo von der Voreinstellung
abweicht.

### Umbau

Das Level-Tempo wird **mitgeführt**: ein Ref, der beim Start aus `config.levelTempo`
gesetzt und nach jedem Bestehen auf `res.newTempo` fortgeschrieben wird. Verglichen wird
`tempoRef.current === levelRef.current`. „Freies Tempo" ist danach das, was es sein soll:
der Nutzer hat den Regler bewusst vom Level-Tempo weg bewegt.

### Akzeptanzkriterien (B-15)

1. Das aktuelle Level-Tempo wird während der Einheit mitgeführt und nach jedem Bestehen
   aktualisiert.
2. Zehn Serien hintereinander heben das Tempo zehnmal (bis `TARGET_TEMPO`), ohne die
   Einheit zu verlassen.
3. Der Hinweis „freies Tempo" erscheint nur, wenn der Nutzer den Regler tatsächlich vom
   Level-Tempo weg bewegt hat.

**Prüfweg (ohne MIDI):** Demo-Modus, Übung 1 in C-Dur, Toleranz ±50 ms: mehrere Serien à
`PASS_STREAK` hintereinander spielen; das Tempo steigt je Serie um `TEMPO_STEP`, der Banner
nennt jedes Mal den neuen Wert, und der gespeicherte Fortschritt zeigt denselben Stand.
Ergänzend ein Unit-Test über `passTempo()` in Folge (bis `TARGET_TEMPO`, dann `done`).

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien beider Aufträge einzeln nachweisbar
- [ ] Keine `any`, keine leeren `catch`-Blöcke ohne Begründungskommentar
- [ ] **Zwei Commits:** „B-17: Eine Persistenzschicht mit Schema-Version (R24, R25)" und
      „B-15: Level-Tempo läuft in der Einheit mit (R10)"

---

## Abgrenzung

- **B-30 ❓ (IndexedDB statt localStorage)** wird hier *nicht* entschieden. Dieses Paket
  macht die Entscheidung billig: Nach B-17 gibt es genau eine Datei, die den Speicher
  kennt. Die Backlog-Empfehlung bleibt (b) – `localStorage` behalten, Konzept §6 nach
  Regelwerk §7 nachziehen.
- Der Fortschritt für Akkordfolgen und Modus C kommt in Paket 3 (**B-16**). Die
  Schema-Version aus diesem Paket ist die Voraussetzung dafür: B-16 erweitert den
  Datensatz und braucht den Migrationspfad.
- **B-24/B-25** (P4) ändern das Statistik-Schema erneut (Griff- und Timing-Fehler
  getrennt, finger-aufgelöst). Hier wird nur die Version eingeführt, nicht deren Inhalt
  vorweggenommen.
