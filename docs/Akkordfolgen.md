# Akkordfolgen-Datenbank
## Sollbestand für `PROGRESSIONS` in `src/lib/music.ts`

**Version:** 1.0 · **Stand:** 17.08.2026 · **Regelbezug:** R14, R15, R16

32 Folgen in fünf Kategorien. 6 davon existieren bereits (eine korrigiert), 26 sind neu.
Alle Folgen sind reine Dreiklangs-Folgen und in jeder der 10 Tonarten spielbar.

---

## Lesehilfe

- **Stufen** in römischen Ziffern nach R9/R15. Groß = Dur, klein = Moll, `°` = vermindert.
- **`VII`** in Moll = **Dur-Dreiklang auf der kleinen Septime** (in a-Moll: **G-Dur**).
- **`vii°`** = Leittondreiklang (in a-Moll: **Gis°**). **`v`** = Moll-Dominante (in a-Moll: **e-Moll**).
- **`–`** bedeutet: in diesem Tongeschlecht bewusst nicht angeboten (Auswahl blendet sie aus, R16).
- **Ü2** = für Übung 2 (Systemsprung) freigegeben. Faustregel: bis 8 Akkorde ja, darüber nur Übung 1.
- **Status:** `vorhanden` · `korrigiert` · `neu`

> ⚠️ **Voraussetzung:** Die mit **R15** markierten Folgen brauchen erst das erweiterte
> Moll-Vokabular (Backlog **B-16**). Vorher sind sie in Moll nicht auflösbar und dürfen
> nach R16 nicht stillschweigend gekürzt werden.

---

## A · Kadenzen und Schlusswendungen (klassisches Fundament)

| # | id | Name | Dur | Moll | Ü2 | Status |
|---|---|---|---|---|---|---|
| 1 | `vollkadenz` | Vollkadenz | I – IV – V – I | i – iv – V – i | ✓ | vorhanden |
| 2 | `erweitert` | Erweiterte Kadenz | I – IV – I – V – I | i – iv – i – V – i | ✓ | vorhanden |
| 3 | `quintfall` | Quintfall (ii–V–I) | ii – V – I | ii° – V – i | ✓ | vorhanden |
| 4 | `doppelkadenz` | Kadenz mit Subdominantparallele | I – ii – V – I | i – ii° – V – i | ✓ | neu |
| 5 | `plagal` | Plagalschluss („Amen-Schluss") | IV – I | iv – i | ✓ | neu |
| 6 | `halbschluss` | Halbschluss | I – ii – V | i – ii° – V | ✓ | neu |
| 7 | `trugschluss` | Trugschluss | I – IV – V – vi | i – iv – V – VI | ✓ | neu |
| 8 | `wechselkadenz` | Wechselkadenz | I – V – I – IV – I | i – V – i – iv – i | ✓ | neu |
| 9 | `bassgang` | Große Kadenz (Bassgang) | I – iii – vi – IV – V – I | i – III – VI – iv – V – i | ✓ | neu |

**Logik & Fingersatz**

- **1 Vollkadenz** — Heimat, Spannung, höchste Spannung, Rückkehr. Das harmonische Fundament: Subdominante und Dominante umklammern die Tonika.
  *Fingersatz:* I→IV wandert die ganze Mulde eine Stufe aufwärts, V→I fällt sie zurück. Durchgehend 1–3–5. Der Grundton bleibt in der Anker-Oktave (R12).
- **2 Erweiterte Kadenz** — Die Rückkehr zur Tonika zwischen Sub- und Dominante verlangsamt die Kadenz und trainiert den Wechsel in beide Richtungen.
  *Fingersatz:* IV→I und I→V sind reine Mulden-Verschiebungen um je eine Stufe. Der Mittelfinger trägt die Terz und entscheidet über Dur oder Moll.
- **3 Quintfall** — Der wichtigste Schluss der klassischen Harmonik: die Stufen fallen in Quinten. Maximale Zielstrebigkeit zur Tonika.
  *Fingersatz:* Drei Mulden im Abstand je einer Stufe; die Hand klettert und fällt dann zwei Stufen zurück.
- **4 Kadenz mit Subdominantparallele** — Die zweite Stufe übernimmt die Rolle der Subdominante; der Bass schreitet in Sekunden statt zu springen.
  *Fingersatz:* I→ii ist ein Ganzton für alle drei Finger gleichzeitig – die Mulde bleibt exakt erhalten. Ideal als erste Sequenz-Erfahrung.
- **5 Plagalschluss** — Zwei Akkorde, ein Schluss. Der weiche „Amen"-Fall ohne Leitton. Die kürzeste vollständige Wendung überhaupt.
  *Fingersatz:* IV und I teilen sich den Grundton der Tonika; nur zwei Finger bewegen sich wirklich. Perfekt zum Aufbau der ersten Griffmulde.
- **6 Halbschluss** — Die Kadenz, die offen bleibt: sie endet auf der Dominante und verlangt eine Fortsetzung. Trainiert das Hören von Spannung ohne Auflösung.
  *Fingersatz:* Zwei Ganztonschritte aufwärts. Die Hand bewegt sich nur in eine Richtung – gut für die Kalibrierung des Bewegungsgefühls.
- **7 Trugschluss** — Die Dominante geht nicht heim, sondern zur Parallele. Der Ohr-Effekt ist verblüffend; die Hand lernt eine unerwartete Zielmulde.
  *Fingersatz:* V→vi ist ein einziger Halb- bzw. Ganztonschritt aufwärts – winzige Bewegung, große Wirkung. Genau hinhören, nicht hinsehen.
- **8 Wechselkadenz** — Tonika im Wechsel mit ihren beiden Nachbarn. Die klassische Anfängerformel, um Dominante und Subdominante voneinander zu unterscheiden.
  *Fingersatz:* Die Hand pendelt um einen festen Mittelpunkt. Wer die Tonika-Mulde blind wiederfindet, hat die Übung bestanden.
- **9 Große Kadenz (Bassgang)** — Eine vollständige Rundreise durch die wichtigsten Stufen der Tonart: Tonika, ihre beiden Parallelen, Subdominante, Dominante, zurück.
  *Fingersatz:* Sechs Mulden hintereinander – die längste Folge, die noch ohne Blick machbar ist. Erst bei 60 bpm sicher, dann Tempo.

---

## B · Sequenzen und Ketten

| # | id | Name | Dur | Moll | Ü2 | Status |
|---|---|---|---|---|---|---|
| 10 | `kanon` | Kanon-Sequenz (Pachelbel) | I – V – vi – iii – IV – I – IV – V | – | ✓ | vorhanden |
| 11 | `quintfallkette` | Quintfall-Kette (vollständig) | I – IV – vii° – iii – vi – ii – V – I | i – iv – **VII** – III – VI – ii° – V – i | ✓ | neu · **R15** |
| 12 | `sekundsequenz-auf` | Aufsteigende Sekundsequenz | I – ii – iii – IV | i – ii° – III – iv | ✓ | neu |
| 13 | `sekundsequenz-ab` | Absteigende Sekundsequenz (Lamento) | I – vii° – vi – V | i – **VII** – VI – **v** | ✓ | neu · **R15** |
| 14 | `terzfallkette` | Terzfall-Kette | I – vi – IV – ii | i – VI – iv – ii° | ✓ | neu |

**Logik & Fingersatz**

- **10 Kanon-Sequenz** — Das Pachelbel-Muster: eine Kette von Quintfällen, die sich durch die ganze Tonart spiralt. Steckt in hunderten klassischen und modernen Stücken. *(In Moll bewusst nicht angeboten – Konzept §5.2.)*
  *Fingersatz:* Die Sprünge V→vi und iii→IV sind größer als eine Stufe – hier zahlt die Topographie-Karte ein. Erst langsam, die Mulde komplett formen, dann landen.
- **11 Quintfall-Kette** — Alle sieben Stufen der Tonart in einer einzigen Quintfall-Spirale. Die vollständige Landkarte der Tonart in acht Griffen.
  *Fingersatz:* Der Bass fällt jedes Mal eine Quinte, die Hand steigt abwechselnd eine Stufe und fällt zwei. Die Königsübung für Modus A.
- **12 Aufsteigende Sekundsequenz** — Vier Stufen im Gänsemarsch aufwärts. Die reinste Form der Mulden-Verschiebung: identische Handform, neuer Ort.
  *Fingersatz:* Jeder Wechsel ist eine Parallelverschiebung um eine Stufe. Kein Finger wechselt seine Rolle – die einzige Frage ist, ob die Hand den Abstand trifft.
- **13 Absteigende Sekundsequenz (Lamento)** — Die klagende Abwärtslinie. In Moll mit der natürlichen Moll-Dominante (`v`) – weich, ohne Leitton.
  *Fingersatz:* Abwärtsbewegungen fühlen sich anders an als Aufwärtsbewegungen: der Arm muss aktiv bremsen. Bewusst steuern, nicht fallen lassen.
- **14 Terzfall-Kette** — Der Bass fällt in Terzen. Zwei von drei Tönen bleiben bei jedem Wechsel liegen – hörbar weich, taktil anspruchsvoll.
  *Fingersatz:* Weil zwei Töne gemeinsam sind, verführt die Folge zum Kleben. Genau hier gilt: Hand komplett lösen, in der Luft neu formen (Konzept §3).

---

## C · Moll-Wendungen

| # | id | Name | Dur | Moll | Ü2 | Status |
|---|---|---|---|---|---|---|
| 15 | `mollwendung` | Moll-Wendung / Andalusische Kadenz | – | i – **VII** – VI – V | ✓ | **korrigiert** · **R15** |
| 16 | `mollkadenz-natur` | Natürliche Moll-Kadenz | – | i – iv – **v** – i | ✓ | neu · **R15** |
| 17 | `mollaufstieg` | Moll-Aufstieg | – | i – III – iv – V | ✓ | neu |

**Logik & Fingersatz**

- **15 Moll-Wendung** — Die absteigende Moll-Formel von der Tonika über die tiefen Stufen zur Dominante. Von Flamenco bis Filmmusik. **Korrektur:** `VII` ist hier der **Dur-Dreiklang auf der kleinen Septime** (a-Moll → G-Dur), nicht der Leittondreiklang. Die Dur-Variante wird nach Konzept §5.2 bewusst nicht angeboten.
  *Fingersatz:* Drei Mulden fallen je eine Stufe abwärts, dann der Sprung zur Dominante mit ihrem Leitton – der einzige „fremde" Ton der Folge.
- **16 Natürliche Moll-Kadenz** — Dieselbe Kadenz wie Nr. 1, aber mit der weichen Moll-Dominante statt der Dur-Dominante. Der direkte Hörvergleich macht deutlich, was der Leitton leistet.
  *Fingersatz:* Identische Mulden-Wege wie in der Vollkadenz – nur der Mittelfinger sitzt auf der Dominante einen Halbton tiefer. Ein Halbton, eine ganz andere Welt.
- **17 Moll-Aufstieg** — Von der Moll-Tonika über die Dur-Parallele aufwärts zur Dominante. Zeigt, dass Moll-Tonarten Dur-Akkorde enthalten.
  *Fingersatz:* i→III teilt sich zwei Töne, die Hand rutscht nur eine Stufe. Der Weg iv→V ist der Standard-Kadenzschritt aus Nr. 1.

---

## D · Pop und Songwriting

| # | id | Name | Dur | Moll | Ü2 | Status |
|---|---|---|---|---|---|---|
| 18 | `achse` | Achse der Vier | I – V – vi – IV | i – VI – III – **VII** | ✓ | neu · **R15** |
| 19 | `achse-vi` | Achse ab der Parallele | vi – IV – I – V | – | ✓ | neu |
| 20 | `stufenweg` | Doo-Wop / Stufenweg (50er) | I – vi – IV – V | i – VI – iv – V | ✓ | vorhanden |
| 21 | `turnaround` | Turnaround | I – vi – ii – V | i – VI – ii° – V | ✓ | neu |
| 22 | `poppunk` | Pop-Wippe | I – IV – vi – V | i – iv – VI – V | ✓ | neu |
| 23 | `mollachse` | Moll-Achse | – | i – III – **VII** – VI | ✓ | neu · **R15** |
| 24 | `wippe-subdominante` | Zwei-Akkord-Wippe: Subdominante | I – IV | i – iv | ✓ | neu |
| 25 | `wippe-dominante` | Zwei-Akkord-Wippe: Dominante | I – V | i – V | ✓ | neu |
| 26 | `wippe-parallele` | Zwei-Akkord-Wippe: Parallele | I – vi | i – VI | ✓ | neu |

**Logik & Fingersatz**

- **18 Achse der Vier** — Die meistgespielte Vier-Akkord-Folge der populären Musik. Vier Stufen, die in jeder Reihenfolge funktionieren, weil sie sich paarweise Töne teilen.
  *Fingersatz:* V→vi ist der kleinste Schritt der Folge, vi→IV der größte. Die Topographie-Karte zeigt beide Sprünge als Wechsel zwischen 2er- und 3er-Insel.
- **19 Achse ab der Parallele** — Dieselben vier Akkorde, aber ab der Moll-Parallele. Dieselbe Hand, ganz anderer Charakter – ein Hörexperiment mit identischer Geometrie.
  *Fingersatz:* Bewusst als eigene Übung: Die Hand darf sich nicht auf die gewohnte Startmulde verlassen (Konzept §4.5, „nie die Gewohnheit der Hand").
- **20 Doo-Wop / Stufenweg** — Verbindet das Tonika-Gegengewicht (vi) mit der Kadenz (IV–V). Eine der häufigsten Verbindungsformeln überhaupt.
  *Fingersatz:* I→vi ist der Wechsel zur Parallel-Moll: gleiche Lage, wandernder Grundton. Der Mittelfinger prüft die Terz.
- **21 Turnaround** — Die Rückkehrschleife: Sie endet auf der Dominante und führt zwingend an den Anfang zurück. Grundbaustein von Jazz-Standards und Popsongs.
  *Fingersatz:* Vier Mulden in fallenden Terzen und Quinten. Weil sich die Folge selbst zurückführt, eignet sie sich besonders für lange Serien.
- **22 Pop-Wippe** — Tonika, Subdominante, Parallele, Dominante. Der eingängigste Weg durch die Tonart, ohne einen einzigen Sprung über zwei Stufen.
  *Fingersatz:* IV→vi ist der einzige Terzschritt; alles andere sind Sekund- und Quintwege. Gute Folge, um das Tempo hochzuziehen.
- **23 Moll-Achse** — Die Moll-Variante der Achse: von der Tonika über die Dur-Parallele abwärts. Der Standard moderner Moll-Songs.
  *Fingersatz:* Drei der vier Akkorde sind Dur-Dreiklänge – die Hand muss die kleine Terz nur einmal treffen. Übung für den Wechsel der Terz-Qualität.
- **24–26 Zwei-Akkord-Wippen** — Die kürzestmöglichen Folgen: zwei Mulden im ständigen Wechsel. Nicht als Musik gedacht, sondern als Werkzeug: Wer eine Wippe bei 100 bpm blind trifft, hat genau eine Muldenbeziehung gespeichert.
  *Fingersatz:* Immer denselben Weg gehen, immer die Hand komplett lösen. Diese drei Folgen sind der empfohlene Einstieg für jede neue Tonart – vor jeder Kadenz.

---

## E · Blues und Jazz (Dreiklangs-Fassungen)

| # | id | Name | Dur | Moll | Ü2 | Status |
|---|---|---|---|---|---|---|
| 27 | `blues12` | 12-Takt-Blues | I I I I – IV IV I I – V IV I V | i i i i – iv iv i i – V iv i V | ✗ | neu |
| 28 | `blues-quickchange` | Quick-Change-Blues | I IV I I – IV IV I I – V IV I V | i iv i i – iv iv i i – V iv i V | ✗ | neu |
| 29 | `blues8` | 8-Takt-Blues | I – V – IV – IV – I – V – I – V | i – V – iv – iv – i – V – i – V | ✓ | neu |
| 30 | `rhythmchanges` | Rhythm-Changes-Kern (A-Teil) | I – vi – ii – V – I – vi – ii – V | i – VI – ii° – V – i – VI – ii° – V | ✓ | neu |
| 31 | `jazzkette` | Erweiterter Quintfall | iii – vi – ii – V – I | III – VI – ii° – V – i | ✓ | neu |
| 32 | `modalwippe` | Modale Wippe | I – ii | i – **VII** | ✓ | neu · **R15** |

**Logik & Fingersatz**

- **27 12-Takt-Blues** — Das Grundgerüst des Blues in reiner Dreiklangs-Fassung: zwölf Takte, drei Akkorde, feste Reihenfolge. *(Ohne Septakkorde – siehe Set B.)*
  *Fingersatz:* Die langen Tonika-Strecken sind der eigentliche Test: Die Hand muss viermal dieselbe Mulde neu formen, statt liegenzubleiben.
- **28 Quick-Change-Blues** — Wie Nr. 27, aber mit dem frühen Ausflug zur Subdominante im zweiten Takt. Der Standard in Jazz- und Bluesrunden.
  *Fingersatz:* Der frühe Wechsel im zweiten Takt kommt für die Hand überraschend – genau darum ist er ein gutes Timing-Training.
- **29 8-Takt-Blues** — Die kompakte Blues-Form. Halb so lang, gleiche Logik, für Übung 2 noch handhabbar.
  *Fingersatz:* Der Wechsel V→IV ist ein Quintfall abwärts – ungewohnt, weil er gegen die klassische Kadenzrichtung läuft.
- **30 Rhythm-Changes-Kern** — Der A-Teil eines der meistgespielten Jazz-Formen, auf Dreiklänge reduziert: zwei Turnarounds hintereinander.
  *Fingersatz:* Acht Griffe, aber nur vier verschiedene Mulden. Die Wiederholung macht sie zur idealen Serien-Übung für das Erfolgskriterium.
- **31 Erweiterter Quintfall** — Der Quintfall, um zwei Stufen nach vorn verlängert. Die längste zielgerichtete Bewegung, die die Tonart hergibt.
  *Fingersatz:* Fünf Mulden auf einer einzigen fallenden Quintlinie. Wer sie blind schafft, hat die Landkarte der Tonart verinnerlicht.
- **32 Modale Wippe** — Zwei Akkorde, die keine Kadenz bilden: Tonika und Nachbarstufe im Wechsel. Erzeugt den schwebenden, modalen Charakter moderner Musik.
  *Fingersatz:* Reine Parallelverschiebung um eine Stufe. Die einfachste denkbare Bewegung – ideal, um bei ±20 ms Toleranz zu üben.

---

## Set B · Bewusst zurückgestellt (braucht Engine-Erweiterung)

Diese Folgen sind **nicht** Teil dieses Bestands. Sie verlangen Akkordtypen, die die
App heute nicht kennt, und würden nach R16 als „nicht verfügbar" gelten. Sie sind hier
notiert, damit sie nicht vergessen und nicht versehentlich halb umgesetzt werden.

| Idee | Braucht |
|---|---|
| Echter Blues (I⁷ – IV⁷ – V⁷) | Septakkorde (vierstimmig) |
| ii⁷ – V⁷ – I<sup>maj7</sup> | Septakkorde, Fingersatz 1–2–3–5 |
| Doppeldominante (I – **II** – V – I) | Zwischendominanten (leiterfremde Terz) |
| Neapolitanische Wendung (**♭II** – V – i) | Leiterfremde Stufe |
| Zwischendominanten-Kette (V/vi, V/ii …) | Zwischendominanten |
| Basslinien-Folgen (I – V⁶ – vi – …) | Umkehrungen (Konzept §3 „Später") |

**Entscheidung offen ❓** — Ob Septakkorde und Umkehrungen überhaupt in diese Version
gehören, ist im Konzept §9 ausdrücklich verneint („Roadmap"). Vor einer Umsetzung
braucht es eine Regeländerung nach §7 des Regelwerks.

---

## Umsetzungshinweise

1. **Feldstruktur** (`ProgressionDef`, erweitert gegenüber heute):
   `id`, `name`, `kategorie` (`kadenz` | `sequenz` | `moll` | `pop` | `blues-jazz`),
   `degrees: { dur: string[] | null; moll: string[] | null }`,
   `logic`, `fingeringHint`, `uebung2: boolean`.
2. **Auswahl-UI:** Nach Kategorie gruppiert, mit Filter. 32 Einträge in einer flachen
   Chip-Reihe sind unbedienbar (heute: `setup-opts wrap`).
3. **Verfügbarkeit:** Folgen mit `null` im aktiven Tongeschlecht werden ausgegraut mit
   Begründung („nur in Moll"), nicht versteckt.
4. **Reihenfolge in der Liste:** Wippen (24–26) zuerst, dann Kadenzen, dann der Rest –
   die kürzeste sinnvolle Übung soll oben stehen.
5. **Steckbrief:** Jede Folge braucht Stufen, Logik und Fingersatz-Hinweis (Konzept §5.3).
   Die obigen Texte sind der Sollinhalt und können direkt übernommen werden.
