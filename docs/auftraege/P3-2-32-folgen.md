# Paket 2 · 32 Folgen als Daten

**Items:** B-20 · **Regeln:** R14, R16, R11
**Dateien:** `src/lib/music.ts`, `src/sections/Home.tsx`, `src/lib/engine.ts`,
`src/lib/music.test.ts` · **Datenquelle:** `docs/Akkordfolgen.md`
**Voraussetzung:** Paket 1 (B-19 gibt das Vokabular frei) · **Nachfolger:** Paket 3

---

## Ziel

Der Bestand aus `docs/Akkordfolgen.md` steht 1:1 im Code. R14: Eine Folge ist ein
Datensatz, sonst nichts – kein `if` auf einen Namen, keine Sonderbehandlung.

---

## Befund (gemessen)

- Heute **6 Folgen** ([music.ts:139–182](../../src/lib/music.ts)): `vollkadenz`,
  `erweitert`, `quintfall`, `kanon`, `stufenweg`, `mollwendung`. Soll sind 32.
- `ProgressionDef` ([music.ts:131–137](../../src/lib/music.ts)) trägt `id`, `name`,
  `degrees`, `logic`, `fingeringHint`. Es fehlen `kategorie` und `uebung2`; `degrees` ist
  `{ dur: string[]; moll: string[] }` und kann „in diesem Tongeschlecht nicht angeboten"
  gar nicht ausdrücken.
- Zwei Datensätze widersprechen dem Konzept:
  - `mollwendung` ([music.ts:178](../../src/lib/music.ts)) hat eine Dur-Variante
    `I – V – vi – IV`, obwohl Konzept §5.2 dort ausdrücklich „–" vorsieht. Diese Kette ist
    ohnehin die `achse` (Nr. 18 des Datensatzes) und damit doppelt.
  - `kanon` ([music.ts:164](../../src/lib/music.ts)) hat eine Moll-Variante, die der
    Datensatz nicht vorsieht.
- Für Übung 2 gibt es keine Eignungsangabe. Der Datensatz kennzeichnet `blues12` und
  `blues-quickchange` mit `Ü2 ✗` (zwölf Takte sind für den Systemsprung zu lang);
  heute ließen sie sich trotzdem in Übung 2 wählen.

---

## Umbau

### Feldstruktur

```ts
kategorie: 'kadenz' | 'sequenz' | 'moll' | 'pop' | 'blues-jazz'
degrees:   { dur: string[] | null; moll: string[] | null }
uebung2:   boolean
```

`null` heißt **bewusst nicht angeboten** – zu unterscheiden von *nicht auflösbar* (B-21,
ein Fehler). Beide führen in der Auswahl zu „nicht verfügbar", aber mit verschiedener
Begründung: „nur in Moll" gegenüber „Stufe X existiert in dieser Tonart nicht".

### Übernahme

Alle 32 Folgen aus `docs/Akkordfolgen.md` – Kategorien A bis E –, jeweils mit Stufenkette
für Dur und Moll, Kategorie, Ü2-Kennzeichen sowie den Texten für Logik und Fingersatz aus
dem Abschnitt „Logik & Fingersatz" der jeweiligen Kategorie. Die Texte sind Pflichtfelder
von `ProgressionDef`; sie entstehen damit zwangsläufig hier und werden in Paket 3 (B-23)
nur noch auf Vollständigkeit geprüft und zweitverwendet.

Reihenfolge im Datensatz: wie im Dokument (Nr. 1–32). Die abweichende **Anzeige**-Reihenfolge
(Wippen zuerst) ist Sache der Auswahl-UI und damit B-22 – Daten und Darstellung bleiben
getrennt.

### Verfügbarkeit

`null` im aktiven Tongeschlecht: Eintrag **ausgegraut mit Begründung, nicht versteckt**
(AK 3). Analog wird eine Folge mit `uebung2: false` in Übung 2 als nicht verfügbar
gekennzeichnet, statt sie stumm zuzulassen. In der heutigen Chip-Reihe genügt dafür die
schlichteste Form; die Gruppierung kommt mit B-22.

---

## Akzeptanzkriterien (B-20)

1. Alle 32 Folgen aus `docs/Akkordfolgen.md` sind 1:1 übernommen, inklusive Logik- und
   Fingersatz-Texten.
2. `ProgressionDef` trägt zusätzlich `kategorie` und `uebung2`.
3. Folgen mit `null` im aktiven Tongeschlecht sind ausgegraut mit Begründung, nicht
   versteckt.
4. Kein `if` auf einen Folgen-Namen irgendwo im Code (R14).
5. Test: Jede Folge löst in jeder passenden Tonart vollständig auf – kein Eintrag geht
   verloren.

**Prüfweg (ohne MIDI):**

- AK 1 als Test gegen die Zahlen des Datensatzes: 32 Einträge, je Kategorie die dort
  genannte Anzahl (9 · 5 · 3 · 9 · 6), alle `id`s eindeutig, `logic` und `fingeringHint`
  nirgends leer.
- AK 5 als Kreuztest: 32 Folgen × 10 Tonarten. Für jede Kombination mit nicht-`null`
  Stufenkette hat die aufgelöste Akkordkette **dieselbe Länge** wie die Stufenkette
  (das ist B-21 in Anwendung); `null`-Kombinationen sind als nicht verfügbar gemeldet.
- AK 4 per `grep` über `src` nach den Folgen-`id`s: Treffer nur im Datensatz selbst.
- AK 3 in der App: In C-Dur ist „Moll-Wendung" ausgegraut mit Begründung und nicht
  startbar; in a-Moll ist sie wählbar. Für „Kanon-Sequenz" umgekehrt.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle fünf Akzeptanzkriterien einzeln nachweisbar
- [ ] Der Fortschritt aus B-16 bleibt gültig: Schlüssel `${keyId}|${progId}`, unveränderte
      `id`s für die sechs bestehenden Folgen
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Ein Commit:** „B-20: 32 Akkordfolgen als Daten (R14)"

---

## Abgrenzung

- **Die Auswahl-UI ist Paket 3.** Hier bekommt die bestehende Chip-Reihe nur das Nötigste,
  damit AK 3 nachweisbar ist. Dass 32 Einträge in einer flachen Reihe unbedienbar sind, ist
  genau der Befund von B-22 – er wird hier nicht vorweggenommen und nicht kaschiert.
- **Set B des Datensatzes bleibt draußen** (Septakkorde, Zwischendominanten, Umkehrungen).
  Diese Folgen sind bewusst nicht Teil des Bestands; eine Umsetzung braucht eine
  Regeländerung nach Regelwerk §7.
- **Eigene Folgen (B-32 ❓)** sind nicht Teil dieses Pakets.
- **Kleinigkeit im Datensatz:** Die Warnung in `docs/Akkordfolgen.md` (Lesehilfe) verweist
  auf „Backlog **B-16**", gemeint ist **B-19**. Beim Anfassen der Datei mitkorrigieren.
