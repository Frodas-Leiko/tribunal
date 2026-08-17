# Paket 3 · Zustand, Sammelfenster, Bildschirm

**Items:** B-03 · B-04 · B-06 · **Regeln:** R17, R20, R21, R22, R6
**Dateien:** `src/lib/engine.ts` (Hauptlast), `src/sections/Session.tsx`
**Voraussetzung:** Paket 1 und Paket 2 · **Nachfolger:** P1 (B-07 ff.)

---

## Ziel

Ein expliziter Zustandsautomat, ein dynamisches Sammelfenster für Anschläge und ein
Bildschirm, auf dem nichts stehen bleibt. Das ist der größte Umbau in P0.

Die drei Items sind nicht trennbar, weil sie in derselben Funktion zusammenlaufen:
B-03 AK 2 verlangt, dass jeder Übergang den *Notenpuffer* aufräumt – das ist der Puffer, den
B-04 neu definiert. B-06 AK 3 („beim Übergang nach `RUNNING` wird veraltetes Feedback
verworfen") ist eine Zeile *innerhalb* der Übergangsfunktion aus B-03. Getrennt gebaut hieße:
dieselbe Funktion dreimal schreiben.

**Reihenfolge im Chat:** erst B-03 (das Gerüst), dann B-04 (das Fenster darin), dann B-06
(die Anzeige-Lebensdauer). Drei Commits (Regelwerk §5.6).

---

## Auftrag 1 · Ein Zustandsautomat für die Session (B-03)

### Befund (verifiziert)

Der Zustand liegt heute verstreut in `pausedRef`, `schedRef`, `clockRef.active`, `hud.paused`,
`resumeTimerRef`, `skipEvalBeatRef`, `evalTimersRef`, `currentBeatRef`, `beatBaseRef`
([engine.ts:73-93](../../src/lib/engine.ts)). Einzelne Pfade räumen nur einen Teil davon auf:

- `pauseSession()` ([engine.ts:179-187](../../src/lib/engine.ts)) löscht **nicht**
  `resumeTimerRef` – `stop()` ([engine.ts:481](../../src/lib/engine.ts)) tut es, `pauseSession`
  nicht. Ein beim Pausieren laufender Wiedereinstiegs-Timer feuert also in den neuen Zustand
  hinein.
- `evalTimersRef` wächst unbegrenzt: Timer-IDs werden in
  [engine.ts:351](../../src/lib/engine.ts) angehängt, aber nur bei Pause/Stop entfernt – nie
  nach dem Feuern.

Jede neue Bedingung erzeugt hier einen neuen Sonderfall.

### Akzeptanzkriterien (aus dem Backlog)

1. Es existiert ein expliziter Zustand `IDLE | ARMED | RUNNING | PAUSED | ENDED` mit genau
   einer Übergangsfunktion.
2. Jeder Übergang räumt Scheduler, Auswerte-Timer, Wiedereinstiegs-Timer, Notenpuffer und Uhr
   vollständig auf.
3. `evalTimersRef` enthält nach jedem Beat nur noch nicht gefeuerte Timer.
4. Es gibt keinen Pfad, der `pausedRef` setzt, ohne über die Übergangsfunktion zu laufen.
5. Nachweis: Ein Test schaltet 200 zufällige Übergänge durch, ohne dass Timer überleben.

### Anmerkungen

- **`ARMED` gegen `PAUSED` unterscheiden.** Beide stehen still und beide prüfen den
  Wiedereinstieg (R17-Tabelle), sind aber nicht dasselbe: `ARMED` ist der Start vor dem ersten
  Anschlag, `PAUSED` der Halt nach einem Fehler. Heute wird beides über dasselbe
  `pausedRef = true` abgebildet; die Anzeige unterscheidet sie behelfsmäßig über
  `hud.feedback?.kind !== 'info'` ([Session.tsx:60](../../src/sections/Session.tsx)). Nach dem
  Umbau leitet sich die Anzeige aus dem Zustand ab, nicht aus der Feedback-Art.
- **AK 5 ist ohne DOM testbar.** Die Übergangsfunktion muss dafür aus dem Hook heraus
  erreichbar sein – entweder als reine Funktion mit übergebenem Ressourcen-Bündel oder als
  eigenes Modul. Wird sie in `useSession` eingeschlossen, ist AK 5 nicht erfüllbar.
  Der Testrunner steht seit Paket 1.
- **AK 2 nennt den Notenpuffer.** Dessen Definition ändert Auftrag 2. Der Automat wird also
  zuerst gegen den heutigen Puffer gebaut und in Auftrag 2 mitgezogen – oder Auftrag 2 wird
  in derselben Sitzung direkt anschließend gebaut. Zweiteres ist der Grund für diesen Schnitt.

---

## Auftrag 2 · Anschlagserfassung als dynamisches Sammelfenster (B-04)

### Befund (verifiziert)

Der Wiedereinstieg sammelt starr `[t0 − 30 ms, t0 + 260 ms]` ab dem **ersten** Ton
([engine.ts:362](../../src/lib/engine.ts)) und leert danach den Puffer bis `t0 + 260`
([engine.ts:364](../../src/lib/engine.ts)).

Ein leicht gerollter Akkord, ein verrutschter Finger oder ein schneller Zweitversuch fallen
damit in **einen** Versuch zusammen und werden zwangsläufig als falsch gewertet – der zweite,
korrekte Versuch ist bereits weggeräumt. Für den Nutzer sieht das aus wie „reagiert nicht
mehr".

Dieselbe Starrheit gilt für die laufende Auswertung: `WINDOW` = 170 ms und `EVAL_DELAY` =
170 ms sind Konstanten ([engine.ts:66-67](../../src/lib/engine.ts)) – tempo- und
toleranzunabhängig. Bei ±20 ms Toleranz arbeitet die Bewertung mit demselben Fenster wie bei
±50 ms, was R21 ausdrücklich verbietet.

### Akzeptanzkriterien (aus dem Backlog)

1. Ein Akkord gilt als abgeschlossen, wenn 80 ms lang kein weiterer Ton folgt – Obergrenze
   300 ms und nie mehr als die halbe Beat-Dauer.
2. Ein falscher Ton beendet den Versuch nicht sofort; bewertet wird erst nach Fensterende.
3. Auswerte- und Toleranzfenster leiten sich aus Beat-Dauer und gewählter Toleranz ab (R21).
4. Nachweis im Demo-Modus: Akkord mit 120 ms Rollzeit greifen → wird als **ein** korrekter
   Akkord gewertet.
5. Nachweis: Zwei Versuche im Abstand von 400 ms werden als zwei getrennte Versuche gewertet.

### Anmerkungen

- **Ein Sammelmechanismus für beide Pfade.** Heute gibt es zwei getrennte Filterungen des
  Puffers – im laufenden Betrieb `evaluate()` ([engine.ts:193-194](../../src/lib/engine.ts))
  und beim Wiedereinstieg `tryResume()` ([engine.ts:362-364](../../src/lib/engine.ts)) – mit
  unterschiedlichen Fenstern und unterschiedlicher Leer-Logik. Beide auf denselben
  Mechanismus zu ziehen ist der Kern dieses Auftrags; zwei parallele Fenster-Logiken erzeugen
  genau die Klasse von Fehlern, die P0 beseitigen soll.
- **Die 300-ms-Obergrenze rechtfertigt AK 5.** 400 ms Abstand liegen sicher jenseits der
  Deckelung, damit ist die Trennung in zwei Versuche deterministisch prüfbar.
- **AK 4 und 5 sind mit der Demo-Tastatur reproduzierbar**
  ([midi.ts:14-18](../../src/lib/midi.ts)); die Sammel-Logik selbst sollte zusätzlich als
  reine Funktion über einer Liste von `NoteEvent`s testbar sein – dann sind AK 1, 4 und 5
  auch ohne Tastendruck abgesichert.
- **Ein Rest bleibt bewusst liegen.** `evaluate()` setzt bei korrekten Tönen außerhalb der
  Toleranz `pitchOk = false` ([engine.ts:239](../../src/lib/engine.ts)) und verschmutzt damit
  die Fehler-Heatmap. Das ist **B-24** (P4) und wird hier **nicht** mitgenommen, auch wenn die
  Zeile direkt danebensteht.

---

## Auftrag 3 · Kein Bildschirmzustand bleibt stehen (B-06)

### Befund (verifiziert)

Das Erfolgs-Banner wird mit `banner: banner ?? h.banner`
([engine.ts:266](../../src/lib/engine.ts), ebenso
[engine.ts:401](../../src/lib/engine.ts)) festgehalten und verschwindet **nur** durch einen
Klick auf „Weiter" ([Session.tsx:105-110](../../src/sections/Session.tsx)) – mitten in einer
Übung, in der laut Konzept §7 nichts angetippt wird. Ein Zustand, den nur ein Tap auflösen
kann, verletzt R6 und R22 ausdrücklich.

Gleichzeitig bleibt das `feedback` von **vor** der Pause sichtbar: `onEvent` übernimmt es mit
`feedback: h?.feedback ?? null` ([engine.ts:333](../../src/lib/engine.ts)) unverändert in den
neuen HUD-Zustand. Nach dem Wiedereinstieg steht also noch die alte Fehlermeldung.
Zusammen wirkt das wie ein eingefrorener Bildschirm.

### Akzeptanzkriterien (aus dem Backlog)

1. Banner verschwinden automatisch nach 4 s oder mit dem nächsten Anschlag; der
   „Weiter"-Button ist optional, nicht notwendig.
2. Ein Banner überlagert nie die Tribunal-Zeile und blockiert nie die Eingabe.
3. Beim Übergang nach `RUNNING` wird veraltetes Feedback verworfen.
4. Der Pausen-Hinweis nennt immer den aktuell erwarteten Akkord und verschwindet mit dem
   Wiedereinstieg.

### Anmerkungen

- **AK 3 gehört in die Übergangsfunktion aus Auftrag 1**, nicht in `onEvent`. Das ist der
  Grund, warum B-06 in diesem Paket liegt.
- **AK 1 erzeugt einen weiteren Timer** – der unterliegt AK 2 aus Auftrag 1 und muss von der
  Übergangsfunktion mit aufgeräumt werden. Kein separater, frei laufender `setTimeout`.
- **AK 2 ist auch eine CSS-Frage.** Die Klassen `.banner` und `.paused-chip` liegen in
  `src/App.css` bzw. `src/index.css`; prüfen, ob das Banner die Tribunal-Zeile tatsächlich
  überlagert, statt es nur im Markup zu verschieben.
- **R5 beachten:** Das Banner bleibt nüchtern. Keine Feier, kein Ausrufezeichen mehr als
  nötig – die Serienanzeige ist ein Messwert.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` laufen ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien aller drei Aufträge einzeln nachweisbar
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Drei Commits**: „B-03: Zustandsautomat für die Session (R17)",
      „B-04: dynamisches Sammelfenster (R20, R21)", „B-06: Bildschirmzustände mit
      Lebensdauer (R22, R6)"
- [ ] Abschluss-Nachweis für ganz P0: 20 Fehler-/Wiedereinstiegszyklen im Demo-Modus ohne
      Hänger, ohne Doppelklick, ohne stehengebliebene Meldung

## Abgrenzung

**Nicht anfassen** – gehört zu späteren Prioritäten, auch wenn es direkt danebensteht:

- `engine.ts:161` – direkter `localStorage`-Zugriff in `registerSuccess()` → **B-17** (P2)
- `engine.ts:154-176` – `registerSuccess()` zählt nur bei `tempoRef === levelTempo` → **B-15** (P2)
- `engine.ts:219-227` und `engine.ts:373-378` – Register-Prüfung über Mittelwerte → **B-12** (P1)
- `engine.ts:239` – Timing-Fehler als Akkordfehler → **B-24** (P4)
- `engine.ts:428` – `filter(Boolean)` auf Stufenauflösung → **B-21** (P3)
- `Session.tsx:40` – `/8` hart kodiert → **B-18** (P2)
- `zoneOf(spelled[1].diatonic)` in `engine.ts:321` – Zone aus der Terz geraten → **B-10** (P1)

`engine.ts` wird in diesem Paket großflächig umgebaut. Die Versuchung, „das eine noch schnell
mit" zu erledigen, ist entsprechend groß – Regelwerk §5.6 verbietet es, und §6 verbietet den
Neubau: bestehende Module werden korrigiert und erweitert, nicht ersetzt.
