# Paket 3 · Fortschritt für Akkordfolgen und Modus C

**Items:** B-16 · **Regeln:** R10, R11, R25, R5
**Dateien:** `src/lib/store.ts`, `src/sections/Home.tsx`, `src/lib/engine.ts`
**Voraussetzung:** Paket 2 (Schema-Version und Migration) · **Nachfolger:** – (P2 abgeschlossen)

---

## Ziel

Jede spielbare Einheit hat einen messbaren Stand. Heute gilt das nur für Stufen-Einheiten
in Modus A und B.

---

## Befund (gemessen)

- **Akkordfolgen zählen gar nicht.** In [engine.ts:205](../../src/lib/engine.ts) greift der
  Fortschritts-Zweig nur bei `config.source === 'stufen'`. Für `'progression'` bleibt der
  generische Banner „Serie geschafft – 8 in Folge" – kein Tempo-Level, kein Bestehen.
  Mit 32 Folgen (B-20) wird das der größte blinde Fleck der App.
- **Modus C zählt nie** (`config.mode !== 'C'`) und bekommt trotzdem in
  [Home.tsx:41–49](../../src/sections/Home.tsx) ein `levelTempo` von hart 60 – die UI zeigt
  also einen Level-Wert, der nirgends herkommt und nirgends hingeht. Das ist genau das
  „beides gleichzeitig", das AK 3 verbietet.
- Der Datensatz kennt nur Tonarten: `ProgressMap = Record<string, KeyProgress>` mit
  `tempoA/tempoB/doneA/doneB` ([store.ts:5–12](../../src/lib/store.ts)). `passTempo()`
  nimmt entsprechend nur `'A' | 'B'` ([store.ts:61](../../src/lib/store.ts)).

---

## Umbau

### Datensatz

Ein Stand je bespielbarer Einheit, statt vier Feldern je Tonart:

```
Stand := { tempo: number; done: boolean }

Fortschritt := {
  version: 2,
  stufen:  Record<`${keyId}|${A|B|C}`,   Stand>,
  folgen:  Record<`${keyId}|${progId}`,  Stand>,
}
```

Die Migration aus Version 1 ist verlustfrei: `tempoA/doneA` → `…|A`, `tempoB/doneB` →
`…|B`. Sie läuft über den Pfad aus B-17; ohne den ist dieses Item nicht abnahmefähig.

`passTempo()` bekommt statt `mode: 'A' | 'B'` einen Einheiten-Schlüssel. Die
Rampen-Logik (`TEMPO_STEP` bis `TARGET_TEMPO`, dann `done`) bleibt unverändert – sie ist
für Folgen dieselbe.

### Modus C

Modus C bekommt einen **eigenen Stand** (`…|C`) und damit ein echtes Level-Tempo aus dem
Speicher (AK 4). Das ist die einfachere der beiden von AK 3 erlaubten Antworten und die
konzepttreue: R11 sagt, Fortschritt informiert – er sperrt nicht, aber er misst. Ein Modus,
der nach acht fehlerfreien Wiederholungen nichts festhält, misst nicht (R10).

Der Sonderfall `config.mode !== 'C'` in `registerSuccess()` entfällt damit ersatzlos.

### Anzeige

- Die Folgen-Auswahl zeigt je Folge den Stand in der **aktiven Tonart** (Tempo-Level bzw.
  ✓), in derselben nüchternen Form wie die Tonart-Karten heute (`A 68` / `B ✓`). Keine
  Feier, keine Abzeichen (R5).
- Der Stufenplan zeigt zusätzlich zu A und B den Stand von C.
- `levelTempo` im Setup kommt für alle drei Quellen aus dem Speicher; die
  60er-Konstante entfällt.

---

## Akzeptanzkriterien (B-16)

1. Fortschritt wird je `(Tonart, Folge)` bzw. `(Tonart, Modus)` gespeichert: Tempo-Level
   und Bestanden-Flag.
2. Die Folgen-Auswahl zeigt je Folge den Stand in der aktiven Tonart.
3. Modus C zählt entweder auf einen eigenen Wert oder sagt in der UI klar, dass er nicht
   wertet – aber nicht beides gleichzeitig. **Gewählt: eigener Wert.**
4. `levelTempo` für Modus C stammt aus dem gespeicherten Stand, nicht aus einer Konstanten.

**Prüfweg (ohne MIDI):**

- Unit-Tests: Migration v1 → v2 für alle vier Felder; `passTempo()` über einen
  Folgen-Schlüssel bis `TARGET_TEMPO`; Stände verschiedener Tonarten und Folgen bleiben
  getrennt.
- Demo-Modus: Einheit „Vollkadenz" in C-Dur, eine Serie à `PASS_STREAK` → Tempo-Level
  steigt und steht nach dem Verlassen in der Folgen-Auswahl. Dieselbe Folge in G-Dur zeigt
  weiterhin den Startwert.
- Modus C in C-Dur: eine Serie → eigener Stand steigt; Modus A bleibt davon unberührt.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle vier Akzeptanzkriterien einzeln nachweisbar
- [ ] Bestehender Fortschritt aus Version 1 ist nach der Migration unverändert sichtbar
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Ein Commit:** „B-16: Fortschritt für Akkordfolgen und Modus C (R10, R11)"

---

## Abgrenzung

- Die **Auswahl-UI für 32 Folgen** (Gruppierung, Filter, Steckbrief-Symbol) ist **B-22**
  (P3). Hier bekommt die bestehende Chip-Reihe nur die Standanzeige – sie bleibt sonst,
  wie sie ist.
- Die **32 Folgen selbst** (B-20) und das **Moll-Vokabular** (B-19) sind P3. Dieses Paket
  arbeitet mit den heutigen sechs Folgen; der Schlüssel `(Tonart, Folge)` trägt die
  späteren 32 ohne Änderung.
- Eigene Folgen (**B-32 ❓**) zählen laut Skizze nicht auf den offiziellen Fortschritt –
  hier nicht vorwegnehmen.
