# Paket 1 · Messqualität: Griff und Zeit, Akkord und Finger

**Items:** B-24 · B-25 · **Regeln:** R26, R27, R25, R4 · **Konzept:** §6, §4.1
**Dateien:** `src/lib/store.ts`, `src/lib/engine.ts`, `src/lib/music.ts`,
`src/sections/Stats.tsx`, `src/lib/store.test.ts`
**Voraussetzung:** P3 abgeschlossen · **Nachfolger:** Paket 2 (B-26 · B-27)

---

## Ziel

Die Akte des Tribunals trennt, was verschieden ist: den Griff von der Zeit und den
Akkord vom Finger. Erst dann misst die Heatmap Griffe, die Drift-Linie Zeit – und
Modus C gewichtet nach dem, was tatsächlich danebengeht.

---

## Auftrag 1 · Timing-Fehler sind keine Akkordfehler (B-24)

### Befund (gemessen)

`evaluate()` bewertet den Anschlag und legt das Ergebnis in einer Variablen ab, die
danach niemand mehr liest:

- [engine.ts:318](../../src/lib/engine.ts) setzt `pitchOk = allHit && noExtra` – die
  reine Tonhöhen-Aussage.
- [engine.ts:343](../../src/lib/engine.ts) und [engine.ts:347](../../src/lib/engine.ts)
  setzen sie im Timing- bzw. Register-Zweig auf `false` zurück. **Beide Zuweisungen
  sind tot:** Nach Zeile 347 wird `pitchOk` nicht mehr gelesen.
- Was tatsächlich in die Akte geht, entsteht in
  [engine.ts:355](../../src/lib/engine.ts): `const success = feedback.kind === 'ok'`.
  Dieser eine Wahrheitswert wird in [engine.ts:358](../../src/lib/engine.ts) als
  Parameter `pitchOk` an `recordAttempt()` übergeben.

Damit landet ein Anschlag mit **korrekten Tönen außerhalb des Toleranzfensters**
(`kind: 'timing'`) in der Fehler-Heatmap der Akkorde. Das ist genau der Fall, den R26
ausschließt. Die Folgen reichen weiter als die Anzeige: `weaknessWeights()`
([store.ts:324](../../src/lib/store.ts)) gewichtet Modus C mit `errors[…].total` –
Modus C übt also Akkorde, deren Griff sitzt und deren Timing nicht sitzt.

Zwei weitere Aufrufer schreiben in dieselbe Akte, beide ohne gemessene Zeit:
[engine.ts:492](../../src/lib/engine.ts) (gelungener Wiedereinstieg) und
[engine.ts:541](../../src/lib/engine.ts) (Fehlversuch bei stehender Uhr) übergeben
`timingOffset = null`.

### Umbau

- `recordAttempt()` bekommt statt des einen Wahrheitswerts zwei Felder: **`griffOk`**
  (Tonhöhenklassen und – in Übung 2 – die Zone) und **`timingOk`**. `timingOk` ist
  `boolean | null`; `null` heißt „nicht gemessen" und gilt für die beiden Aufrufer bei
  stehender Uhr. Ein nicht gemessener Wert ist kein bestandener Wert (R4).
- Die **Zone zählt zum Griff**, nicht zur Zeit: Ein Block in der falschen Oktave ist ein
  Platzierungsfehler der Hand (R13). Der neue Name `griffOk` sagt das, wo `pitchOk` es
  verschwieg; die beiden toten Zuweisungen werden dadurch wieder gelesen.
- `errors` zählt nur noch Griff-Fehler. `timing` bleibt, was es ist.
- `weaknessWeights()` liest ausschließlich Griff-Fehler (AK 3) – ohne Änderung der
  Signatur, weil `errors` künftig nichts anderes mehr enthält.
- `Stats.tsx` schlüsselt die Kennzahl auf: „Trefferquote (Ton + Zeit)" bleibt stehen
  und bekommt darunter beide Anteile („Griff x %", „Zeit y %"). Nüchtern, mit Zahl
  (R4, R5).
- Schema-Version nach R25 hochziehen (`SCHEMA_VERSION`,
  [store.ts:59](../../src/lib/store.ts)) und in `migrateStats()`
  ([store.ts:193](../../src/lib/store.ts)) einen Pfad ergänzen. Alte Datensätze zählen
  ihre bisherigen `errors` weiter – sie enthalten vermischte Ursachen, aber kein
  Datensatz wird gelöscht.

### Akzeptanzkriterien (B-24)

1. `recordAttempt()` unterscheidet `griffOk` und `timingOk` als getrennte Felder.
2. Die Heatmap zeigt ausschließlich Griff-Fehler, die Drift-Linie ausschließlich Zeit.
3. Modus C gewichtet nur nach Griff-Fehlern.
4. Die Kennzahl „Trefferquote (Ton + Zeit)" bleibt erhalten und wird zusätzlich in
   beide Anteile aufgeschlüsselt.

**Prüfweg (ohne MIDI):**

- AK 1/3 als Test über `store.ts`: Ein Anschlag mit `griffOk: true, timingOk: false`
  erhöht `attempts`, lässt `errors` unberührt und ändert `weaknessWeights()` nicht.
  Ein Anschlag mit `griffOk: false` erhöht genau einen Heatmap-Eintrag.
- AK 2/4 im Demo-Modus: Eine Einheit mit ±20 ms Toleranz spielen, absichtlich richtig
  greifen und zu spät landen. In der Statistik steigt die Drift-Linie, die Heatmap
  bleibt leer, und die aufgeschlüsselte Quote zeigt Griff 100 %.
- R25: Test mit einem Datensatz der Vorgängerversion – Status `migriert`, `attempts`
  und `errors` unverändert übernommen.

---

## Auftrag 2 · Fehlerhistorie finger-aufgelöst (B-25)

### Befund (gemessen)

Die Information, die R27 verlangt, wird berechnet und weggeworfen:

- `tribunal()` ([music.ts:711](../../src/lib/music.ts)) kennt den Finger. In
  [music.ts:725](../../src/lib/music.ts) steht er als `best.idx`, in
  [music.ts:741](../../src/lib/music.ts) als `missing[0].idx`; beide fließen nur in den
  **Text** der Meldung (`FINGER_NAMES[idx]`).
- `TribunalVerdict` ([music.ts:689](../../src/lib/music.ts)) gibt `big`, `small` und
  `direction` zurück – den Index nicht.
- [engine.ts:350](../../src/lib/engine.ts) übernimmt entsprechend nur `vec.direction` –
  ebenso die zweite Auswertung bei stehender Uhr in
  [engine.ts:538](../../src/lib/engine.ts).
- `ChordError` ([store.ts:30](../../src/lib/store.ts)) zählt `high`/`low`/`total` je
  `${keyId}|${chordName}`. Kein Finger, keine Größe der Abweichung – nur ihre Richtung.

Konzept §6 verlangt „pro Akkord **und Finger** … Abweichungen (Richtung, Halbtöne)".
Gespeichert wird heute weniger, als das Tribunal in derselben Sekunde bereits weiß.

### Umbau

- `TribunalVerdict` trägt zusätzlich `finger: 0 | 1 | 2 | null` und `halbtoene: number`
  (0, wenn ohne Vektor). `null` gilt für Urteile ohne Finger – „Ein Ton zu viel",
  „Akkord nicht gefunden" und die Zonen-Meldung aus Übung 2, bei der der ganze Block
  am falschen Ort liegt.
- `ChordError` wird finger-aufgelöst: je Tonart, Akkord und Finger Richtung **und**
  Größe. Die Aggregation je Akkord bleibt daraus ableitbar – die Heatmap zeigt weiter
  Akkorde, die Fingerzeile kommt darunter.
- `weaknessWeights()` summiert über die Finger; Modus C bleibt in seiner Wirkung
  unverändert, außer dass die Zahlen jetzt sauber sind (Ergebnis aus Auftrag 1).
- `Stats.tsx` zeigt zusätzlich, welcher Finger am häufigsten danebengreift – als Zeile
  mit Zahl, nicht als Grafik ohne Maß (R4, R5).
- Wieder eine Schema-Version nach R25. Alte, nicht finger-aufgelöste Einträge werden
  übernommen und dem Finger `null` zugeordnet; sie verschwinden nicht und behaupten
  auch nichts, was sie nicht wissen.

### Akzeptanzkriterien (B-25)

1. Gespeichert wird je Tonart, Akkord und Finger die Richtung und Größe der Abweichung.
2. Die Statistik zeigt, welcher Finger am häufigsten danebengreift.
3. Migration bestehender Daten nach R25, ohne Verlust.

**Prüfweg (ohne MIDI):**

- AK 1 als Test über `tribunal()` und `recordAttempt()`: Der Griff `D – Fis – B` statt
  `D – Fis – A` schreibt einen Eintrag für Finger 5 (Quinte), Richtung `+1`, Größe 1.
  Die bestehenden Tribunal-Tests aus B-05 bleiben gültig; sie prüfen die Texte, die
  hier nicht angefasst werden.
- AK 2 im Demo-Modus: Zwei verschiedene Fehlgriffe auf demselben Akkord, danach nennt
  die Statistik den häufigeren Finger mit seiner Zahl.
- AK 3 als Test: Ein Datensatz der Vorgängerversion lädt mit Status `migriert`; seine
  Summen je Akkord stimmen vor und nach der Migration überein.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien beider Aufträge einzeln nachweisbar
- [ ] Migrationspfad je Schemawechsel getestet; kein Fortschritt geht stumm verloren (R25)
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Zwei Commits:** „B-24: Timing-Fehler sind keine Akkordfehler (R26)" und
      „B-25: Fehlerhistorie finger-aufgelöst (R27, Konzept §6)"

---

## Abgrenzung

- **Der Text der Meldungen** bleibt unverändert. Die schwarze bzw. weiße Taste in der
  großen Zeile ist B-26 und damit Paket 2.
- **Die Anzeige der Subdivisions-Leiste** wird nicht angefasst; die Drift-Punkte dort
  stammen aus `hud.offsets` und sind von der gespeicherten Statistik unabhängig.
- **Der Fortschritt** (`Progress`, B-16) ist ein anderer Datensatz und ändert sich
  nicht. Nur `StatsData` bekommt neue Versionen.
- **B-30 ❓ (IndexedDB)** bleibt offen. Beide Aufträge laufen über `store.ts` (R24) und
  machen die Entscheidung nicht schwerer.
