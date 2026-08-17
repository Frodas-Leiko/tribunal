# Paket 1 · Anker-Oktave: die Lage wird berechenbar

**Items:** B-07 · **Regeln:** R12, R13, §5.4
**Dateien:** `src/lib/staff.ts`, `src/lib/music.ts`, neu `src/lib/staff.test.ts`
**Voraussetzung:** P0 abgeschlossen · **Nachfolger:** Paket 2

---

## Ziel

Eine Tonart wird zu **einer** Handlage: alle sieben Stufen werden von der Tonika in der
Anker-Oktave **aufwärts** gebaut (R12.3). Damit stimmt zum ersten Mal, was die eigenen
Steckbrief-Texte behaupten – „beim Wechsel I→IV wandert die ganze Mulde eine Stufe nach
oben".

Dieses Paket fasst **keine UI, keine Timer und keinen Zustand** an. Es ändert eine reine
Rechenfunktion und sichert sie mit Tests ab. Alle Aufrufer übergeben weiterhin die
Standard-Lage; die Auswahl folgt in Paket 2.

---

## Befund (gemessen)

`spellTriad()` in [staff.ts:31](../../src/lib/staff.ts) sucht den Grundton „innerhalb
±6 Halbtöne um C4" und setzt C zusätzlich hart auf C4:

```ts
const targetRoot = 60 + octaveShift * 12;
let rootMidi = chord.pcs[0];
while (rootMidi < targetRoot - 6) rootMidi += 12;
while (rootMidi > targetRoot + 6) rootMidi -= 12;
if (chord.pcs[0] === 0) rootMidi = targetRoot;
```

Das ergibt in **C-Dur**:

| Stufe | I | ii | iii | IV | **V** | vi | vii° |
|---|---|---|---|---|---|---|---|
| Grundton MIDI | 60 | 62 | 64 | 65 | **55** | 57 | 59 |
| Schritt zum Vorgänger | – | +2 | +2 | +1 | **−10** | +2 | +2 |

Von IV nach V springt die Hand eine große Septime **abwärts**. Das widerspricht R12.3 und
Konzept §3 („Akkorde als feste Hand-Geometrie speichern"). Drei der sieben Stufen liegen
außerdem unterhalb MIDI 60 und fallen damit aus der Topographie-Karte (B-11).

---

## Umbau

### Konstruktionsregel (R12.1–R12.3)

```
tonicMidi = anker + key.tonic                          // Anker = das C der Lage: C3=48, C4=60, C5=72
rootMidi  = tonicMidi + ((pcs[0] − key.tonic + 12) % 12) + oktavversatz · 12
midi[i]   = rootMidi  + ((pcs[i] − pcs[0]    + 12) % 12)
```

Der Modulo nach oben ist die ganze Regel: Der größte mögliche Grundton-Abstand innerhalb
einer Tonart ist damit **11 Halbtöne** – die große Septime aufwärts (R12.3), nie mehr, nie
ein Sprung nach unten. `octaveShift` verschiebt den fertigen Block als Ganzes (R12.4); die
Terzschichtung bleibt identisch.

Die Sonderbehandlung für C entfällt ersatzlos: Sie war ein Pflaster gegen genau dieses
Fenster.

### Buchstabierung bleibt unverändert – die Oktave wird exakt gerechnet

Die Buchstabenwahl (Stufenindex in der Skala → Buchstabe, dann Terzschichtung
`L, L+2, L+4`) ist korrekt und wird nicht angefasst. Geändert wird nur die Herleitung der
Oktave: heute `Math.floor(rootMidi / 12) − 1`, künftig aus Buchstabe und Vorzeichen:

```
oct = (midi − acc − NATURAL_PC[L]) / 12 − 1
```

Die Division geht immer auf (`midi ≡ pcs[i]`, `acc ≡ pcs[i] − NATURAL_PC[L]`, beide mod 12).
Der Unterschied wird an Ces oder His sichtbar: dort liegt die Buchstaben-Oktave neben der
MIDI-Oktave, und `diatonic` – die Grundlage jeder y-Position im Notensystem – wäre um eine
Zeile falsch. Im heutigen Bestand tritt der Fall nicht auf; die Formel kostet nichts und
nimmt ihn vorweg.

### API

```ts
spellTriad(chord, key, octaveShift = 0, anchor = ANCHOR_DEFAULT): SpelledNote[]
```

Neu in `staff.ts`, weil die Lage eine Eigenschaft des Notensystems ist:
`ANCHORS = [48, 60, 72]`, `ANCHOR_DEFAULT = 60`, `anchorLabel(48) === 'C3'`.
Der vierte Parameter ist optional – die vier Aufrufstellen in `engine.ts` bleiben in diesem
Paket unverändert und rechnen weiter mit `C4`.

### Entscheidung: `chordMidi()` entfällt

[music.ts:126](../../src/lib/music.ts) enthält mit `chordMidi()` eine **zweite** Lagen-Logik
(„nächstliegende Lage ab C4"), die von keiner Stelle im Projekt aufgerufen wird. Sie bleibt
nach diesem Umbau als Falle stehen: die einzige Funktion, die R12 widerspricht. Sie wird
gelöscht, nicht nachgezogen – R12.1 lässt genau eine Lagen-Regel zu.

---

## Akzeptanzkriterien (B-07)

1. Alle Stufen einer Tonart werden **aufwärts** von der Anker-Tonika gebaut; der größte
   Grundton-Abstand innerhalb einer Tonart ist die große Septime aufwärts.
2. In C-Dur mit Anker `C4` gilt: I=60, ii=62, iii=64, IV=65, V=67, vi=69, vii°=71.
3. Die Buchstabierung (`♯`/`♭`, Notenkopf-Positionen) bleibt für alle 10 Tonarten korrekt.
4. Regressionstest über alle 10 Tonarten × 7 Stufen × 3 Lagen: kein Grundton außerhalb des
   erlaubten Fensters, keine falsche Vorzeichenwahl.
5. Es existiert genau eine Lagen-Logik im Projekt.

**Prüfweg (ohne MIDI, §5.3):** `npm test` – der Testfall aus AK 2 nennt die sieben
Grundtöne einzeln; AK 1/3/4 laufen als Schleife über 10 × 7 × 3 Fälle.

### Testabdeckung (`src/lib/staff.test.ts`, B-28 AK 2)

| Test | prüft |
|---|---|
| Grundtöne C-Dur | AK 2, Zahl für Zahl |
| Fenster 0…11 Halbtöne über der Anker-Tonika | AK 1 |
| Terzschichtung: `midi` streng steigend, `diatonic` je +2 | R12, Notenkopf-Abstände |
| `12·(oct+1) + NATURAL_PC[L] + acc === midi`, `|acc| ≤ 1` | AK 3 (Vorzeichen und Oktave konsistent) |
| Namentliche Fälle: B-Dur I = B–D–F, h-Moll V = Fis–Ais–Cis, a-Moll V = E–Gis–H | AK 3 |
| Lage C3/C5 verschiebt jeden Ton um exakt ∓12 / ±12 | R12.2 |
| `octaveShift ±1` verschiebt um ±12 bzw. `diatonic` um ±7 | R12.4 |

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle fünf Akzeptanzkriterien einzeln nachweisbar
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Ein Commit:** „B-07: Anker-Oktave – Stufen werden aufwärts gebaut (R12)"

---

## Abgrenzung

**Nicht anfassen** – gehört in spätere Pakete oder Prioritäten:

- Lage-Auswahl im Setup, `SessionConfig`, Steckbrief → **B-08**, Paket 2
- Register-Prüfung in `engine.ts` (Mittelwert-Vergleich) → **B-12**, Paket 2
- Zonen-Geometrie, Zonen-Beschriftung, Topographie-Karte → **B-09/B-10/B-11**, Paket 3
- Moll-Vokabular: `VII` ist heute der Leittondreiklang, nicht der Dur-Dreiklang →
  **B-19** (P3). `spellTriad` behält dafür seinen Rückfall auf den Tonika-Buchstaben,
  wenn eine Stufe nicht in der Skala liegt; der laute Fehler dazu ist **B-21** (P3).

**Bekannt und nach diesem Paket weiterhin offen:** In Übung 2 liegt der nach unten
verschobene Block in tiefen Tonarten außerhalb der Zeichenfläche (gemessen: C-Dur I mit
`shift −1` → y = 253 bei `viewBox`-Höhe 240). Das ist B-09 und wird in Paket 3 behoben.
