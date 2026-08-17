# Paket 2 · Die Lage wird wählbar und geprüft

**Items:** B-08 · B-12 · **Regeln:** R12, R13, R6
**Dateien:** `src/sections/Home.tsx`, `src/lib/engine.ts`, `src/sections/Session.tsx`,
`src/components/Steckbrief.tsx`, `src/lib/music.ts` (nur `TIMING_BRIEFS`)
**Voraussetzung:** Paket 1 · **Nachfolger:** Paket 3

---

## Ziel

Die Hand sucht nicht mehr die App, sondern die App folgt der Hand: Die Anker-Oktave aus
Paket 1 wird im Setup gewählt, läuft durch die ganze Einheit und ist die Referenz der
Register-Prüfung in Übung 2.

Beide Items gehören zusammen, weil B-12 erst mit einer stabilen Ziel-Lage überhaupt
beurteilbar ist: Die heutige Prüfung schlägt auf einer wandernden Lage zwangsläufig falsch
an (B-12 Befund).

---

## Auftrag 1 · Lagen-Wahl im Setup (B-08)

### Umbau

`SessionConfig` bekommt `anchor: number` (MIDI des C in der gewählten Lage, Standard
`ANCHOR_DEFAULT` = 60). Der Wert wird gereicht wie `tolerance` heute schon: Setup → `App`
→ `Session` → `useSession` → die vier `spellTriad()`-Aufrufe in `engine.ts`
([275](../../src/lib/engine.ts), [392](../../src/lib/engine.ts),
[455](../../src/lib/engine.ts), [556](../../src/lib/engine.ts)).

Die Setup-Zeile „Lage" steht neben „Toleranz" – gleiche Optik wie die übrigen
`setup-row`-Zeilen, Werte aus `ANCHORS`, beschriftet über `anchorLabel()`. Kein neues
Bedienmuster (R6: Touch nur im Setup).

Der Steckbrief nennt Lage **und** den daraus folgenden Grundton der Tonika – die Zahl, die
der Nutzer tatsächlich greift (`anchorLabel(anchor)` + `midiName(anchor + key.tonic)`,
z. B. „Lage C4 · Tonika B4"). `KeyBrief` bekommt dafür die Lage als Prop.

### Akzeptanzkriterien (B-08)

1. Setup-Zeile „Lage" mit mindestens `C3 · C4 · C5`, Standard `C4`.
2. Die Wahl ist Teil von `SessionConfig` und wirkt auf Notensystem, Topographie und
   Register-Prüfung gleichermaßen.
3. Der Tonart-Steckbrief nennt die gewählte Lage und den daraus folgenden Grundton der Tonika.
4. Übung 2 verschiebt von dieser Lage aus um genau ±1 Oktave.

**Prüfweg (ohne MIDI):** Demo-Modus, Übung 1 in C-Dur je einmal mit `C3`, `C4`, `C5`
starten; die Topographie-Karte markiert den Grundton in der jeweiligen Lage. Für AK 4:
Übung 2 in C-Dur mit Lage `C4` – Zenit-Block liegt eine Oktave über dem Zentrum-Block.

---

## Auftrag 2 · Register-Prüfung auf die Anker-Oktave beziehen (B-12)

### Befund

Zwei Stellen vergleichen den **Mittelwert** der gespielten MIDI-Noten mit dem Mittelwert des
Zielakkords und schlagen ab 6 Halbtönen Differenz an:
[engine.ts:292](../../src/lib/engine.ts) (laufende Auswertung) und
[engine.ts:456](../../src/lib/engine.ts) (Wiedereinstieg).

Der Mittelwert ist die falsche Größe: Er hängt von der Akkordart ab (Dur-, Moll-,
verminderter Dreiklang haben verschiedene Spannen) und mischt drei Töne zu einer Zahl, aus
der sich keine ausführbare Anweisung ableiten lässt (R2).

### Umbau

Verglichen wird der **Grundton**: der gespielte Ton mit `midi % 12 === chord.pcs[0]` gegen
`spelled[0].midi`. Werden mehrere Oktaven des Grundtons gegriffen, zählt der nächstliegende.
Bis ±5 Halbtöne gilt die Zone als richtig, ab ±6 als Oktavfehler mit Richtung
(R13: Übung 2 prüft das Register gegen die Anker-Oktave, nicht gegen einen Mittelwert).

Die Prüfung läuft weiterhin nur in Übung 2 und nur, wenn die Tonhöhenklassen bereits
stimmen. Übung 1 prüft ausdrücklich keine Oktave (R13) – dieser Satz gehört sichtbar in
`TIMING_BRIEFS.uebung1`, sonst ist er nur im Code dokumentiert.

### Akzeptanzkriterien (B-12)

1. Die Prüfung vergleicht die Oktavlage des **Grundtons** gegen die Ziel-Oktave, nicht
   Mittelwerte.
2. Toleranz: bis ±5 Halbtöne gilt als richtige Zone, ab ±6 als Oktavfehler mit
   Richtungsangabe.
3. Übung 1 prüft ausdrücklich keine Oktave; das steht im Timing-Steckbrief.

**Prüfweg (ohne MIDI):** Demo-Modus, Übung 2: den geforderten Block eine Oktave zu tief
greifen → „Hand: eine Oktave höher"; denselben Block korrekt greifen → kein Oktavfehler,
in jeder der drei Lagen.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien beider Aufträge einzeln nachweisbar
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Zwei Commits:** „B-08: Lage im Setup wählbar (R12)" und
      „B-12: Register-Prüfung gegen die Anker-Oktave (R13)"

---

## Abgrenzung

- Zonen-Geometrie, Zonen-Beschriftung, Topographie-Bereich → Paket 3. Die Karte zeigt nach
  diesem Paket in Lage `C5` noch keinen Marker (fester Bereich C4–C6); das ist **B-11**.
- Die Lage wird **nicht** persistiert. Fortschritt je Lage wäre eine eigene Entscheidung
  und berührt R10 („ein Ziel pro Einheit") – nicht Teil von P1.
- Lage `C3` erzeugt in Übung 2 mit Nadir-Versatz vier und mehr Hilfslinien unter dem System.
  Das ist die offene Entscheidung **B-13 ❓** (Bassschlüssel) und wird hier weder
  vorweggenommen noch durch eine Sperre der Lage `C3` umgangen.
