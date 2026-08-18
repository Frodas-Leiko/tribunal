# Paket 3 · Auswahl und Steckbrief

**Items:** B-22 · B-23 · **Regeln:** R14, R6, R22, R8 · **Konzept:** §5.3, §10.4
**Dateien:** `src/sections/Home.tsx`, `src/components/Steckbrief.tsx`,
`src/sections/Session.tsx`, `src/index.css`
**Voraussetzung:** Paket 2 (die 32 Datensätze) · **Nachfolger:** – (P3 abgeschlossen)

---

## Ziel

32 Folgen sind im Querformat bedienbar, und zu jeder Einheit ist die Begründung in einem
Tippen da – auch währenddessen.

---

## Auftrag 1 · Auswahl-UI für 32 Folgen (B-22)

### Befund (gemessen)

Die Folgen liegen als flache Chip-Reihe in
[Home.tsx:174–188](../../src/sections/Home.tsx) (`div.setup-opts.wrap`), je Eintrag ein
Namensknopf mit Stand (B-16) und ein ⓘ-Knopf. Mit sechs Einträgen trägt das; mit 32 wird
die Setup-Karte zur Bleiwüste, und das Querformat – der einzige gestaltete Zustand nach
R6 – scrollt weg. Eine Gruppierung gibt es nicht, obwohl der Datensatz seit B-20
`kategorie` mitbringt.

### Umbau

- **Gruppierung nach Kategorie** (Kadenz · Sequenz · Moll · Pop · Blues/Jazz) mit Filter.
  Der Filter ist eine Auswahl über die fünf Kategorien plus „alle", kein Freitextfeld:
  Tippen im Setup ist erlaubt (R6), Schreiben ist umständlich.
- **Reihenfolge innerhalb der Anzeige:** Zwei-Akkord-Wippen zuerst, dann Kadenzen, dann
  der Rest. Die kürzeste sinnvolle Übung steht oben. Diese Ordnung lebt in der UI, nicht
  im Datensatz (R14: Daten bleiben Daten).
- **Je Eintrag:** Name · Stufenkette im aktiven Tongeschlecht (`i – VII – VI – V`) ·
  Steckbrief-Symbol · Ü2-Kennzeichen · Stand aus B-16 (Tempo-Level oder ✓).
- **Nicht verfügbar** bleibt sichtbar und ausgegraut, mit Begründung aus B-20 (`null`:
  „nur in Moll") bzw. B-21 (nicht auflösbare Stufe).
- Farben bleiben, was sie bedeuten (R8): Bernstein für die Auswahl, Grün für einen
  erreichten Stand, Grau für Struktur. Die Kategorie ist Struktur, keine neue Farbe.

### Akzeptanzkriterien (B-22)

1. Gruppierung nach Kategorie (Kadenz · Sequenz · Moll · Pop · Blues/Jazz) mit Filter.
2. Reihenfolge: Zwei-Akkord-Wippen zuerst, dann Kadenzen, dann der Rest.
3. Je Eintrag: Name, Stufenkette in der aktiven Tonart, Steckbrief-Symbol,
   Ü2-Kennzeichnung, Fortschritt (B-16).
4. Bedienbar im Querformat ohne vertikales Scrollen der gesamten Seite.

**Prüfweg (ohne MIDI):** Werte aus dem DOM bei geöffneter Folgen-Auswahl.

- AK 1/2: Die gerenderten Gruppen in Reihenfolge auslesen; je Filterstellung enthält die
  Liste genau die Einträge dieser Kategorie. Ohne Filter stehen die drei Wippen an den
  Positionen 1–3.
- AK 3: Je Eintrag sind alle fünf Angaben im DOM vorhanden – für eine Stichprobe in
  a-Moll und in C-Dur geprüft.
- AK 4: Viewport auf Querformat (z. B. 1024 × 600) setzen und messen:
  `document.documentElement.scrollHeight <= clientHeight` bei geöffneter Auswahl.
  Innerhalb der Liste darf gescrollt werden, die Seite nicht.

---

## Auftrag 2 · Steckbriefe für alle Folgen (B-23)

### Befund (gemessen)

- Die Texte selbst kommen mit B-20 – `logic` und `fingeringHint` sind Pflichtfelder von
  `ProgressionDef`. Zu prüfen bleibt ihre **Vollständigkeit** über alle 32 Einträge.
- Der Steckbrief ist heute **nur aus dem Setup** erreichbar
  ([Home.tsx:256–258](../../src/sections/Home.tsx)). In der laufenden Einheit gibt es
  keinen Zugang: `src/sections/Session.tsx` kennt weder `BriefOverlay` noch
  `ProgressionBrief`. Konzept §10.4 verlangt höchstens ein Tippen.
- `ProgressionBrief` ([Steckbrief.tsx:47](../../src/components/Steckbrief.tsx)) nimmt nur
  `p` und `mode`. Die **Lage** fehlt, obwohl sie seit B-08 Teil der Einheit ist und
  `KeyBrief` sie bereits erhält ([Home.tsx:252](../../src/sections/Home.tsx)).

### Umbau

- `ProgressionBrief` bekommt `anchor` und nennt die aktive Lage – dieselbe Beschriftung
  wie im Steckbrief der Tonart (`anchorLabel`).
- **Zweiter Zugang aus der laufenden Einheit.** Ein ⓘ in der Kopfzeile der Session öffnet
  denselben Steckbrief als Overlay. Bedingungen:
  - Der Takt läuft weiter. Das Overlay fasst den Zustandsautomaten nicht an – kein
    `PAUSED`, kein Timer wird gestoppt (R17, R22).
  - MIDI-Eingaben laufen unverändert in die Auswertung. Das Overlay ist eine Anzeige,
    keine Eingabeschicht.
  - Ein Tippen öffnet, ein Tippen schließt. R6 ist gewahrt: Touch ist im Steckbrief
    ausdrücklich erlaubt, die Übung selbst wird weiterhin nicht angetippt.
- Für Stufen-Einheiten zeigt derselbe Zugang den Steckbrief der Tonart – der Knopf ist
  nie tot.

### Akzeptanzkriterien (B-23)

1. Jede der 32 Folgen hat Stufenbezeichnung, harmonische Logik in einem Satz und
   Fingersatz-Hinweis.
2. Der Steckbrief ist aus der Auswahl **und** aus der laufenden Einheit in höchstens einem
   Tippen erreichbar (Konzept §10.4) – in der laufenden Einheit ohne Unterbrechung des
   Takts.
3. Der Steckbrief nennt die aktive Lage (B-08).

**Prüfweg (ohne MIDI):**

- AK 1 als Test über den Datensatz: für alle 32 Folgen sind `logic` und `fingeringHint`
  nicht leer und die Stufenkette in mindestens einem Tongeschlecht vorhanden.
- AK 2 im Demo-Modus: Einheit starten, ⓘ in der Kopfzeile tippen. Gemessen wird, dass der
  Zustand `RUNNING` bleibt, die Beat-Nummer weiterläuft und ein Anschlag während des
  offenen Overlays weiterhin bewertet wird (Serie zählt hoch).
- AK 3 aus dem DOM: Der geöffnete Steckbrief nennt die im Setup gewählte Lage; nach
  Wechsel auf `C3` bzw. `C5` steht dort der neue Wert.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien beider Aufträge einzeln nachweisbar
- [ ] Querformat bleibt der gestaltete Zustand (R6); nichts wird nur im Hochformat bedienbar
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke
- [ ] **Zwei Commits:** „B-22: Auswahl-UI für 32 Folgen (R14, R6)" und
      „B-23: Steckbriefe für alle Folgen, auch in der Einheit (Konzept §5.3, §10.4)"

---

## Abgrenzung

- **Keine virtuelle Klaviatur** (R1) – auch nicht als Vorschau eines Griffs im Steckbrief.
  Erlaubt bleiben Topographie-Band, Notensystem und Text.
- **Der Fortschritt selbst** stammt aus B-16 und wird hier nur angezeigt, nicht berechnet.
- **Notensystem in Übung 1** (B-31 ❓) und **Editor für eigene Folgen** (B-32 ❓) bleiben
  offen; beide brauchen erst eine Entscheidung nach Regelwerk §7.
- **Statistik-Ansichten** (B-24 … B-26) sind P4 und werden hier nicht angefasst.
