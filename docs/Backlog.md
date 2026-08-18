# Backlog „Propriozeptives Tribunal"

**Version:** 1.0 · **Stand:** 17.08.2026
**Grundlagen:** `docs/Konzept.md` (Vision) · `docs/Regelwerk.md` (verbindliche Regeln) · `docs/Akkordfolgen.md` (Datensatz)

Abarbeitung von oben nach unten. Ein Item = ein Commit-Bereich (Regelwerk §5).
`❓` markiert eine offene Entscheidung, die das Item blockiert.

---

## Übersicht

| Prio | Thema | Items |
|---|---|---|
| **P0** | Hänger und Anzeigebrüche nach Fehleingabe | B-01 … B-06 |
| **P1** | Oktaven und Lage sauber integrieren | B-07 … B-13 |
| **P2** | Alle Level jederzeit spielbar, Fortschritt korrekt | B-14 … B-18 |
| **P3** | Inhalte: Akkordfolgen und Moll-Vokabular | B-19 … B-23 |
| **P4** | Konzepttreue, Messqualität, Aufräumen | B-24 … B-31 |
| **P5** | Nachgereichte Befunde aus der Abnahme | B-33 |

---

# P0 · Hänger und Anzeigebrüche

> Das ist die Ursache für „nach fehlerhafter Eingabe hängt sich die Anzeige auf".
> Es sind **mehrere unabhängige Fehler**, die sich überlagern. B-01 und B-02 sind die
> wahrscheinlichsten Auslöser des vollständigen Stillstands.

---

### B-01 · AudioContext nur in echter Nutzergeste öffnen
**Regel:** R18, R17 · **Aufwand:** klein · **Dateien:** `src/lib/audio.ts`, `src/sections/Session.tsx`, `src/lib/engine.ts`

**Befund.** `Session.tsx` startet die Einheit in `useEffect(..., [])`; darin entsteht
`new Metronome()` und der `AudioContext`. Das liegt **nicht** im Callstack eines Klicks.
Auf Tablets (iPadOS/Safari, teils Chrome Android) bleibt der Kontext dann `suspended`.
`Scheduler.tick()` prüft `while (nextTime < ctx.currentTime + 0.12)` – steht
`ctx.currentTime` still, feuert der Scheduler nach wenigen Events **nie wieder**:
Cursor eingefroren, keine Auswertung, kein Metronom. Die App wirkt tot, obwohl React lebt.
`tryResume()` ruft `ensure()` zusätzlich aus einem `setTimeout` heraus – ebenfalls
außerhalb jeder Geste.

**Akzeptanzkriterien**
1. Der `AudioContext` wird ausschließlich im `onClick` von „Einheit starten" erzeugt und `resume()`-t.
2. Ist `ctx.state !== 'running'`, zeigt die Session einen sichtbaren, antippbaren Hinweis („Audio blockiert – zum Aktivieren tippen") und startet erst danach.
3. `visibilitychange` auf sichtbar prüft und reaktiviert den Kontext.
4. `metroRef` wird in `stop()` genullt; ein zweiter `start()` erzeugt keinen zweiten Kontext.
5. Nachweis: Einheit auf dem Tablet starten, Tab wechseln, zurückkehren – Takt läuft weiter oder meldet sich sichtbar zurück.

---

### B-02 · Scheduler nie in der Vergangenheit starten
**Regel:** R19 · **Aufwand:** klein · **Dateien:** `src/lib/audio.ts`, `src/lib/engine.ts`

**Befund.** In `tryResume()` wird der Scheduler auf `noteAudio = (t0 − perfOffset)/1000`
gestartet. `t0` ist der Zeitpunkt des Anschlags und liegt beim Aufruf bereits
mindestens `RESUME_WINDOW` = 260 ms zurück. `Scheduler.start()` setzt `nextTime` damit
in die Vergangenheit; der erste `tick()` feuert sofort einen **Burst von Nachhol-Events**.
Folgen: Doppelklick im Metronom (`Math.max(time, ctx.currentTime)` staucht alles auf
jetzt), Cursor springt, `clockRef` wird auf ein längst vergangenes Segment gesetzt,
die Subdivisions-Anzeige steht auf dem falschen Feld. Genau das ist der „gestörte
Anzeige-Ablauf" nach dem Wiedereinstieg.

**Akzeptanzkriterien**
1. Der Startzeitpunkt wird in ganzen Intervallschritten vorgeschoben, bis er ≥ `ctx.currentTime` liegt; `beatBaseRef` wird um die übersprungenen Beats korrigiert.
2. `Metronome.click()` verwirft Zeitpunkte, die mehr als 20 ms in der Vergangenheit liegen, statt sie auf „jetzt" zu stauchen.
3. Nach jedem Wiedereinstieg zeigt der Subdivisions-Balken das Segment `1` und der Cursor startet links.
4. Nachweis im Demo-Modus: 20 Fehler-/Wiedereinstiegszyklen hintereinander ohne Doppelklick und ohne Cursor-Sprung.

---

### B-03 · Ein Zustandsautomat für die Session
**Regel:** R17 · **Aufwand:** mittel · **Dateien:** `src/lib/engine.ts`

**Befund.** Der Zustand liegt heute verstreut in `pausedRef`, `schedRef`, `clockRef.active`,
`hud.paused`, `resumeTimerRef`, `skipEvalBeatRef`, `evalTimersRef`, `currentBeatRef`,
`beatBaseRef`. Einzelne Pfade räumen nur einen Teil davon auf:
`pauseSession()` löscht z. B. **nicht** `resumeTimerRef`, und `evalTimersRef` wächst
unbegrenzt (Timer-IDs werden nur bei Pause/Stop entfernt, nie nach dem Feuern).
Jede neue Bedingung erzeugt hier einen neuen Sonderfall.

**Akzeptanzkriterien**
1. Es existiert ein expliziter Zustand `IDLE | ARMED | RUNNING | PAUSED | ENDED` mit genau einer Übergangsfunktion.
2. Jeder Übergang räumt Scheduler, Auswerte-Timer, Wiedereinstiegs-Timer, Notenpuffer und Uhr vollständig auf.
3. `evalTimersRef` enthält nach jedem Beat nur noch nicht gefeuerte Timer.
4. Es gibt keinen Pfad, der `pausedRef` setzt, ohne über die Übergangsfunktion zu laufen.
5. Nachweis: Ein Test schaltet 200 zufällige Übergänge durch, ohne dass Timer überleben.

---

### B-04 · Anschlagserfassung als dynamisches Sammelfenster
**Regel:** R20 · **Aufwand:** mittel · **Dateien:** `src/lib/engine.ts`

**Befund.** Der Wiedereinstieg sammelt starr `[t0 − 30 ms, t0 + 260 ms]` ab dem
**ersten** Ton und leert danach den Puffer bis `t0 + 260`. Ein leicht gerollter Akkord,
ein verrutschter Finger oder ein schneller Zweitversuch fallen damit in **einen**
Versuch zusammen und werden zwangsläufig als falsch gewertet – der zweite, korrekte
Versuch ist bereits weggeräumt. Für den Nutzer sieht das aus wie „reagiert nicht mehr".
Dieselbe Starrheit gilt für die laufende Auswertung (`WINDOW` = 170 ms, `EVAL_DELAY` = 170 ms,
tempo- und toleranzunabhängig).

**Akzeptanzkriterien**
1. Ein Akkord gilt als abgeschlossen, wenn 80 ms lang kein weiterer Ton folgt – Obergrenze 300 ms und nie mehr als die halbe Beat-Dauer.
2. Ein falscher Ton beendet den Versuch nicht sofort; bewertet wird erst nach Fensterende.
3. Auswerte- und Toleranzfenster leiten sich aus Beat-Dauer und gewählter Toleranz ab (R21).
4. Nachweis im Demo-Modus: Akkord mit 120 ms Rollzeit greifen → wird als **ein** korrekter Akkord gewertet.
5. Nachweis: Zwei Versuche im Abstand von 400 ms werden als zwei getrennte Versuche gewertet.

---

### B-05 · Tribunal deckt fehlende und überzählige Töne ab
**Regel:** R23, R2, R3 · **Aufwand:** klein · **Dateien:** `src/lib/engine.ts`, `src/lib/music.ts`

**Befund.** `tribunal()` paart nur *fehlende Zieltöne* mit *überzähligen gespielten Tönen*.
Zwei sehr häufige Anfängerfälle fallen durch:
- **zu wenige Töne** (2 statt 3, kein Extra-Ton) → `best` bleibt `null`
- **ein Ton zu viel** (3 richtige + 1 zusätzlicher) → alle Zieltöne getroffen, also ebenfalls `null`

In beiden Fällen erscheint die Verlegenheitsmeldung „Akkord nicht gefunden – Mulde
komplett neu formen", obwohl fast alles stimmte. Das ist entmutigend und verletzt R2:
die große Zeile enthält keine ausführbare Anweisung.

**Akzeptanzkriterien**
1. Fehlender Ton → `FINGER 5 fehlt` / klein: `Quinte fehlt`.
2. Überzähliger Ton → `Ein Ton zu viel: Fis loslassen` / klein: `nicht in D-Dur`.
3. Bestehender Vektorfall bleibt unverändert (R3: weiterhin nur **ein** Hinweis).
4. „Akkord nicht gefunden" erscheint nur noch, wenn **kein einziger** Zielton getroffen wurde.
5. Alle vier Fälle sind durch Unit-Tests abgedeckt.

---

### B-06 · Kein Bildschirmzustand bleibt stehen
**Regel:** R22, R6 · **Aufwand:** klein · **Dateien:** `src/lib/engine.ts`, `src/sections/Session.tsx`

**Befund.** Das Erfolgs-Banner wird mit `banner: banner ?? h.banner` festgehalten und
verschwindet **nur** durch einen Klick auf „Weiter" – mitten in einer Übung, in der
laut Konzept §7 nichts angetippt wird. Gleichzeitig bleibt das `feedback` von **vor**
der Pause sichtbar, sodass nach dem Wiedereinstieg noch die alte Fehlermeldung steht.
Zusammen wirkt das wie ein eingefrorener Bildschirm.

**Akzeptanzkriterien**
1. Banner verschwinden automatisch nach 4 s oder mit dem nächsten Anschlag; der „Weiter"-Button ist optional, nicht notwendig.
2. Ein Banner überlagert nie die Tribunal-Zeile und blockiert nie die Eingabe.
3. Beim Übergang nach `RUNNING` wird veraltetes Feedback verworfen.
4. Der Pausen-Hinweis nennt immer den aktuell erwarteten Akkord und verschwindet mit dem Wiedereinstieg.

---

# P1 · Oktaven und Lage

> Der Kern des Problems „Wechsel über Oktaven ist nicht vernünftig integriert".
> Beschluss: **feste Anker-Oktave + wählbare Lage** (R12).

---

### B-07 · Anker-Oktave: stabile Akkordlage
**Regel:** R12 · **Aufwand:** mittel · **Dateien:** `src/lib/staff.ts`, `src/lib/music.ts`

**Befund (gemessen).** `spellTriad()` legt den Grundton „innerhalb ±6 Halbtöne um C4".
Das ergibt in **C-Dur**:

| Stufe | I | ii | iii | IV | **V** | vi | vii° |
|---|---|---|---|---|---|---|---|
| Grundton MIDI | 60 | 62 | 64 | 65 | **55** | 57 | 59 |
| Schritt zum Vorgänger | – | +2 | +2 | +1 | **−10** | +2 | +2 |

Von IV nach V springt die Hand eine **große Septime abwärts**. Das widerspricht direkt
Konzept §3 („Akkorde als feste Hand-Geometrie speichern") und macht die eigenen
Steckbrief-Texte falsch („beim Wechsel I→IV wandert die ganze Mulde eine Stufe nach oben" –
bei I→V wandert sie in Wahrheit eine Septime nach unten).

**Akzeptanzkriterien**
1. Alle Stufen einer Tonart werden **aufwärts** von der Anker-Tonika gebaut; der größte Grundton-Abstand innerhalb einer Tonart ist die große Septime aufwärts.
2. In C-Dur mit Anker `C4` gilt: I=60, ii=62, iii=64, IV=65, V=67, vi=69, vii°=71.
3. Die Buchstabierung (`♯`/`♭`, Notenkopf-Positionen) bleibt für alle 10 Tonarten korrekt.
4. Regressionstest über alle 10 Tonarten × 7 Stufen × 3 Lagen: kein Grundton außerhalb des erlaubten Fensters, keine falsche Vorzeichenwahl.

---

### B-08 · Lagen-Wahl im Setup
**Regel:** R12 · **Aufwand:** klein · **Dateien:** `src/sections/Home.tsx`, `src/lib/engine.ts`, `src/components/Steckbrief.tsx`

**Befund.** Es gibt keine Möglichkeit, die Handlage zu wählen. Die Hand muss dorthin,
wo die App rechnet. Auf einem 88-Tasten-Instrument ist das unnötig eng.

**Akzeptanzkriterien**
1. Setup-Zeile „Lage" mit mindestens `C3 · C4 · C5`, Standard `C4`.
2. Die Wahl ist Teil von `SessionConfig` und wirkt auf Notensystem, Topographie und Register-Prüfung gleichermaßen.
3. Der Tonart-Steckbrief nennt die gewählte Lage und den daraus folgenden Grundton der Tonika.
4. Übung 2 verschiebt von dieser Lage aus um genau ±1 Oktave.

---

### B-09 · Übung 2: Zonen-Geometrie korrigieren
**Regel:** R13 · **Aufwand:** klein · **Dateien:** `src/components/Visuals.tsx`, `src/lib/staff.ts`

**Befund (gemessen).** Die Nadir-Zone liegt **außerhalb der Zeichenfläche**:
`viewBox` ist `0 0 640 240`, `topLineY` = 100, `lineGap` = 18.
C-Dur mit `shift −1` ergibt die Noten-y-Werte **253 / 235 / 217** – der Grundton liegt
13 px unterhalb des SVG. Das Nadir-Zonenrechteck reicht von y=181 bis **y=253**.
Ergebnis: Notenkopf und Hilfslinien der Nadir-Zone sind unsichtbar.

**Akzeptanzkriterien**
1. Alle drei Zonen (Zenit / Zentrum / Nadir) liegen inklusive Hilfslinien vollständig in der Zeichenfläche.
2. Der Block ist in jeder Zone vollständig sichtbar, in jeder der 10 Tonarten.
3. Nachweis: Screenshot je Zone in C-Dur und in B-Dur.

---

### B-10 · Widerspruch zwischen Zonen-Leuchten und Zonen-Beschriftung
**Regel:** R13, R4 · **Aufwand:** klein · **Dateien:** `src/lib/engine.ts`, `src/lib/staff.ts`

**Befund (gemessen).** `zone` wird aus `zoneOf(spelled[1].diatonic)` bestimmt – also aus
der **Terz** des Akkords. Für den Zenit-versetzten C-Dur-Block (C5–E5–G5) ist die Terz
E5 mit `diatonic` 37, `TOP_LINE` ist 38 → `zoneOf` liefert **„zentrum"**, während
`zoneGlow` gleichzeitig **„zenit"** leuchtet. Beschriftung und Leuchten widersprechen
sich für den Nutzer.

**Akzeptanzkriterien**
1. Die Zone eines Blocks wird aus der beabsichtigten Verschiebung abgeleitet, nicht nachträglich aus einem einzelnen Ton geraten.
2. Leuchtende Zielzone und Beschriftung stimmen in Übung 2 immer überein.
3. `zoneOf()` bleibt für die Darstellung einzelner Noten erhalten, steuert aber nicht mehr die Blockzuordnung.

---

### B-11 · Topographie-Karte: Marker verschwindet
**Regel:** R1, Konzept §4.3 · **Aufwand:** mittel · **Dateien:** `src/components/Visuals.tsx`

**Befund (gemessen).** Die Karte zeigt 2 Oktaven ab MIDI 60 und rendert den Marker nur
für `markerX >= 0`. Mit der heutigen Lage (B-07) fallen in C-Dur **V, vi und vii°**
unter MIDI 60 und damit aus der Karte:

| Stufe | I | ii | iii | IV | V | vi | vii° |
|---|---|---|---|---|---|---|---|
| markerX | 13 | 67 | 120 | 147 | **−120** | **−67** | **−13** |

Die Landkarte ist also genau bei den drei Akkorden leer, für die sie am meisten
gebraucht wird. Zusätzlich zeigt sie nur den **Grundton**, nicht die Mulde – das
Konzept §4.3 verlangt aber, dass der Zielakkord in seiner charakteristischen Position
*relativ zu den Inselgruppen* erscheint.

**Akzeptanzkriterien**
1. Der Kartenbereich folgt der gewählten Lage (B-08) und umfasst mindestens C2–C6; der Marker ist in jeder Tonart und auf jeder Stufe sichtbar.
2. Alle drei Töne der Griffmulde werden markiert, der Grundton hervorgehoben.
3. Die 2er- und 3er-Inseln sind als Gruppen erkennbar getrennt (heute: `i % 5 === 0 || i % 5 === 2` – Gruppenlogik prüfen).
4. Nachweis: Screenshot-Reihe aller 7 Stufen in C-Dur und in Fis-lastigen Tonarten.

---

### B-12 · Register-Prüfung auf die Anker-Oktave beziehen
**Regel:** R13, R12 · **Aufwand:** klein · **Dateien:** `src/lib/engine.ts`

**Befund.** Die Register-Prüfung in Übung 2 vergleicht den **Mittelwert** der gespielten
MIDI-Noten mit dem Mittelwert des Zielakkords und schlägt bei ≥ 6 Halbtönen an. Auf
einer instabilen Ziel-Lage (B-07) feuert sie zwangsläufig falsch. Übung 1 hat gar keine
Register-Prüfung – das ist korrekt (R13), sollte aber bewusst dokumentiert sein.

**Akzeptanzkriterien**
1. Die Prüfung vergleicht die Oktavlage des **Grundtons** gegen die Ziel-Oktave, nicht Mittelwerte.
2. Toleranz: bis ±5 Halbtöne gilt als richtige Zone, ab ±6 als Oktavfehler mit Richtungsangabe.
3. Übung 1 prüft ausdrücklich keine Oktave; das steht im Timing-Steckbrief.

---

### B-13 · Bassschlüssel für die Nadir-Zone ❓
**Regel:** R1, Konzept §4.4 · **Aufwand:** mittel · **Dateien:** `src/components/Visuals.tsx`, `src/lib/staff.ts`

**Befund.** Es gibt nur den Violinschlüssel. Mit Lage `C3` und Nadir-Verschiebung
entstehen 4+ Hilfslinien unterhalb des Systems – für Anfänger unlesbar, obwohl das
Konzept genau verspricht, dass „Hilfslinien ihren Schrecken verlieren".

**Offene Entscheidung ❓** — Drei Wege:
(a) Bassschlüssel einblenden, sobald die Zone es verlangt (musikalisch korrekt, aber
zwei Systeme zu lesen ist für Anfänger neu);
(b) beim Violinschlüssel bleiben und die Hilfslinien als Zonen-Relief gestalten
(konzepttreu: „Block + Zone" statt Einzelnoten);
(c) Nadir-Sprünge auf maximal 1 Oktave unter der Lage begrenzen und Lage `C3` sperren.

*Empfehlung:* (b) – es ist der einzige Weg, der Konzept §4.4 wörtlich umsetzt.
**Item blockiert, bis entschieden.**

---

# P2 · Level jederzeit spielbar, Fortschritt korrekt

---

### B-14 · Alle Stufen, Tonarten und Modi freigeben
**Regel:** R11 · **Aufwand:** klein · **Dateien:** `src/sections/Home.tsx`, `src/lib/store.ts`

**Befund.** `isStageUnlocked()` sperrt die Stufen 2–5, bis die vorherige komplett
abgeschlossen ist; `modeBLocked` sperrt Modus B, bis Modus A steht. Beschluss: entfällt.

**Akzeptanzkriterien**
1. Alle 5 Stufen, 10 Tonarten und Modi A/B/C sind ohne Vorbedingung wählbar; kein `disabled`, kein 🔒.
2. Fortschritt (Tempo-Level, ✓ je Modus) bleibt sichtbar und wird weiter geführt.
3. Die empfohlene nächste Einheit ist optisch markiert (erste nicht abgeschlossene Stufe, Modus A vor B) – als Hinweis, nicht als Sperre.
4. `isStageUnlocked()` wird entfernt oder auf „nur Anzeige" reduziert; kein toter Code.

---

### B-15 · Mehrfaches Level-Up innerhalb einer Einheit
**Regel:** R4, R10 · **Aufwand:** klein · **Dateien:** `src/lib/engine.ts`, `src/sections/Home.tsx`

**Befund.** `registerSuccess()` zählt nur dann auf den Fortschritt, wenn
`tempoRef.current === config.levelTempo`. `config.levelTempo` wird beim Sessionstart
eingefroren, `tempoRef` steigt nach jeder bestandenen Serie um 4 bpm. Ab der **zweiten**
Serie in derselben Einheit ist die Bedingung dauerhaft falsch – der Nutzer landet im
Zweig „freies Tempo · Fortschritt zählt auf Level X" und muss die Einheit verlassen und
neu starten, um weiterzukommen. Das erklärt gefühlten Stillstand im Fortschritt.

**Akzeptanzkriterien**
1. Das aktuelle Level-Tempo wird während der Einheit mitgeführt und nach jedem Bestehen aktualisiert.
2. Zehn Serien hintereinander heben das Tempo zehnmal (bis `TARGET_TEMPO`), ohne die Einheit zu verlassen.
3. Der Hinweis „freies Tempo" erscheint nur, wenn der Nutzer den Regler tatsächlich vom Level-Tempo weg bewegt hat.

---

### B-16 · Fortschritt für Akkordfolgen-Einheiten
**Regel:** R10, R11 · **Aufwand:** mittel · **Dateien:** `src/lib/store.ts`, `src/sections/Home.tsx`, `src/lib/engine.ts`

**Befund.** Für `source: 'progression'` gibt es überhaupt keinen Fortschritt: kein
Tempo-Level, kein Bestehen, nur der generische Banner „Serie geschafft – 8 in Folge".
Mit 32 Folgen (B-19) wird das zum größten blinden Fleck der App. Gleiches gilt für
Modus C, der ausdrücklich nie zählt (`config.mode !== 'C'`), und für `levelTempo`, das
in Modus C hart auf 60 steht.

**Akzeptanzkriterien**
1. Fortschritt wird je `(Tonart, Folge)` bzw. `(Tonart, Modus)` gespeichert: Tempo-Level und Bestanden-Flag.
2. Die Folgen-Auswahl zeigt je Folge den Stand in der aktiven Tonart.
3. Modus C zählt entweder auf einen eigenen Wert oder sagt in der UI klar, dass er nicht wertet – aber nicht beides gleichzeitig.
4. `levelTempo` für Modus C stammt aus dem gespeicherten Stand, nicht aus einer Konstanten.

---

### B-17 · Persistenz zentralisieren und versionieren
**Regel:** R24, R25 · **Aufwand:** klein · **Dateien:** `src/lib/engine.ts`, `src/lib/store.ts`

**Befund.** `engine.ts` liest und schreibt `localStorage` direkt mit dem Literal
`'tribunal.progress.v1'` und umgeht damit `store.ts` samt dessen Fehlerbehandlung.
Zwei Wahrheiten, ein dupliziertes Key-Literal.

**Akzeptanzkriterien**
1. Kein `localStorage`-Zugriff außerhalb von `store.ts` (per Lint-Regel abgesichert).
2. Alle gespeicherten Datensätze tragen ein `version`-Feld mit Migrationspfad.
3. Ein Schema-Bruch fällt sichtbar auf Standardwerte zurück und löscht nichts stillschweigend.

---

### B-18 · Serien-Anzeige aus der Konstante speisen
**Regel:** R4 · **Aufwand:** trivial · **Dateien:** `src/sections/Session.tsx`

**Befund.** `Serie: {streak}/8` ist hart kodiert, obwohl `PASS_STREAK` existiert.

**Akzeptanzkriterium** — Die Anzeige nutzt `PASS_STREAK`; eine Änderung der Konstante wirkt überall.

---

# P3 · Inhalte

---

### B-19 · Moll-Stufenvokabular vervollständigen
**Regel:** R15 · **Aufwand:** mittel · **Dateien:** `src/lib/music.ts`, `src/lib/staff.ts`
**Blockiert:** B-20

**Befund (gemessen).** `diatonicChords()` erhöht in Moll die 7. Stufe und beschriftet den
daraus entstehenden **verminderten** Dreiklang als `VII`. In a-Moll ergibt `VII` damit
**As° (Gis–H–D)**. Die Konzept-Folge „Moll-Wendung i–VII–VI–V" meint aber den
**Dur-Dreiklang G-Dur**. Die im Konzept prominenteste Moll-Folge klingt heute also falsch.
Außerdem fehlt die natürliche Moll-Dominante `v`.

**Akzeptanzkriterien**
1. Moll stellt beide Vorräte bereit: natürlich (`i ii° III iv v VI VII`) und harmonisch (`V`, `vii°`).
2. `VII` ist in Moll **immer** der Dur-Dreiklang auf der kleinen Septime; der Leittondreiklang heißt `vii°`.
3. `mollwendung` klingt in a-Moll als a-Moll → **G-Dur** → F-Dur → E-Dur.
4. Buchstabierung und Vorzeichen stimmen für beide Vorräte in allen 5 Moll-Tonarten.
5. Unit-Test über alle Moll-Tonarten × alle Stufenbezeichner.

---

### B-20 · Akkordfolgen-Datenbank auf 32 Folgen erweitern
**Regel:** R14 · **Aufwand:** mittel · **Dateien:** `src/lib/music.ts`
**Blockiert durch:** B-19 · **Datenquelle:** `docs/Akkordfolgen.md`

**Befund.** Heute 6 Folgen, davon eine (`mollwendung`) mit falscher Dur-Variante
(`I–V–vi–IV`, obwohl Konzept §5.2 dort ausdrücklich „–" vorsieht) und falscher
Moll-Auflösung (siehe B-19). `kanon` hat umgekehrt eine Moll-Variante, die das Konzept
nicht vorsieht.

**Akzeptanzkriterien**
1. Alle 32 Folgen aus `docs/Akkordfolgen.md` sind 1:1 übernommen, inklusive Logik- und Fingersatz-Texten.
2. `ProgressionDef` trägt zusätzlich `kategorie` und `uebung2`.
3. Folgen mit `null` im aktiven Tongeschlecht sind ausgegraut mit Begründung, nicht versteckt.
4. Kein `if` auf einen Folgen-Namen irgendwo im Code (R14).
5. Test: Jede Folge löst in jeder passenden Tonart vollständig auf – kein Eintrag geht verloren.

---

### B-21 · Unbekannte Stufen laut scheitern lassen
**Regel:** R16 · **Aufwand:** trivial · **Dateien:** `src/lib/engine.ts`

**Befund.** `degrees.map(d => all.find(c => c.degree === d)).filter(c => !!c)` **verwirft
still** jede nicht auflösbare Stufe. Eine achtgliedrige Folge wird dann klanglos zur
sechsgliedrigen, ohne dass irgendetwas darauf hinweist. Mit 32 neuen Folgen (B-20) ist
das eine tickende Bombe.

**Akzeptanzkriterien**
1. Eine nicht auflösbare Stufe erzeugt einen sichtbaren Fehler in der Entwicklung und markiert die Folge in der Auswahl als nicht verfügbar.
2. Kein `filter(Boolean)` auf Stufenauflösungen.
3. Test: Eine künstlich fehlerhafte Folge wird erkannt, nicht gekürzt.

---

### B-22 · Auswahl-UI für 32 Folgen
**Regel:** R14, R6 · **Aufwand:** mittel · **Dateien:** `src/sections/Home.tsx`

**Befund.** Die Folgen liegen heute als flache Chip-Reihe (`setup-opts wrap`) im Setup.
Mit 6 Einträgen geht das; mit 32 ist es unbedienbar, besonders im Querformat auf dem Tablet.

**Akzeptanzkriterien**
1. Gruppierung nach Kategorie (Kadenz · Sequenz · Moll · Pop · Blues/Jazz) mit Filter.
2. Reihenfolge: Zwei-Akkord-Wippen zuerst, dann Kadenzen, dann der Rest.
3. Je Eintrag: Name, Stufenkette in der aktiven Tonart, Steckbrief-Symbol, Ü2-Kennzeichnung, Fortschritt (B-16).
4. Bedienbar im Querformat ohne vertikales Scrollen der gesamten Seite.

---

### B-23 · Steckbriefe für alle neuen Folgen
**Regel:** Konzept §5.3, Abnahmekriterium 4 · **Aufwand:** klein · **Dateien:** `src/lib/music.ts`, `src/components/Steckbrief.tsx`

**Akzeptanzkriterien**
1. Jede der 32 Folgen hat Stufenbezeichnung, harmonische Logik in einem Satz und Fingersatz-Hinweis.
2. Der Steckbrief ist aus der Auswahl **und** aus der laufenden Einheit in höchstens einem Tippen erreichbar (Konzept §10.4) – in der laufenden Einheit ohne Unterbrechung des Takts.
3. Der Steckbrief nennt die aktive Lage (B-08).

---

# P4 · Konzepttreue, Messqualität, Aufräumen

---

### B-24 · Timing-Fehler nicht als Akkordfehler zählen
**Regel:** R26 · **Aufwand:** klein · **Dateien:** `src/lib/engine.ts`, `src/lib/store.ts`, `src/sections/Stats.tsx`

**Befund.** Bei korrekten Tönen außerhalb der Toleranz setzt `evaluate()` `pitchOk = false`
und übergibt das an `recordAttempt()`. Der Anschlag landet damit in der **Fehler-Heatmap
der Akkorde**, obwohl der Griff richtig war. Die Heatmap misst also Timing mit – und
Modus C (`weaknessWeights`) gewichtet auf Basis dieser verschmutzten Daten die falschen
Akkorde hoch.

**Akzeptanzkriterien**
1. `recordAttempt()` unterscheidet `pitchOk` und `timingOk` als getrennte Felder.
2. Die Heatmap zeigt ausschließlich Griff-Fehler, die Drift-Linie ausschließlich Zeit.
3. Modus C gewichtet nur nach Griff-Fehlern.
4. Die Kennzahl „Trefferquote (Ton + Zeit)" bleibt erhalten, wird aber zusätzlich in beide Anteile aufgeschlüsselt.

---

### B-25 · Fehlerhistorie finger-aufgelöst speichern
**Regel:** R27, Konzept §6 · **Aufwand:** klein · **Dateien:** `src/lib/store.ts`, `src/lib/engine.ts`, `src/sections/Stats.tsx`

**Befund.** Gespeichert wird nur `high`/`low`/`total` je Akkord. Das Konzept verlangt
„pro Akkord **und Finger**". Die Information liegt im Tribunal-Vektor bereits vor
(Index 0/1/2 = Grundton/Terz/Quinte) und wird weggeworfen.

**Akzeptanzkriterien**
1. Gespeichert wird je Tonart, Akkord und Finger die Richtung und Größe der Abweichung.
2. Die Statistik zeigt, welcher Finger am häufigsten danebengreift.
3. Migration bestehender Daten nach R25, ohne Verlust.

---

### B-26 · Tribunal nennt schwarze und weiße Tasten
**Regel:** R2, Konzept §4.1 · **Aufwand:** klein · **Dateien:** `src/lib/engine.ts`

**Befund.** Das Konzept nennt ausdrücklich „die schwarze Taste links daneben" als
Beispiel für eine ausführbare Anweisung. Umgesetzt ist nur „eine Taste tiefer/höher" –
ohne die entscheidende taktile Information, ob das Ziel schwarz oder weiß ist.

**Akzeptanzkriterien**
1. Die große Zeile nennt bei Halbtonschritten die Beschaffenheit des Ziels („die schwarze Taste links daneben", „die weiße Taste direkt darunter").
2. Die kleine Zeile bleibt der Fachbegriff (R2).
3. Korrekt für alle 12 Zieltöne, in beiden Richtungen.

---

### B-27 · Wake Lock und Querformat robust machen
**Regel:** R6, R7, Konzept §7 · **Aufwand:** klein · **Dateien:** `src/lib/audio.ts`, `src/App.tsx`, `index.html`, `public/manifest.webmanifest`

**Befund.** `requestWakeLock()` fordert die Sperre einmal an, hält den Sentinel nicht,
gibt ihn nie frei und fordert ihn nach einem Tab-Wechsel nicht erneut an – Wake Locks
werden beim Verlassen des Tabs vom Browser freigegeben. Beim Querformat ist das Manifest
bereits korrekt (`"orientation": "landscape"`), aber das greift nur in der installierten
PWA; im normalen Browser-Tab gibt es nur den Fußzeilentext „Querformat empfohlen" und
keinen Hinweis im Hochformat.

**Akzeptanzkriterien**
1. Der Wake-Lock-Sentinel wird gehalten, bei `visibilitychange` erneuert und beim Verlassen der Einheit freigegeben.
2. Im Hochformat erscheint ein Hinweis statt eines gequetschten Cockpits (Manifest bleibt wie es ist).
3. Konzept-Abnahmekriterium 5 („geht während einer Übung nicht in Standby") ist auf dem Zielgerät nachgewiesen.

---

### B-28 · Automatische Tests für die Musik-Logik
**Regel:** §5.4 · **Aufwand:** mittel · **Dateien:** neu `src/lib/*.test.ts`, `package.json`

**Befund.** Es gibt keine Tests. Jede der obigen Korrekturen betrifft Logik, die sich
nur mühsam von Hand prüfen lässt (10 Tonarten × 7 Stufen × 3 Lagen × 2 Übungen).

**Akzeptanzkriterien**
1. Testrunner eingerichtet (`vitest`), `npm test` läuft in CI-tauglicher Form.
2. Abgedeckt: `diatonicChords`, `spellTriad` (Lage, Vorzeichen, Oktavlogik), Auflösung aller 32 Akkordfolgen, `tribunal()` in allen Fällen aus B-05, Zustandsübergänge aus B-03.
3. Kein Item aus P0–P3 gilt als erledigt, ohne dass sein Kriterium hier abgesichert ist.

---

### B-29 · Aufräumen
**Regel:** §5.5 · **Aufwand:** trivial · **Dateien:** `src/pages/Home.tsx`, `src/main.tsx`, `src/lib/engine.ts`

**Befund.**
- `src/pages/Home.tsx` ist unbenutzte Vite-Boilerplate („Vite + React", Zähler-Button).
- `main.tsx` nutzt `StrictMode`: der Start-Effekt in `Session.tsx` läuft in der Entwicklung **doppelt**, `stop()` nullt `metroRef` aber nicht → zwei `Metronome`-Instanzen und zwei AudioContexts. Nur im Dev-Modus, aber es verfälscht jedes Debugging von P0.
- `(metro as unknown as { ensure: () => AudioContext }).ensure()` greift zweimal auf eine private Methode zu.
- `BrowserRouter` wird eingebunden, aber nirgends genutzt.

**Akzeptanzkriterien**
1. Boilerplate entfernt, ungenutzte Abhängigkeiten und Wrapper entfernt.
2. Doppelstart unter `StrictMode` ist idempotent (kein zweiter AudioContext).
3. Keine `as unknown as`-Zugriffe mehr; `Metronome` bietet eine öffentliche `context()`-Methode.

---

### B-30 · Speicherung: IndexedDB oder Konzeptänderung ❓
**Regel:** R24, R25, Konzept §6 · **Aufwand:** mittel · **Dateien:** `src/lib/store.ts`

**Befund.** Das Konzept schreibt IndexedDB fest; umgesetzt ist `localStorage`.
Für die aktuellen Datenmengen reicht `localStorage` vollständig aus.

**Offene Entscheidung ❓** — (a) auf IndexedDB umstellen wie im Konzept, oder
(b) `localStorage` beibehalten und das Konzept nach Regelwerk §7 anpassen.
*Empfehlung:* (b) – die Datenmenge rechtfertigt IndexedDB nicht, und `localStorage` ist
synchron und damit einfacher korrekt zu halten. **Item blockiert, bis entschieden.**

---

### B-31 · Notensystem auch in Übung 1? ❓
**Regel:** Konzept §8 Layout · **Aufwand:** mittel · **Dateien:** `src/sections/Session.tsx`

**Befund.** Konzept §8 beschreibt das Notensystem als Zentrum des Layouts. Übung 1 zeigt
heute nur Stufe, Akkordname und Vorschau – kein Notensystem. Das kann Absicht sein
(„Blind-Griff" trainiert die Mulde, nicht das Lesen) oder eine Lücke.

**Offene Entscheidung ❓** — (a) Notensystem auch in Übung 1 anzeigen (konzepttreu zum
Layout), (b) so lassen und Konzept §8 präzisieren, (c) im Setup umschaltbar.
*Empfehlung:* (b) – Übung 1 ist laut Konzept §3 ausdrücklich eine Griff-, keine
Leseübung; ein Notensystem würde den Blick binden. **Item blockiert, bis entschieden.**

---

### B-32 · Editor für eigene Akkordfolgen ❓
**Regel:** R14, Konzept §3 „Später" / §9 Roadmap · **Aufwand:** groß · **Dateien:** neu

**Befund.** Im Konzept bewusst zurückgestellt, in der Sitzung vom 17.08.2026 als Idee
wieder aufgenommen. Da Folgen nach R14 reine Daten sind, ist ein Editor technisch
überschaubar: Stufen auswählen, Reihenfolge festlegen, Name vergeben, lokal speichern.

**Skizze**
1. Eigene Folgen liegen in derselben Struktur wie die eingebauten, mit `quelle: 'eigen'`.
2. Eingabe über Stufen-Buttons (I ii iii IV V vi vii° bzw. die Moll-Vorräte aus B-19) – **keine** Klaviatur (R1).
3. Validierung nach R16: nicht auflösbare Stufen werden sofort abgewiesen.
4. Export/Import als JSON-Textfeld (kein Server, R7).
5. Eigene Folgen zählen nicht auf den offiziellen Stufen-Fortschritt.

**Offene Entscheidung ❓** — Ob das in diese Version gehört oder erst nach P0–P3.
*Empfehlung:* nach P0–P3, als erstes Item der nächsten Ausbaustufe. Der Nutzen steigt
deutlich, sobald das Moll-Vokabular (B-19) und die Auswahl-UI (B-22) stehen.

---

### B-33 · Service Worker liefert einen alten Stand aus
**Regel:** R7, §5.5 · **Aufwand:** klein · **Dateien:** `public/sw.js`, `src/main.tsx`, `vite.config.ts`

**Befund (gemessen, 18.08.2026).** `public/sw.js` beantwortet alles außer Navigationen
**Cache-first ohne Rückfrage** und trägt dabei einen festen Cache-Namen (`tribunal-v1`).
Beides zusammen heißt: Was einmal im Cache liegt, bleibt dort und wird ausgeliefert,
bis jemand den Worker von Hand abmeldet.

1. **Der Cache wird nie ausgekehrt.** `activate` löscht Caches, deren Name von `CACHE`
   abweicht – `CACHE` ist eine Konstante, also gibt es nie einen. Im gebauten Stand
   gemessen: Nach einem neuen Build liegt `assets/index-DF-OjZ9a.js` (275 kB) weiter
   neben dem neuen `assets/index-BWaKhaSc.js`. Jeder Build lässt sein Bündel liegen.
2. **Nicht gehashte Dateien frieren ein.** Für Dateien unter `assets/` ist Cache-first
   richtig: Ändert sich ihr Inhalt, ändert sich ihr Name. Alles andere behält seine
   Adresse. Gemessen am Manifest: Der Server liefert die neue Fassung, der Worker die
   vom ersten Besuch. Dasselbe gilt für die Icons und für alles, was künftig in
   `public/` dazukommt.
3. **In der Entwicklung friert die ganze App ein.** `main.tsx` registriert den Worker
   auch auf `localhost`, wo Vite ohne Inhaltshash ausliefert. Gemessen: 33 Einträge im
   Cache, darunter `/src/App.tsx`, `/src/lib/engine.ts` und `/src/sections/Home.tsx`.
   In P4 Paket 3 zeigte der Stufenplan deshalb Schlösser aus der Zeit vor P2, bis der
   Worker von Hand abgemeldet war – ein Debugging, das lügt.

Konzept §7 verlangt „vollständig offline lauffähig". Das leistet der Worker; er leistet
es nur zu dem Preis, dass ein Update nie ankommt (R7 will beides).

**Umbau**
- Der Cache-Name trägt die Kennung des Builds. Sie steht in der Adresse, mit der
  `main.tsx` den Worker registriert (`sw.js?v=…`), und der Worker liest sie aus seiner
  eigenen URL. Neuer Build → neuer Name → `activate` kehrt jeden älteren Cache aus.
  Die geänderte Adresse ist zugleich das Signal, an dem der Browser den Worker erneuert.
- **Cache-first nur für Unveränderliches**, also für alles unter `assets/` – dort
  schreibt Vite ausschließlich inhaltsgehashte Namen. Für alles Übrige gilt
  **Netz zuerst, Cache als Rückfalllinie**: online frisch, offline vollständig (R7).
- **Kein Service Worker in der Entwicklung.** Wo schon einer registriert ist, meldet
  die App ihn ab und räumt seine Caches weg, statt Handarbeit zu verlangen.
- Das Manifest bleibt unverändert (B-27).

**Akzeptanzkriterien**
1. Ein neuer Build erneuert den Cache vollständig: Nach dem Laden gibt es genau einen
   Cache, und er enthält keine Datei des vorherigen Builds.
2. Eine nicht gehashte Datei (Manifest, Icon) wird online immer in der Fassung des
   Servers ausgeliefert; offline bleibt die App vollständig lauffähig.
3. In der Entwicklung ist kein Service Worker registriert, und eine vorgefundene
   Registrierung samt Caches wird abgeräumt.

**Prüfweg (ohne MIDI, ohne Gerät)**
- AK 1/2 gegen `npm run preview`: laden, Cache auflisten, eine sichtbare Zeichenkette
  ändern, neu bauen, neu laden – die neue Zeichenkette steht da, der Cache enthält nur
  noch Dateien des neuen Builds. Für AK 2 dasselbe mit `manifest.webmanifest`, einmal
  über den Worker und einmal mit umgehender Abfrage am Worker vorbei gelesen.
- AK 3 gegen `npm run dev`: `navigator.serviceWorker.getRegistrations()` ist leer und
  `caches.keys()` enthält keinen `tribunal-`-Cache.
- Offline-Nachweis: Netz abschalten, neu laden – der Stufenplan steht.

**Anmerkung.** Ein bereits vergifteter Entwicklungsbrowser heilt sich selbst: Der
Browser prüft `sw.js` an der alten Registrierung vorbei am Netz, findet die neue
Fassung, aktiviert sie, und deren `activate` löscht `tribunal-v1`. Ein Abmelden von
Hand ist nur nötig, wenn der Browser diese Prüfung noch nicht gemacht hat.

---

## Empfohlene Reihenfolge

```
B-01 → B-02 → B-03 → B-04 → B-05 → B-06     P0, in dieser Reihenfolge
B-28 (Testrunner)                            vorziehen, sichert alles Folgende ab
B-07 → B-08 → B-09 → B-10 → B-11 → B-12      P1
B-14 → B-15 → B-17 → B-18 → B-16             P2
B-19 → B-20 → B-21 → B-22 → B-23             P3
B-24 → B-25 → B-26 → B-27 → B-29             P4
B-33                                         P5, Befund aus der Abnahme von P4
B-13, B-30, B-31, B-32                       nach Entscheidung ❓
```

**Vier offene Entscheidungen** blockieren Items: B-13 (Bassschlüssel), B-30 (IndexedDB),
B-31 (Notensystem in Übung 1), B-32 (Editor). Alle vier haben eine Empfehlung und sind
nicht dringend – die Arbeit an P0–P3 hängt nicht daran.
