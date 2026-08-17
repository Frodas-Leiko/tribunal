# Paket 3 · Zonen und Landkarte zeigen die Wahrheit

**Items:** B-09 · B-10 · B-11 · **Regeln:** R13, R4, R1, Konzept §4.3
**Dateien:** `src/components/Visuals.tsx`, `src/lib/staff.ts`, `src/lib/engine.ts`
**Voraussetzung:** Paket 1 und 2 · **Nachfolger:** – (P1 abgeschlossen bis auf B-13 ❓)

---

## Ziel

Was die App zeichnet, stimmt mit dem überein, was sie verlangt: Der Block ist in jeder Zone
sichtbar, die leuchtende Zone heißt auch so, und die Landkarte zeigt die Griffmulde statt
eines Punktes am Rand.

Die drei Items teilen sich die Darstellungsschicht und zwei davon dieselbe Datei. Getrennt
gebaut würde `Staff` dreimal umgeschrieben.

---

## Auftrag 1 · Zonen-Geometrie (B-09)

### Befund (gemessen)

`Staff` in [Visuals.tsx:23](../../src/components/Visuals.tsx) rechnet mit festen Zahlen:
`viewBox` `0 0 640 240`, `topLineY = 100`, `lineGap = 18`. Die Zonenrechtecke stehen
dadurch fest im Bild, die Notenköpfe folgen aber `diatonic`:

| C-Dur, `shift −1` | Grundton C3 | Terz E3 | Quinte G3 |
|---|---|---|---|
| `diatonic` | 21 | 23 | 25 |
| y | **253** | 235 | 217 |

Das Nadir-Rechteck reicht von y = 181 bis y = 253 – bei einer Zeichenfläche von 240. Der
Grundton liegt 13 px **unterhalb** des SVG, seine Hilfslinien ebenfalls. Mit der wählbaren
Lage (B-08) wandert der ganze Bereich zusätzlich um ±7 `diatonic`-Stufen je Oktave.

### Umbau

Die vertikale Ausdehnung wird **gerechnet, nicht gesetzt**: Aus Tonart und Lage steht der
`diatonic`-Rahmen der Einheit fest (`unitFrame`: Tonika bis Quinte der höchsten Stufe),
daraus folgen `viewBox`-Höhe und die Position der Systemlinien. Die Zonenbänder folgen dem
aktuellen Block, um je eine Oktave versetzt.

**Der Rahmen hängt an der Einheit, nicht am Akkord.** Sonst verschiebt jeder Stufenwechsel
die ganze Zeichenfläche, und es wandern die *Systemlinien* statt der Notenköpfe – beim
Nachmessen aufgefallen und behoben, bevor es committet wurde.

### Akzeptanzkriterien (B-09)

1. Alle drei Zonen (Zenit / Zentrum / Nadir) liegen inklusive Hilfslinien vollständig in
   der Zeichenfläche.
2. Der Block ist in jeder Zone vollständig sichtbar, in jeder der 10 Tonarten.
3. Nachweis: **gemessene Koordinaten** je Zone in C-Dur und in B-Dur.
4. Systemlinien und Zeichenflächenhöhe ändern sich innerhalb einer Einheit nicht.

Zusätzlich, weil B-08 es einführt: Punkt 1 und 2 gelten für alle drei Lagen.

**Zum Nachweisweg (Regelwerk §5.3):** Das Backlog verlangt für AK 3 Screenshots. In der
Entwicklungsumgebung lässt sich kein Bild aufnehmen (der Browser-Bereich rendert keine
Frames). An ihre Stelle treten die tatsächlichen SVG-Koordinaten, aus zwei Quellen:

- **Unit-Tests** über 10 Tonarten × 3 Lagen × 7 Stufen × 3 Zonen: jede Notenposition, jedes
  Zonenband, jede Hilfslinie und jede Systemlinie liegt in der Zeichenfläche, und jeder
  Block liegt in seinem eigenen Band. Das ist vollständiger als zwei Screenshots.
- **Messung in der laufenden App**: `viewBox`, Bandgrenzen, Notenkopf- und Linien-y-Werte
  werden aus dem gerenderten SVG gelesen. Sie belegt, dass die Komponente diese Rechnung
  auch benutzt.

---

## Auftrag 2 · Zonen-Leuchten und Zonen-Beschriftung (B-10)

### Befund (gemessen)

[engine.ts:393](../../src/lib/engine.ts) leitet die Zone aus der **Terz** ab:
`zoneOf(spelled[1].diatonic)`. Für den Zenit-versetzten C-Dur-Block (C5–E5–G5) ist die Terz
E5 mit `diatonic` 37, `TOP_LINE` ist 38 → `zoneOf` liefert `zentrum`, während `zoneGlow`
gleichzeitig `zenit` leuchtet. Beschriftung und Leuchten widersprechen sich.

Die Zone ist keine Messung, sondern eine **Vorgabe**: Sie steht in derselben Zeile fest, in
der `shift` bestimmt wird ([engine.ts:373–375](../../src/lib/engine.ts)). Sie nachträglich
aus einem einzelnen Notenkopf zu raten, verletzt R4.

### Akzeptanzkriterien (B-10)

1. Die Zone eines Blocks wird aus der beabsichtigten Verschiebung abgeleitet, nicht
   nachträglich aus einem einzelnen Ton geraten.
2. Leuchtende Zielzone und Beschriftung stimmen in Übung 2 immer überein.
3. `zoneOf()` bleibt für die Darstellung einzelner Noten erhalten, steuert aber nicht mehr
   die Blockzuordnung.

---

## Auftrag 3 · Topographie-Karte (B-11)

### Befund (gemessen)

`Topography` in [Visuals.tsx:107](../../src/components/Visuals.tsx) zeigt zwei Oktaven ab
MIDI 60 und zeichnet den Marker nur für `markerX >= 0`. Mit der **alten** Lagen-Logik fielen
in C-Dur V, vi und vii° unter MIDI 60 und damit aus der Karte (markerX −120 / −67 / −13).
Nach B-07 liegen alle sieben Stufen in Lage `C4` im Bereich – in Lage `C5` (72…83) fällt
dafür der gesamte Vorrat heraus. Der feste Bereich ist das eigentliche Problem.

Zwei weitere Messungen an derselben Stelle:

- Markiert wird nur `spelled[0].midi` – der **Grundton**. Konzept §4.3 verlangt den
  Zielakkord in seiner Position *relativ zu den Inselgruppen*, also die ganze Mulde.
- `ridges[].group` (2er-/3er-Insel) wird berechnet und **nie gelesen**; gezeichnet wird
  stattdessen über `i % 5 === 0 || i % 5 === 2` eine Farbnuance auf je einer Rippe pro
  Gruppe. Die Inselgruppen sind damit nicht als Gruppen erkennbar – genau das ist aber der
  Zweck der Karte (R1: die Karte ersetzt die verbotene Klaviatur).

### Akzeptanzkriterien (B-11)

1. Der Kartenbereich folgt der gewählten Lage (B-08) und umfasst mindestens C2–C6; der
   Marker ist in jeder Tonart und auf jeder Stufe sichtbar.
2. Alle drei Töne der Griffmulde werden markiert, der Grundton hervorgehoben.
3. Die 2er- und 3er-Inseln sind als Gruppen erkennbar getrennt.
4. Nachweis: **gemessene Marker-Koordinaten** aller 7 Stufen in C-Dur und in einer
   Fis-lastigen Tonart – als Unit-Test über alle 10 Tonarten × 3 Lagen × 3 Zonen (kein
   Ton fällt aus dem Bereich) und als Messung am gerenderten SVG (Marker-x-Werte,
   Oktav-Beschriftung).

Der Bereich hängt an Tonart **und** Lage, nicht am aktuellen Akkord: eine Karte, die bei
jedem Akkordwechsel ihren Maßstab ändert, ist keine Landkarte. In Lage `C5` wird er dadurch
breit (bis C8) – das ist die Folge davon, dass Übung 2 auch von dort noch eine Oktave nach
oben springt. Ob die Lage `C5` diesen Sprung überhaupt anbieten soll, gehört zu **B-13 ❓**.

**R1 gilt unverändert:** Die Karte zeigt das Relief der schwarzen Inselgruppen, keine
Tastatur. Keine weißen Tasten, keine Tastenbeschriftung, keine Klaviatur-Silhouette.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien der drei Aufträge einzeln nachweisbar
- [ ] Gemessene Koordinaten aus B-09 AK 3 und B-11 AK 4 im Commit festgehalten
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Ein Commit** für die Darstellungsschicht (B-09 · B-10 · B-11).

**Warum ein Commit statt dreier:** Die drei Items teilen sich nicht nur eine Datei, sondern
dieselben Funktionen. B-10 nimmt `zoneOf()` die Blockzuordnung ab, die B-09 geometrisch
geraderückt; die Zonenbänder aus B-09 gibt es nur, weil die Zone aus der Verschiebung
kommt (B-10); und `Staff` wie `Topography` bekommen ihre Maße aus derselben neuen
Rechnung. Getrennte Commits ließen sich nur als nicht lauffähige Zwischenstände
konstruieren. Regelwerk §5.6 verlangt „ein Item = ein Commit-**Bereich**" und verbietet
Sammelcommits über Prioritätsstufen – beides ist eingehalten.

---

## Abgrenzung

- **B-13 ❓ (Bassschlüssel)** ist nicht Teil dieses Pakets. Solange die Entscheidung offen
  ist, bleibt der Violinschlüssel der einzige Schlüssel; B-09 sorgt dafür, dass auch tiefe
  Blöcke sichtbar sind – lesbar macht sie erst B-13.
- Notensystem in Übung 1 (**B-31 ❓**) bleibt unberührt: Übung 1 zeigt weiterhin kein
  Notensystem.
- Farbwerte in `COLORS` bleiben, wie sie sind (R8: eine neue Farbe braucht eine
  Regeländerung, keinen Commit).
