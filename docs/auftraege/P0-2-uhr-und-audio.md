# Paket 2 · Uhr und Audio: der Stillstand selbst

**Items:** B-01 · B-02 · **Regeln:** R18, R19, R17
**Dateien:** `src/lib/audio.ts`, `src/sections/Home.tsx`, `src/App.tsx`,
`src/sections/Session.tsx`, `src/lib/engine.ts`
**Voraussetzung:** Paket 1 (Testrunner) · **Nachfolger:** Paket 3

---

## Ziel

Der `AudioContext` entsteht in einer echten Nutzergeste und läuft; der Scheduler startet nie
in der Vergangenheit. Das sind zusammen die wahrscheinlichsten Auslöser des vollständigen
Stillstands nach einer Fehleingabe.

Beide Items greifen in dieselbe Methode (`Scheduler.start()`) und dieselbe Aufrufkette
(`tryResume` → `new Scheduler` → `start`). Einzeln gebaut bleibt jeweils die Hälfte des
Hängers stehen, deshalb ein Paket – aber **zwei Commits**.

---

## Auftrag 1 · AudioContext nur in echter Nutzergeste (B-01)

### Befund (verifiziert)

[Session.tsx:18-22](../../src/sections/Session.tsx) startet die Einheit in
`useEffect(..., [])`. Darin entsteht `new Metronome()` und – über
`(metro as unknown as { ensure: () => AudioContext }).ensure()` in
[engine.ts:421](../../src/lib/engine.ts) – der `AudioContext`. Das liegt **nicht** im
Callstack eines Klicks.

Auf Tablets (iPadOS/Safari, teils Chrome Android) bleibt der Kontext dann `suspended`.
`Scheduler.tick()` prüft `while (this.nextTime < ctx.currentTime + 0.12)`
([audio.ts:83](../../src/lib/audio.ts)) – steht `ctx.currentTime` still, feuert der Scheduler
nach wenigen Events **nie wieder**: Cursor eingefroren, keine Auswertung, kein Metronom.
Die App wirkt tot, obwohl React lebt.

`tryResume()` ruft `ensure()` zusätzlich aus einem `setTimeout` heraus
([engine.ts:385](../../src/lib/engine.ts), aufgerufen aus dem Timer in
[engine.ts:497](../../src/lib/engine.ts)) – ebenfalls außerhalb jeder Geste.

### ⚠ Wichtig: die Geste liegt nicht in `Session.tsx`

Der Backlog nennt als Dateien nur `audio.ts`, `Session.tsx` und `engine.ts`. Das reicht nicht.
Der Button „Einheit starten" steht in [Home.tsx:209](../../src/sections/Home.tsx); `Session`
wird erst danach von [App.tsx:37](../../src/App.tsx) gemountet. Im Moment des Mountens ist die
Nutzergeste bereits vorbei.

AK 1 („ausschließlich im `onClick` von *Einheit starten*") ist also nur erfüllbar, wenn der
Kontext in `Home.tsx` erzeugt und durchgereicht wird. Zwei gangbare Wege:

- **(a) Durchreichen** – `Home.onClick` erzeugt den `AudioContext`, gibt ihn über
  `onStart` an `App` und von dort an `Session`/`useSession`. Wörtlich konform zu AK 1.
- **(b) ARMED-Geste in der Session** – `Session` zeigt vor dem Start eine Schaltfläche, deren
  `onClick` den Kontext erzeugt. R6 („während einer laufenden Einheit wird nichts angetippt")
  ist gewahrt, weil die Einheit noch nicht läuft; deckt sich zudem mit dem `ARMED`-Zustand
  aus R17 und damit mit Paket 3.

**Empfehlung: (a).** Es erfüllt AK 1 wörtlich und kostet die Einheit keinen zusätzlichen Tap.
Falls (b) gewählt wird, ist das in `docs/Backlog.md` bei B-01 zu vermerken.

### Akzeptanzkriterien (aus dem Backlog)

1. Der `AudioContext` wird ausschließlich im `onClick` von „Einheit starten" erzeugt und
   `resume()`-t.
2. Ist `ctx.state !== 'running'`, zeigt die Session einen sichtbaren, antippbaren Hinweis
   („Audio blockiert – zum Aktivieren tippen") und startet erst danach.
3. `visibilitychange` auf sichtbar prüft und reaktiviert den Kontext.
4. `metroRef` wird in `stop()` genullt; ein zweiter `start()` erzeugt keinen zweiten Kontext.
5. Nachweis: Einheit auf dem Tablet starten, Tab wechseln, zurückkehren – Takt läuft weiter
   oder meldet sich sichtbar zurück.

### Anmerkungen

- **AK 4 hängt an `StrictMode`.** [main.tsx](../../src/main.tsx) nutzt `StrictMode`, der
  Start-Effekt läuft in der Entwicklung doppelt. Ohne AK 4 entstehen zwei `Metronome` und
  zwei `AudioContext`s – das verfälscht jede Messung in Paket 3. AK 4 ist damit kein
  Nebenpunkt, sondern Voraussetzung für den Rest von P0.
- **`as unknown as` entfällt zwangsläufig.** Sobald der Kontext von außen kommt, muss
  `Metronome` ihn öffentlich annehmen oder herausgeben. Die beiden Zugriffe auf die private
  `ensure()` ([engine.ts:385](../../src/lib/engine.ts) und
  [engine.ts:421](../../src/lib/engine.ts)) verschwinden dabei. Das ist Teil von B-29 AK 3,
  hier aber unvermeidbar – im Commit erwähnen, den Rest von B-29 **nicht** mitnehmen.
- **AK 5 braucht Hardware.** Regelwerk §5.3 lässt das zu, wenn der Prüfweg beschrieben ist:
  Einheit starten → Tab wechseln → mindestens 5 s warten → zurückkehren. Erwartung: Takt läuft
  weiter, oder der Hinweis aus AK 2 steht sichtbar. Kein stummer Stillstand.

---

## Auftrag 2 · Scheduler nie in der Vergangenheit starten (B-02)

### Befund (verifiziert)

In `tryResume()` wird der Scheduler auf `noteAudio = (t0 − perfOffset) / 1000` gestartet
([engine.ts:387-394](../../src/lib/engine.ts)). `t0` ist der Zeitpunkt des Anschlags und liegt
beim Aufruf bereits mindestens `RESUME_WINDOW` = 260 ms zurück – der Aufruf kommt aus einem
`setTimeout` mit genau dieser Verzögerung ([engine.ts:497-500](../../src/lib/engine.ts)).

`Scheduler.start()` setzt `nextTime` damit in die Vergangenheit
([audio.ts:76](../../src/lib/audio.ts)); der erste `tick()` feuert die `while`-Schleife
sofort mehrfach durch – ein **Burst von Nachhol-Events**. Folgen:

- Doppelklick im Metronom: `const t = Math.max(time, ctx.currentTime)`
  ([audio.ts:25](../../src/lib/audio.ts)) staucht alle Nachhol-Klicks auf „jetzt"
- Cursor springt: `clockRef` wird auf ein längst vergangenes Segment gesetzt
- die Subdivisions-Anzeige steht auf dem falschen Feld

Genau das ist der „gestörte Anzeige-Ablauf" nach dem Wiedereinstieg.

### Akzeptanzkriterien (aus dem Backlog)

1. Der Startzeitpunkt wird in ganzen Intervallschritten vorgeschoben, bis er ≥
   `ctx.currentTime` liegt; `beatBaseRef` wird um die übersprungenen Beats korrigiert.
2. `Metronome.click()` verwirft Zeitpunkte, die mehr als 20 ms in der Vergangenheit liegen,
   statt sie auf „jetzt" zu stauchen.
3. Nach jedem Wiedereinstieg zeigt der Subdivisions-Balken das Segment `1` und der Cursor
   startet links.
4. Nachweis im Demo-Modus: 20 Fehler-/Wiedereinstiegszyklen hintereinander ohne Doppelklick
   und ohne Cursor-Sprung.

### Anmerkungen

- **AK 1 gehört in `Scheduler.start()`, nicht in `tryResume()`.** Der Scheduler kennt sein
  Intervall selbst; die übersprungenen Schritte muss er nach außen melden, damit die
  Beat-Nummerierung korrigierbar ist. Ein Rückgabewert (Anzahl übersprungener Intervalle)
  ist der einfachste Weg – er ist zudem ohne DOM testbar.
- **Diese Rückgabe ist der Testfall.** `Scheduler.start()` mit einem Stub-Kontext, dessen
  `currentTime` fest steht: Start 500 ms in der Vergangenheit bei 250 ms Intervall ergibt
  2 übersprungene Schritte und einen Startzeitpunkt in der Zukunft. Damit ist AK 1 ohne
  Hardware nachweisbar (Regelwerk §5.3).
- **AK 3 und 4 sind Demo-Modus-Nachweise.** Die Demo-Tastatur liegt in
  [midi.ts:14-18](../../src/lib/midi.ts) (`A W S E D F T G Z H U J K`).
- **`RESUME_WINDOW` nicht antasten.** Das Sammelfenster wird in Paket 3 (B-04) durch ein
  dynamisches ersetzt. Hier wird nur die Folge des Verzugs behandelt, nicht der Verzug selbst.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` laufen ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien beider Aufträge einzeln nachweisbar
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Zwei Commits**: „B-01: AudioContext nur in echter Nutzergeste (R18)" und
      „B-02: Scheduler nie in der Vergangenheit starten (R19)"
- [ ] Weicht die Umsetzung von B-01 vom Weg (a) ab, ist das in `docs/Backlog.md` vermerkt

## Abgrenzung

**Nicht anfassen** – gehört zu Paket 3 oder späteren Prioritäten:

- Zustandsautomat, `pausedRef`, `evalTimersRef`, `resumeTimerRef` → Paket 3 (B-03)
- Sammelfenster, `RESUME_WINDOW`, `WINDOW`, `EVAL_DELAY` → Paket 3 (B-04)
- Banner- und Feedback-Lebensdauer → Paket 3 (B-06)
- `requestWakeLock()` – hält den Sentinel nicht → **B-27** (P4), trotz Nähe zu diesem Paket
- Boilerplate, `BrowserRouter` → **B-29** (P4)

Die Berührung mit Paket 3 ist real: beide fassen `tryResume()` an. Deshalb diese Reihenfolge –
Paket 3 baut auf einem Scheduler auf, der bereits sauber startet.
