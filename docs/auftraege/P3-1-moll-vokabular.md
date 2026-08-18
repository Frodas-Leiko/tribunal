# Paket 1 · Das Moll-Vokabular und der laute Fehler

**Items:** B-19 · B-21 · **Regeln:** R15, R16, R9
**Dateien:** `src/lib/music.ts`, `src/lib/staff.ts`, `src/lib/engine.ts`,
`src/lib/music.test.ts`, `src/lib/staff.test.ts`
**Voraussetzung:** P2 abgeschlossen · **Nachfolger:** Paket 2 (B-20 ist durch B-19 blockiert)

---

## Ziel

Eine Stufenbezeichnung wird zu genau einem Akkord – oder zu einem sichtbaren Fehler.
Beides ist heute nicht gegeben: Moll kennt zu wenige Stufen, und was es nicht kennt,
verschwindet stillschweigend.

Dieses Paket fasst **keine UI an**. Es ist reine Rechenlogik und liegt damit konfliktfrei
vor den 32 Folgen (Paket 2), die auf diesem Vokabular aufsetzen.

---

## Auftrag 1 · Moll-Stufenvokabular vervollständigen (B-19)

### Befund (gemessen)

[music.ts:111–115](../../src/lib/music.ts) erhöht in Moll die 7. Stufe
(`sc[6] = (sc[6] + 1) % 12`) und beschriftet den daraus entstehenden **verminderten**
Dreiklang mit `ROMAN_MINOR[6] = 'VII'` ([music.ts:103](../../src/lib/music.ts)).

In a-Moll (Tonika `9`) ergibt das:

| Stufe laut Code | Grundton | Töne | Anzeige |
|---|---|---|---|
| `VII` | `8` | 8 · 11 · 2 | **As°** |

Gemeint ist nach R15 der **Dur-Dreiklang auf der kleinen Septime**: G-Dur (7 · 11 · 2).
Der Leittondreiklang heißt `vii°` und ist **Gis°**, nicht `As°` – die Buchstabierung ist
ebenfalls falsch (R9). Damit klingt die im Konzept prominenteste Moll-Folge falsch:
`mollwendung` steht in [music.ts:178](../../src/lib/music.ts) auf `i – VII – VI – V` und
spielt heute a-Moll → **As°** → F-Dur → E-Dur.

Es fehlen außerdem die natürliche Moll-Dominante `v` (in a-Moll: e-Moll) und der
Leittondreiklang `vii°` als eigener, zusätzlich verfügbarer Eintrag.

Ein zweiter Befund liegt in [staff.ts:46–49](../../src/lib/staff.ts): `spellTriad()` sucht
den Buchstaben über `scale.indexOf(chord.pcs[0])` und fällt bei `-1` per `Math.max(deg, 0)`
stumm auf den Tonika-Buchstaben zurück. Für jeden Akkord, dessen Grundton nicht in der
verwendeten Skalenvariante liegt – künftig `VII` und `v` –, erzeugt das ein falsches
Vorzeichen, ohne dass etwas darauf hinweist.

### Umbau

**Zwei Vorräte, eine Auflösung.**

1. `diatonicChords(key)` bleibt der **skalengeordnete Siebener** und bleibt damit die
   Grundlage der Stufen-Modi A/B/C. In Moll ist die Voreinstellung weiterhin harmonisch:
   `i ii° III iv V VI vii°`. Klanglich ändert sich dort **nichts** – nur die Beschriftung
   der 7. Stufe (`VII` → `vii°`) und deren Buchstabierung werden richtig.
2. Neu `chordForDegree(key, degree): ChordDef | null` löst das **vollständige** Vokabular
   nach R15 auf:
   - Dur: `I ii iii IV V vi vii°`
   - Moll natürlich: `i ii° III iv v VI VII`
   - Moll harmonisch zusätzlich: `V`, `vii°`

   `v` und `VII` sind damit verfügbar, ohne in der Sequenz der Stufen-Modi aufzutauchen.
   *Begründung:* Modus A ist die auf- und absteigende Skalenfolge
   ([engine.ts:196](../../src/lib/engine.ts): `[0,1,2,3,4,5,6,5,4,3,2,1]`) und braucht genau
   einen Akkord je Skalenstufe. Zwei Varianten auf derselben Stufe hätten dort keine
   definierte Reihenfolge. Wer das anders will, ändert die Regel, nicht diesen Commit.
3. **Akkordfolgen lösen über `chordForDegree()` auf**, nicht mehr über eine Suche in
   `diatonicChords()`. Damit erreichen sie beide Vorräte – das ist die eigentliche
   Freischaltung für B-20.
4. **Buchstabierung ohne Raten.** `ChordDef` trägt zusätzlich `step` (Skalenstufe 0–6).
   `spellTriad()` nimmt den Buchstaben aus `step` statt aus `indexOf`; der stumme
   `Math.max(deg, 0)`-Rückfall entfällt (§5.5 – toter, falscher Code).

### Akzeptanzkriterien (B-19)

1. Moll stellt beide Vorräte bereit: natürlich (`i ii° III iv v VI VII`) und harmonisch
   (`V`, `vii°`).
2. `VII` ist in Moll **immer** der Dur-Dreiklang auf der kleinen Septime; der
   Leittondreiklang heißt `vii°`.
3. `mollwendung` klingt in a-Moll als a-Moll → **G-Dur** → F-Dur → E-Dur.
4. Buchstabierung und Vorzeichen stimmen für beide Vorräte in allen 5 Moll-Tonarten
   (in a-Moll: `vii°` = **Gis°**, nicht `As°`).
5. Unit-Test über alle Moll-Tonarten × alle Stufenbezeichner.

**Prüfweg (ohne MIDI):** Der Test aus AK 5 deckt AK 1, 2 und 4 ab – je Moll-Tonart alle
neun Bezeichner, verglichen gegen Grundton, Akkordqualität und Buchstaben. AK 3 zusätzlich
in der App: Einheit „Moll-Wendung" in a-Moll starten, die vier Ziel-Akkorde im Cockpit
ablesen (`a-Moll → G-Dur → F-Dur → E-Dur`).

---

## Auftrag 2 · Unbekannte Stufen laut scheitern lassen (B-21)

### Befund (gemessen)

[engine.ts:565–566](../../src/lib/engine.ts):

```ts
const degrees = prog ? prog.degrees[key.mode] : [];
chordsRef.current = degrees.map((d) => all.find((c) => c.degree === d)).filter((c): c is ChordDef => !!c);
```

`filter` verwirft jede nicht auflösbare Stufe **still**. Eine achtgliedrige Folge wird
klanglos zur sechsgliedrigen; der Nutzer übt etwas anderes als das, was im Steckbrief
steht, und nichts weist darauf hin. Mit 32 Folgen (Paket 2) ist das eine tickende Bombe:
Genau die mit **R15** markierten Folgen des Datensatzes sind ohne B-19 nicht auflösbar.

### Umbau

`resolveProgression(key, prog)` liefert entweder die **vollständige** Akkordkette oder die
Liste der nicht auflösbaren Stufen – nie eine gekürzte Kette.

- **In der Entwicklung** ist eine nicht auflösbare Stufe ein `console.error` mit Folge-`id`,
  Tonart und Stufe (R16: „laut").
- **In der Auswahl** ist die betroffene Folge als *nicht verfügbar* markiert und nicht
  startbar. Das ist keine Sperre im Sinne von R11, sondern eine Unmöglichkeit: Der Akkord
  existiert in dieser Tonart nicht.
- Kein `filter(Boolean)` auf Stufenauflösungen – weder hier noch anderswo.

Abzugrenzen von Paket 2: Eine Folge, die in einem Tongeschlecht **bewusst** nicht angeboten
wird (`degrees.dur === null`, z. B. `mollwendung`), ist kein Fehler, sondern eine
Eigenschaft des Datensatzes. Diesen zweiten Grund für „nicht verfügbar" bringt B-20 mit.

### Akzeptanzkriterien (B-21)

1. Eine nicht auflösbare Stufe erzeugt einen sichtbaren Fehler in der Entwicklung und
   markiert die Folge in der Auswahl als nicht verfügbar.
2. Kein `filter(Boolean)` auf Stufenauflösungen.
3. Test: Eine künstlich fehlerhafte Folge wird erkannt, nicht gekürzt.

**Prüfweg (ohne MIDI):** Unit-Test mit einer Folge, die eine in Dur unauflösbare Stufe
enthält (etwa `VII` in C-Dur) – erwartet wird die Fehlerliste, nicht eine Kette der Länge
n−1. In der App zusätzlich mit einem vorübergehend verfälschten Datensatz: Die Folge ist in
der Auswahl als nicht verfügbar markiert, die Konsole nennt Folge, Tonart und Stufe; danach
zurücksetzen. AK 2 per `grep` über `src`.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien beider Aufträge einzeln nachweisbar
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Zwei Commits:** „B-19: Moll-Vokabular vollständig, VII ist der Dur-Dreiklang (R15)"
      und „B-21: Unbekannte Stufe scheitert laut (R16)"

---

## Abgrenzung

- **Die 32 Folgen sind Paket 2.** Hier ändert sich am Bestand nur, was B-19 zwingend
  verlangt: `mollwendung` klingt in Moll richtig. Die falsche Dur-Variante derselben Folge
  und die überzählige Moll-Variante von `kanon` korrigiert B-20 zusammen mit dem
  Datensatz.
- **Die Auswahl-UI ist Paket 3.** Die Markierung „nicht verfügbar" bekommt hier die
  schlichteste Form, die AK 1 erfüllt; Gruppierung und Filter kommen mit B-22.
- **Nebenwirkung, bewusst in Kauf genommen:** Die Fehler-Heatmap schlüsselt nach
  Akkord*namen* auf ([store.ts](../../src/lib/store.ts), Schlüssel `${keyId}|${chordName}`).
  Mit der korrigierten Buchstabierung zählt `Gis°` künftig getrennt von der bisher
  gespeicherten Zeile `As°`. Kein Schema-Bruch, keine Migration – die alte Zeile bleibt
  sichtbar, bis sie zurückgesetzt wird. Die finger-aufgelöste Historie nach R27 ist
  ohnehin **B-25** (P4).
- **Septakkorde, Zwischendominanten, Umkehrungen** bleiben draußen (Set B in
  `docs/Akkordfolgen.md`, Entscheidung offen ❓ nach Regelwerk §7).
