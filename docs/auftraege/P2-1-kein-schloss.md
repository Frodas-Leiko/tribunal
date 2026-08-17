# Paket 1 · Kein Schloss, keine feste Zahl

**Items:** B-14 · B-18 · **Regeln:** R11, R5, R4
**Dateien:** `src/sections/Home.tsx`, `src/lib/store.ts`, `src/sections/Session.tsx`
**Voraussetzung:** P1 abgeschlossen · **Nachfolger:** Paket 2

---

## Ziel

Alles ist jederzeit spielbar (R11). Der Fortschritt bleibt sichtbar und **empfiehlt**, statt
zu sperren. Dazu die triviale Korrektur der Serienanzeige, die in dieselbe Zeile gehört.

Dieses Paket fasst **keine Persistenz an**: Es liest den Fortschritt, es schreibt ihn nicht.
Damit liegt es konfliktfrei vor Paket 2, das die Speicherschicht umbaut.

---

## Auftrag 1 · Alle Stufen, Tonarten und Modi freigeben (B-14)

### Befund

Zwei Sperren, beide aus dem Freischaltkriterium von Konzept §5.1:

- [store.ts:86](../../src/lib/store.ts) `isStageUnlocked()` – Stufe *n* verlangt Stufe
  *n−1* komplett. In [Home.tsx:81](../../src/sections/Home.tsx) wird daraus
  `disabled={!unlocked}` auf jeder Tonart-Karte plus 🔒 in der Stufen-Überschrift.
- [Home.tsx:38](../../src/sections/Home.tsx) `modeBLocked` – Modus B bleibt gesperrt, bis
  Modus A steht ([Home.tsx:151](../../src/sections/Home.tsx): `disabled`, Titel „Erst
  Modus A abschließen", Beschriftung mit 🔒).

R11 hebt beides auf: Ein Schloss ist eine Belohnungsmechanik und widerspricht R5.

### Umbau

Die **Empfehlung** ersetzt die Sperre: erste nicht abgeschlossene Stufe, darin Modus A vor
Modus B, optisch markiert – als Hinweis, nicht als Zustand des Knopfes. `isStageComplete()`
bleibt, es misst (✓ je Modus, Stufe komplett). `isStageUnlocked()` wird ersatzlos entfernt;
eine Funktion, die nur noch „ja" sagen darf, ist toter Code (§5.5).

Die 🔒-Zeichen entfallen samt zugehörigem CSS (`.stage.locked`, `.stage-lock` prüfen: das
✓ nutzt dieselbe Klasse und bleibt).

### Akzeptanzkriterien (B-14)

1. Alle 5 Stufen, 10 Tonarten und Modi A/B/C sind ohne Vorbedingung wählbar; kein
   `disabled`, kein 🔒.
2. Fortschritt (Tempo-Level, ✓ je Modus) bleibt sichtbar und wird weiter geführt.
3. Die empfohlene nächste Einheit ist optisch markiert (erste nicht abgeschlossene Stufe,
   Modus A vor B) – als Hinweis, nicht als Sperre.
4. `isStageUnlocked()` ist entfernt; kein toter Code.

**Prüfweg (ohne MIDI):** Bei leerem Fortschritt lässt sich B-Dur (Stufe 5) direkt starten;
Modus B ist ohne Modus A wählbar. Die Empfehlung steht auf Stufe 1 / Modus A. Nach einem
gesetzten Fortschritt wandert die Empfehlung mit.

---

## Auftrag 2 · Serien-Anzeige aus der Konstante (B-18)

### Befund

[Session.tsx:71](../../src/sections/Session.tsx) zeigt `Serie: {streak}/8` mit hart
kodierter 8, obwohl `PASS_STREAK` in [store.ts:33](../../src/lib/store.ts) existiert und
die Engine in [engine.ts:202](../../src/lib/engine.ts) danach entscheidet. Eine Änderung
der Konstante ließe Anzeige und Messung auseinanderlaufen (R4).

### Akzeptanzkriterium (B-18)

Die Anzeige nutzt `PASS_STREAK`; eine Änderung der Konstante wirkt überall.

Ebenfalls zu prüfen, weil es dieselbe Zahl ist: die Banner-Texte in
[engine.ts:218](../../src/lib/engine.ts) („Serie geschafft – 8 in Folge") und der
Einleitungstext im Stufenplan ([Home.tsx:73](../../src/sections/Home.tsx): „je 8
fehlerfreie Wiederholungen").

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien einzeln nachweisbar
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Zwei Commits:** „B-14: Alle Stufen, Tonarten und Modi freigeben (R11)" und
      „B-18: Serien-Anzeige aus PASS_STREAK (R4)"

---

## Abgrenzung

- **Kein Schreibzugriff auf den Fortschritt.** `passTempo()`, `registerSuccess()` und der
  direkte `localStorage`-Zugriff in `engine.ts` gehören zu Paket 2.
- Der Fortschritt für Akkordfolgen und Modus C fehlt weiterhin (**B-16**, Paket 3). Die
  Folgen-Auswahl bleibt in diesem Paket unverändert.
- `levelTempo` für Modus C steht weiterhin hart auf 60
  ([Home.tsx:41–49](../../src/sections/Home.tsx)) – ebenfalls B-16.
