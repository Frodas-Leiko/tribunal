# Arbeitspakete

**Stand:** 17.08.2026 · **Grundlage:** `docs/Backlog.md`, `docs/Regelwerk.md`

Je ein Paket pro Chat. Reihenfolge ist verbindlich – jedes Paket setzt auf dem vorigen auf.

| Priorität | Pakete | Stand |
|---|---|---|
| **P0** · Hänger und Anzeigebrüche | 3 | abgeschlossen (B-01 … B-06, B-28 Setup) |
| **P1** · Oktaven und Lage | 3 | abgeschlossen (B-07 … B-12); **B-13 ❓** offen |
| **P2** · Level spielbar, Fortschritt korrekt | 3 | in Arbeit – Paket 1 abgeschlossen (B-14 · B-18) |

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

## Startprompt je Chat

```
Lies docs/auftraege/P1-1-anker-oktave.md und arbeite den Auftrag ab.
Grundlagen: docs/Regelwerk.md und docs/Backlog.md.
```

(Für die übrigen Pakete entsprechend die jeweilige Datei.)
