# Paket 2 · Anweisung und Gerät

**Items:** B-26 · B-27 · **Regeln:** R2, R23, R6, R7, R9 · **Konzept:** §4.1, §7, §10.5
**Dateien:** `src/lib/music.ts`, `src/lib/music.test.ts`, `src/lib/audio.ts`,
`src/lib/engine.ts`, `src/App.tsx`, `src/index.css`
**Voraussetzung:** Paket 1 (B-24 · B-25) · **Nachfolger:** Paket 3 (B-29)

---

## Ziel

Die große Zeile sagt, wohin die Hand greift – schwarz oder weiß, nicht nur höher oder
tiefer. Und das Gerät bleibt wach und im Querformat, solange geübt wird.

---

## Auftrag 1 · Das Tribunal nennt schwarze und weiße Tasten (B-26)

### Befund (gemessen)

Konzept §4.1 nennt als Beispiel für eine ausführbare Anweisung ausdrücklich „die
schwarze Taste links daneben". Umgesetzt ist die halbe Auskunft:

- [music.ts:732](../../src/lib/music.ts) baut die große Zeile als
  `${FINGER_NAMES[idx]}: ${tasterWord} ${diff > 0 ? 'tiefer' : 'höher'}` – Richtung und
  Anzahl, ohne die Beschaffenheit des Ziels.
- Die Zutat liegt bereit: `NATURAL_PC` ([music.ts:23](../../src/lib/music.ts)) nennt die
  sieben klingenden Naturtöne. Was nicht darin steht, ist eine schwarze Taste.
- Die Backlog-Zeile nennt als Datei `src/lib/engine.ts`. Das trifft nicht mehr zu:
  `tribunal()` steht seit B-05 in [music.ts:711](../../src/lib/music.ts); die Engine
  ruft es in [engine.ts:349](../../src/lib/engine.ts) und
  [engine.ts:537](../../src/lib/engine.ts) nur auf.

Für den Blind-Griff ist das der entscheidende Unterschied: „eine Taste höher" zwingt
zum Hinsehen, „die schwarze Taste direkt darüber" ist taktil ausführbar (R2 groß).

### Umbau

- Die große Zeile nennt bei **Halbtonschritten** die Beschaffenheit des Ziels: „die
  schwarze Taste links daneben" bzw. „die weiße Taste direkt darüber". Bei größeren
  Abständen bleibt die Zählform („2 Tasten tiefer"); eine Farbe ohne Nachbarschaft
  hilft der Hand nicht.
- Maßgeblich ist die **Zieltonhöhenklasse**, nicht die gespielte: Wer eine schwarze
  Taste zu tief liegt, soll wissen, worauf er landet.
- Die kleine Zeile bleibt unverändert der Fachbegriff (R2 klein) – „Quinte −1 Halbton".
  Es gibt weiterhin genau einen Hinweis (R3).
- Deutsche Notennamen bleiben deutsch (R9); die Beschaffenheit ist eine Ergänzung, kein
  Ersatz für den Namen.

### Akzeptanzkriterien (B-26)

1. Die große Zeile nennt bei Halbtonschritten die Beschaffenheit des Ziels
   („die schwarze Taste links daneben", „die weiße Taste direkt darunter").
2. Die kleine Zeile bleibt der Fachbegriff (R2).
3. Korrekt für alle 12 Zieltöne, in beiden Richtungen.

**Prüfweg (ohne MIDI):**

- AK 1/2 als Test über `tribunal()` mit den Fällen aus B-05: Der Griff `D – Fis – B`
  statt `D – Fis – A` nennt die weiße Taste, `C – E – G` statt `C – Es – G` die
  schwarze. Die kleine Zeile bleibt Zeichen für Zeichen die alte.
- AK 3 als Regressionstest über alle 12 Tonhöhenklassen × beide Richtungen: Jede
  Meldung nennt genau dann „schwarz", wenn die Zieltonhöhenklasse nicht in `NATURAL_PC`
  steht.
- Die bestehenden Tribunal-Tests in `music.test.ts` (Rang 1–4) sind mitzuziehen; sie
  prüfen exakte Texte und schlagen sonst zu Recht fehl.

---

## Auftrag 2 · Wake Lock und Querformat robust machen (B-27)

### Befund (gemessen)

Konzept §10.5 ist ein Abnahmekriterium: „Das Tablet geht während einer Übung nicht in
den Standby." Der Code fordert die Sperre an und lässt sie fallen:

- [audio.ts:150–161](../../src/lib/audio.ts): `requestWakeLock()` ruft
  `nav.wakeLock.request('screen')` auf, **verwirft den Sentinel** und gibt nur einen
  Wahrheitswert zurück. Ohne Referenz gibt es kein `release()` und keine Möglichkeit zu
  prüfen, ob die Sperre noch steht.
- Aufgerufen wird sie genau einmal, in [engine.ts:619](../../src/lib/engine.ts) am Ende
  von `start()`, als `void`. Browser geben Wake Locks beim Verlassen des Tabs frei –
  danach fordert sie niemand erneut an. Nach einem Tab-Wechsel übt der Nutzer gegen
  einen dunkel werdenden Bildschirm.
- Beim Beenden der Einheit wird nichts freigegeben; die Sperre überlebt die Einheit,
  solange der Browser sie hält.
- Das Manifest ist bereits richtig (`"orientation": "landscape"`,
  [manifest.webmanifest](../../public/manifest.webmanifest)) – das greift aber nur in
  der installierten PWA.
- Im Browser-Tab gibt es nur die Fußzeile „Querformat empfohlen"
  ([App.tsx](../../src/App.tsx)). Der Hochformat-Hinweis ist als CSS vorhanden
  ([index.css:327](../../src/index.css) und die Medienabfrage darunter), aber **kein
  Bauteil rendert je ein Element mit der Klasse `rotate-hint`**: Die Regel ist tote
  Gestaltung.

### Umbau

- `requestWakeLock()` hält den Sentinel, meldet seinen Zustand und bietet ein
  ausdrückliches Freigeben an. Die Sperre wird bei `visibilitychange` zurück auf
  sichtbar erneut angefordert – am selben Ort, an dem R18 bereits den AudioContext
  prüft – und beim Verlassen der Einheit freigegeben.
- Der Wake Lock bleibt an die **laufende Einheit** gebunden, nicht an die App: Wer im
  Stufenplan liest, braucht keinen erzwungen wachen Bildschirm (R7: das Gerät gehört
  dem Nutzer).
- Der Hochformat-Hinweis bekommt sein Bauteil. Er nennt, was zu tun ist, und blockiert
  nichts: Querformat ist der einzige gestaltete Zustand (R6), aber ein gedrehtes Tablet
  ist kein Fehlerzustand, der die Eingabe abschneiden dürfte.
- Das Manifest bleibt unverändert.
- Kein `catch` bleibt leer: Fehlt die Wake-Lock-API oder verweigert der Browser sie,
  steht der Grund als Kommentar im Code und die App läuft weiter (R7).

### Akzeptanzkriterien (B-27)

1. Der Wake-Lock-Sentinel wird gehalten, bei `visibilitychange` erneuert und beim
   Verlassen der Einheit freigegeben.
2. Im Hochformat erscheint ein Hinweis statt eines gequetschten Cockpits (Manifest
   bleibt wie es ist).
3. Konzept-Abnahmekriterium 5 („geht während einer Übung nicht in Standby") ist auf dem
   Zielgerät nachgewiesen.

**Prüfweg (ohne MIDI):**

- AK 1 als Test über die Wake-Lock-Schicht mit einem eingesetzten Doppel: Anfordern
  hält genau einen Sentinel; ein zweites Anfordern öffnet keinen zweiten; nach
  `visibilitychange` auf sichtbar steht wieder genau einer; `stop()` gibt ihn frei.
- AK 2 im Browser: Viewport auf Hochformat (z. B. 600 × 1024) setzen – der Hinweis
  steht im DOM und ist sichtbar; im Querformat ist er es nicht. Die Eingabe bleibt in
  beiden Fällen aktiv.
- AK 3 ist das einzige Kriterium mit Hardware: Tablet, Einheit starten, fünf Minuten
  nicht anfassen. Ergebnis im Commit vermerken; ohne Gerät bleibt es offen und wird als
  offen benannt, nicht als erfüllt.

---

## Definition of Done (Regelwerk §5)

- [ ] `npm run build`, `npm run lint`, `npm test` ohne Fehler und ohne neue Warnungen
- [ ] Alle Akzeptanzkriterien beider Aufträge einzeln nachweisbar – AK 3 aus B-27 mit
      Gerät oder ausdrücklich als offen vermerkt
- [ ] Keine `any`, keine `as unknown as`, keine leeren `catch`-Blöcke ohne Begründung
- [ ] **Zwei Commits:** „B-26: Tribunal nennt schwarze und weiße Tasten (R2, Konzept §4.1)"
      und „B-27: Wake Lock halten, Hochformat benennen (R6, R7, Konzept §10.5)"

---

## Abgrenzung

- **Keine virtuelle Klaviatur** (R1). „Die schwarze Taste links daneben" ist Text, kein
  Bild. Der Hochformat-Hinweis ist ebenfalls Text.
- **Die Rangfolge der Urteile** (R3, R23) bleibt unverändert: B-26 ändert die
  Formulierung des Vektors, nicht die Wahl, welcher Fehler genannt wird.
- **Die Statistik** wurde in Paket 1 umgebaut und wird hier nicht angefasst.
- **B-13 ❓ (Bassschlüssel)** und **B-31 ❓ (Notensystem in Übung 1)** bleiben offen;
  beide betreffen die Anzeige der Einheit, nicht ihre Anweisungen.
