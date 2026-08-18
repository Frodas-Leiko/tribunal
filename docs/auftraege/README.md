# Arbeitspakete

**Stand:** 18.08.2026 · **Grundlage:** `docs/Backlog.md`, `docs/Regelwerk.md`

Je ein Paket pro Chat. Reihenfolge ist verbindlich – jedes Paket setzt auf dem vorigen auf.

| Priorität | Pakete | Stand |
|---|---|---|
| **P0** · Hänger und Anzeigebrüche | 3 | abgeschlossen (B-01 … B-06, B-28 Setup) |
| **P1** · Oktaven und Lage | 3 | abgeschlossen (B-07 … B-12); **B-13 ❓** offen |
| **P2** · Level spielbar, Fortschritt korrekt | 3 | abgeschlossen (B-14 … B-18) |
| **P3** · Inhalte: Folgen und Moll-Vokabular | 3 | abgeschlossen (B-19 … B-23) |
| **P4** · Konzepttreue, Messqualität, Aufräumen | 3 | offen (B-24 … B-27, B-29); **B-30/B-31/B-32 ❓** offen |

---

# P0 · Hänger und Anzeigebrüche

**Items:** B-01 … B-06 · **Stand:** abgeschlossen

| Paket | Datei | Items | Aufwand | Hauptdateien |
|---|---|---|---|---|
| **1** | `P0-1-fundament.md` | B-28 (Setup) · B-05 | klein | `package.json`, `src/lib/music.ts` |
| **2** | `P0-2-uhr-und-audio.md` | B-01 · B-02 | klein–mittel | `src/lib/audio.ts`, `src/sections/Home.tsx`, `src/App.tsx`, `src/sections/Session.tsx` |
| **3** | `P0-3-zustand.md` | B-03 · B-04 · B-06 | mittel–groß | `src/lib/engine.ts` |

---

## Warum dieser Schnitt

**Die Kopplung liegt in `engine.ts`.** B-01, B-02, B-03, B-04 und B-06 schreiben alle in
denselben Block aus Refs und Timern (`pausedRef`, `schedRef`, `evalTimersRef`,
`resumeTimerRef`, `notesRef`, `beatBaseRef`). Sechs getrennte Chats würden dieselben
Funktionen sechsmal neu schreiben – jeder Chat gegen einen Stand, den der nächste wieder
umbaut.

**Innerhalb von Paket 3 ist die Kopplung sogar wörtlich:**
B-03 AK 2 verlangt, dass jeder Zustandsübergang den *Notenpuffer* aufräumt – das ist genau
der Puffer, den B-04 neu definiert. B-06 AK 3 („beim Übergang nach `RUNNING` wird veraltetes
Feedback verworfen") ist eine Zeile *innerhalb* der Übergangsfunktion aus B-03. Diese drei
Items getrennt zu bauen heißt, dieselbe Funktion dreimal zu schreiben.

**Paket 2 ist aus demselben Grund ein Paar:** Der Vorschub aus B-02 gehört in
`Scheduler.start()` – dieselbe Methode, deren Aufrufer B-01 umverdrahtet. Einzeln gebaut
bleibt jeweils die Hälfte des Hängers stehen: B-01 ohne B-02 behebt den toten Kontext, nicht
den Nachhol-Burst; B-02 ohne B-01 umgekehrt.

**Paket 1 ist der einzige echte Ausreißer.** B-05 fasst weder Timer noch Zustand an – es ist
reine Rechenlogik. Es lässt sich konfliktfrei vorziehen und liefert dem Testrunner (B-28)
sofort einen ersten echten Testfall.

## Warum der Testrunner vorgezogen wird

Regelwerk §5.4: Musik-Logik gilt nur mit automatischen Tests als erledigt. B-05 AK 5 fordert
Unit-Tests, B-03 AK 5 fordert einen Test über 200 Zustandsübergänge. Beide sind ohne Runner
nicht abnahmefähig – heute existiert keiner. Der Runner muss also vor Paket 3 stehen; Paket 1
zieht ihn an den Anfang und weist ihn gleich an B-05 nach.

## Nicht in P0

Diese Punkte fallen beim Lesen auf, gehören aber in spätere Prioritäten. **In keinem der drei
Pakete anfassen** (Regelwerk §5.6 – keine Sammelcommits über Prioritätsstufen hinweg):

- `engine.ts:161` – direkter `localStorage`-Zugriff → **B-17** (P2)
- `Session.tsx:40` – `/8` hart kodiert statt `PASS_STREAK` → **B-18** (P2)
- `engine.ts:219` – Register-Prüfung über Mittelwerte → **B-12** (P1)
- `engine.ts:239` – Timing-Fehler setzt `pitchOk = false` → **B-24** (P4)
- `src/pages/Home.tsx` – Vite-Boilerplate, `BrowserRouter` ungenutzt → **B-29** (P4)

---

# P1 · Oktaven und Lage

**Items:** B-07 … B-12 · **Beschluss:** feste Anker-Oktave + wählbare Lage (R12)

| Paket | Datei | Items | Aufwand | Hauptdateien |
|---|---|---|---|---|
| **1** | `P1-1-anker-oktave.md` | B-07 | mittel | `src/lib/staff.ts`, `src/lib/music.ts`, neu `src/lib/staff.test.ts` |
| **2** | `P1-2-lage-und-register.md` | B-08 · B-12 | klein | `src/sections/Home.tsx`, `src/lib/engine.ts`, `src/sections/Session.tsx`, `src/components/Steckbrief.tsx` |
| **3** | `P1-3-zonen-und-karte.md` | B-09 · B-10 · B-11 | mittel | `src/components/Visuals.tsx`, `src/lib/staff.ts`, `src/lib/engine.ts` |

## Warum dieser Schnitt

**P1 hat einen einzigen neuen Begriff: die Anker-Oktave.** Alles andere in dieser Priorität
liest ihn – das Notensystem, die Register-Prüfung, die Zonen, die Landkarte. Der Schnitt
folgt deshalb den Schichten, nicht den Item-Nummern:

**Paket 1 ist reine Rechenlogik** in einer einzigen Funktion (`spellTriad`) und die einzige
Stelle, an der die Lagenregel R12 überhaupt entsteht. Es fasst weder UI noch Zustand an und
ist damit konfliktfrei vorziehbar. B-07 AK 4 verlangt einen Regressionstest über
10 Tonarten × 7 Stufen × **3 Lagen** – die Lage muss also schon hier ein Parameter sein,
sonst ist das Kriterium nicht prüfbar.

**Paket 2 reicht diesen Parameter durch** – Setup → `SessionConfig` → Engine → Steckbrief –
und korrigiert im selben Zug die Register-Prüfung. Die beiden Items gehören zusammen, weil
B-12 auf einer wandernden Lage gar nicht beurteilbar ist: Der heutige Mittelwert-Vergleich
schlägt dort zwangsläufig falsch an. Erst mit der stabilen Anker-Oktave lässt sich zeigen,
dass die neue Prüfung richtig liegt.

**Paket 3 ist die Darstellungsschicht.** B-09 und B-10 arbeiten an derselben Frage – wo
liegt der Block, und wie heißt die Zone – und B-10 nimmt `zoneOf()` genau die Rolle ab, die
B-09 geometrisch geraderückt. B-11 braucht die Lage aus Paket 2, um überhaupt den richtigen
Kartenausschnitt zu kennen. Getrennt gebaut würde `Staff` dreimal umgeschrieben.

## Nicht in P1

- **B-13 ❓ Bassschlüssel** – blockiert, bis die Entscheidung fällt (Empfehlung im Backlog:
  Variante b, Hilfslinien als Zonen-Relief). P1 hängt nicht daran; die Lage `C3` bleibt
  wählbar und wird nicht vorsorglich gesperrt.
- **B-19 (Moll-Vokabular)** – `VII` ist in Moll heute der Leittondreiklang statt des
  Dur-Dreiklangs. Das ist P3 und wird in P1 nicht mitkorrigiert, obwohl es beim
  Buchstabieren auffällt.
- `localStorage` in `engine.ts` (**B-17**), `/8` in `Session.tsx` (**B-18**),
  Stufen-Sperren (**B-14**), Timing-Fehler als Akkordfehler (**B-24**) – P2 bzw. P4.

---

# P2 · Level jederzeit spielbar, Fortschritt korrekt

**Items:** B-14 … B-18 · **Beschluss:** Alles ist jederzeit spielbar (R11)

| Paket | Datei | Items | Aufwand | Hauptdateien |
|---|---|---|---|---|
| **1** | `P2-1-kein-schloss.md` | B-14 · B-18 | klein | `src/sections/Home.tsx`, `src/lib/store.ts`, `src/sections/Session.tsx` |
| **2** | `P2-2-eine-tuer-ein-level.md` | B-17 · B-15 | klein–mittel | `src/lib/store.ts`, `src/lib/engine.ts`, `eslint.config.js` |
| **3** | `P2-3-fortschritt-fuer-folgen.md` | B-16 | mittel | `src/lib/store.ts`, `src/sections/Home.tsx`, `src/lib/engine.ts` |

## Warum dieser Schnitt

**P2 dreht sich um einen einzigen Datensatz: den Fortschritt.** Der Schnitt trennt deshalb
nach Zugriffsart – erst nur lesen, dann die Schreibschicht, dann das Schema erweitern:

**Paket 1 liest nur.** B-14 entfernt die Schlösser und ersetzt sie durch eine Empfehlung,
B-18 zieht die Serienzahl aus `PASS_STREAK`. Beides ist Anzeige; keine Zeile schreibt in
den Speicher. Damit liegt das Paket konfliktfrei vor dem Umbau der Speicherschicht.

**Paket 2 baut die eine Tür.** B-17 holt den direkten `localStorage`-Zugriff aus
`engine.ts` heraus, gibt jedem Datensatz eine `version` samt Migrationspfad und sichert
die Regel per Lint ab. B-15 korrigiert direkt danach das eingefrorene Level-Tempo – in
derselben Funktion, die B-17 gerade freigeräumt hat.

*Reihenfolge gegenüber dem Backlog getauscht* (dort B-15 → B-17): B-15 schreibt genau die
Zeilen um, die B-17 verschiebt. Andersherum entstünde ein direkter Speicherzugriff, den
der nächste Commit sofort wieder entfernt.

**Paket 3 erweitert das Schema.** B-16 gibt Akkordfolgen und Modus C einen eigenen Stand.
Das ändert die Form des Datensatzes und ist ohne den Migrationspfad aus Paket 2 nicht
abnahmefähig (R25) – deshalb zuletzt.

## Nicht in P2

- **B-30 ❓ (IndexedDB vs. `localStorage`)** – Paket 2 macht die Entscheidung billig: Danach
  kennt genau eine Datei den Speicher. Empfehlung bleibt (b), `localStorage` behalten und
  Konzept §6 nach Regelwerk §7 nachziehen.
- **B-19/B-20/B-22** (P3) – die 32 Folgen und ihre Auswahl-UI. Paket 3 arbeitet mit den
  heutigen sechs; der Schlüssel `(Tonart, Folge)` trägt die späteren 32 unverändert.
- **B-24/B-25** (P4) – das Statistik-Schema ändert sich dort erneut. In P2 wird nur die
  Version eingeführt, nicht deren künftiger Inhalt.

---

# P3 · Inhalte: Akkordfolgen und Moll-Vokabular

**Items:** B-19 … B-23 · **Grundlage:** `docs/Akkordfolgen.md` (32 Folgen) · **Regeln:** R14, R15, R16

| Paket | Datei | Items | Aufwand | Hauptdateien |
|---|---|---|---|---|
| **1** | `P3-1-moll-vokabular.md` | B-19 · B-21 | mittel | `src/lib/music.ts`, `src/lib/staff.ts`, `src/lib/engine.ts` |
| **2** | `P3-2-32-folgen.md` | B-20 | mittel | `src/lib/music.ts`, `src/sections/Home.tsx` |
| **3** | `P3-3-auswahl-und-steckbrief.md` | B-22 · B-23 | mittel | `src/sections/Home.tsx`, `src/components/Steckbrief.tsx`, `src/sections/Session.tsx` |

## Warum dieser Schnitt

**P3 hat eine einzige Fließrichtung: von der Stufenbezeichnung zum Klang und von dort auf
den Bildschirm.** Der Schnitt folgt ihr – erst die Auflösung, dann die Daten, dann die
Darstellung:

**Paket 1 ist die Auflösung.** B-19 gibt Moll sein vollständiges Vokabular (`VII` ist der
Dur-Dreiklang, `vii°` der Leittondreiklang, `v` existiert), B-21 macht die nicht
auflösbare Stufe zu einem lauten Fehler. Die beiden gehören zusammen, weil sie dieselbe
Naht bearbeiten: die Stelle, an der aus einem Bezeichner ein Akkord wird. Getrennt gebaut
schriebe man diese Auflösung zweimal – und B-19 ohne B-21 ließe die stille Kürzung
ausgerechnet in dem Moment stehen, in dem der Vorrat wächst.

**Paket 2 sind die Daten.** B-20 überträgt die 32 Folgen aus `docs/Akkordfolgen.md`. Das
ist ohne Paket 1 nicht abnahmefähig: Sieben der Folgen tragen im Datensatz die Markierung
**R15** und sind in Moll bis dahin gar nicht auflösbar – sie würden nach R16 zu Recht als
nicht verfügbar gelten. Das Paket fasst bewusst keine UI an; die Steckbrief-Texte
entstehen hier trotzdem, weil sie Pflichtfelder von `ProgressionDef` sind.

**Paket 3 ist die Darstellung.** B-22 und B-23 arbeiten an derselben Liste und an
demselben Overlay: B-22 gruppiert die 32 Einträge und hängt an jeden das
Steckbrief-Symbol, B-23 gibt diesem Symbol seinen zweiten Zugang aus der laufenden
Einheit. Getrennt gebaut würde die Auswahlzeile zweimal umgeschrieben.

## Nicht in P3

- **Set B aus `docs/Akkordfolgen.md`** – Septakkorde, Zwischendominanten, Umkehrungen,
  Neapolitaner. Diese Folgen brauchen Akkordtypen, die die App nicht kennt; eine Umsetzung
  ist eine Regeländerung nach §7, kein Nebeneffekt dieser Pakete.
- **B-32 ❓ (Editor für eigene Folgen)** – blockiert, bis die Entscheidung fällt. Der
  Nutzen steigt laut Backlog erst, wenn B-19 und B-22 stehen; danach ist die Frage neu zu
  stellen.
- **B-31 ❓ (Notensystem auch in Übung 1)** – offen, betrifft die Anzeige der Einheit,
  nicht die Folgen.
- **Messqualität und Statistik** (B-24 … B-27, P4) – die finger-aufgelöste Historie nach
  R27 und die Trennung von Griff- und Timing-Fehlern bleiben unberührt, obwohl die
  korrigierte Buchstabierung aus B-19 die Heatmap-Schlüssel berührt (siehe Abgrenzung in
  Paket 1).

---

# P4 · Konzepttreue, Messqualität, Aufräumen

**Items:** B-24 · B-25 · B-26 · B-27 · B-29 · **Regeln:** R26, R27, R2, R6, R7, §5

| Paket | Datei | Items | Aufwand | Hauptdateien |
|---|---|---|---|---|
| **1** | `P4-1-messqualitaet.md` | B-24 · B-25 | mittel–groß | `src/lib/store.ts`, `src/lib/engine.ts`, `src/lib/music.ts`, `src/sections/Stats.tsx` |
| **2** | `P4-2-anweisung-und-geraet.md` | B-26 · B-27 | klein–mittel | `src/lib/music.ts`, `src/lib/audio.ts`, `src/App.tsx`, `src/index.css` |
| **3** | `P4-3-aufraeumen.md` | B-29 | mittel | `src/components/ui/*`, `src/pages/`, `package.json`, `src/components/Visuals.tsx` |

**B-28** (Testrunner) gehört nummerisch zu P4, wurde aber nach P0 Paket 1 vorgezogen –
ohne ihn war kein Musik-Item abnahmefähig (§5.4). Er ist erledigt.

## Warum dieser Schnitt

**P4 hat drei getrennte Gegenstände: die Akte, die Anweisung und das Verzeichnis.**
Sie teilen keine Zeile Code, und der Schnitt folgt genau dieser Trennung:

**Paket 1 ist die Akte.** B-24 und B-25 schreiben beide `recordAttempt()` um, beide
ändern das Schema von `StatsData`, beide brauchen einen Migrationspfad nach R25, und
beide zeigen ihr Ergebnis in `Stats.tsx`. Getrennt gebaut hieße: zweimal dasselbe
Schema anfassen, zwei Migrationen schreiben, dieselbe Ansicht zweimal umbauen – genau
der Fehler, den P2 Paket 2/3 vermieden hat. Zusätzlich hängen sie inhaltlich zusammen:
B-25 löst die Fehler nach Fingern auf, und diese Auflösung ist nur so viel wert, wie
die Zahlen sauber sind, die B-24 von der Zeit befreit.

**Paket 2 ist das, was der Nutzer während der Einheit erlebt** – der Satz, den das
Tribunal sagt, und der Bildschirm, auf dem er steht. B-26 ist reine Rechenlogik in
`tribunal()` und damit konfliktfrei; B-27 fasst Wake Lock und Hochformat an. Beide
sind klein, beide berühren die Statistik nicht, und beide setzen auf Paket 1 auf, ohne
es zu ändern.

**Paket 3 räumt auf und steht deshalb am Ende.** Es entfernt 53 Dateien und 43
Abhängigkeiten und verschiebt Exporte zwischen Dateien. Vorgezogen würde es mit jedem
anderen Paket kollidieren; die Lint-Fehler, die es beseitigen soll, sitzen zudem in
Dateien, die Paket 1 und 2 vorher noch anfassen (`engine.ts`, `Visuals.tsx`). Es ist
außerdem das Paket, nach dem `npm run lint` zum ersten Mal seit P0 auf null steht –
das lässt sich nur zuletzt sinnvoll behaupten.

## Nicht in P4

- **B-13 ❓ (Bassschlüssel)**, **B-30 ❓ (IndexedDB)**, **B-31 ❓ (Notensystem in
  Übung 1)**, **B-32 ❓ (Editor für eigene Folgen)** – vier offene Entscheidungen,
  jede mit Empfehlung im Backlog. Nach P4 sind sie das Einzige, was noch aussteht.
- **Set B aus `docs/Akkordfolgen.md`** (Septakkorde, Zwischendominanten, Umkehrungen)
  – braucht Akkordtypen, die die App nicht kennt; eine Regeländerung nach §7.
- **Konzept-Abnahmekriterium 3** („die nächste Stufe schaltet erst dann frei") ist mit
  R11 bewusst gefallen und wird in P4 nicht zurückgeholt.

---

## Startprompt je Chat

```
Lies docs/auftraege/P1-1-anker-oktave.md und arbeite den Auftrag ab.
Grundlagen: docs/Regelwerk.md und docs/Backlog.md.
```

(Für die übrigen Pakete entsprechend die jeweilige Datei.)
