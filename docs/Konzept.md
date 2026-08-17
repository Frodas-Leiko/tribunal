# Konzept: „Propriozeptives Tribunal"
## Pflichtenheft für eine Klavier-Übungs-App (Tablet, USB-MIDI, Querformat)

**Status:** Final, zur Umsetzung freigegeben
**Zielgruppe:** Klavier-Anfänger (erste Akkorde, erstes Notenlesen), die blinde Griffmulden und sicheres Timing aufbauen wollen.

---

## 1. Leitidee

Ein Tablet, das per USB am Digitalpiano hängt, ist kein Konsumgerät, sondern ein **Messinstrument**. Es steht im Sichtfeld, während die Hände **nicht** angesehen werden. Die zentrale didaktische Regel lautet daher:

> Die App zeigt niemals eine virtuelle Tastatur. Sie übersetzt Fehler und Zeit so, dass Tastsinn und Propriozeption sie verarbeiten können.

- Ein Bildschirm, der nur „Falsch" sagt, ist nutzlos.
- Ein Bildschirm, der eine Tastatur zeigt, macht blind für die echte Tastatur.
- Die App zeigt stattdessen: **Bewegungsanweisungen für die Finger, Räume für die Zeit, Landkarten für die Griffmulden.**

Die App ist Werkzeug, kein Spielzeug: nüchtern wie ein Cockpit, präzise wie ein Messgerät.

---

## 2. Didaktische Grundprinzipien

1. **Geschlossener taktiler Regelkreis:** Jede Korrektur erfolgt über die Handstellung, nie über den Blick auf die Tasten.
2. **Anfänger-zuerst:** Alle Rückmeldungen existieren in zwei Ebenen – einer klaren Handlungsanweisung (Einsteiger) und der Fachbezeichnung (Theorie), die mit der Zeit übernimmt.
3. **Messung statt Meinung:** Pitch **und** Timing werden gemessen. Nichts bleibt Selbsteinschätzung.
4. **Ein Ziel pro Einheit:** Jede Übung hat ein explizites, prüfbares Erfolgskriterium.
5. **Wenig, dafür richtig:** Wenige Tonarten und Akkordfolgen, sauber freigeschaltet – statt Überangebot.

---

## 3. Übungen

### Übung 1 – „Blind-Griff" (Akkorde im 16tel-Raster)

- **Inhalt:** Dur- und Moll-Dreiklänge in Grundstellung, rechte Hand, innerhalb der aktiven Tonart.
- **Ablauf:** 4/4-Takt. Auf Zählzeit `1` wird der Zielakkord angeschlagen. Die Hand löst sich danach komplett von den Tasten. Während `e – und – a` formt die Hand **in der Luft** die nächste Griffmulde. Auf der nächsten `1` landet der nächste Akkord.
- **Lernziel:** Akkorde als feste Hand-Geometrie (Griffmulde) speichern, nicht als Suche einzelner Tasten.
- **Fingersatz:** Standard 1–3–5 (Daumen–Mittelfinger–Kleiner Finger), Grundstellung.

### Übung 2 – „Systemsprung" (Oktavblöcke im 6/8)

- **Inhalt:** Zwei Akkordblöcke pro Takt: Block 1 im Zentrum des Notensystems, Block 2 um eine Oktave versetzt (Hilfslinien-Zonen).
- **Ablauf:** 6/8-Takt, zwei schwere Zählzeiten. Auf Schlag 1 Klang im Zentrum, auf Schlag 2 der weite Sprung in die Zielzone.
- **Lernziel:** Lesen und Greifen über Systemgrenzen hinweg („Block + Zone" statt Einzelnoten); große Distanzen als zeitliche Dehnung erfahren.
- **Fingersatz:** Wie Übung 1; der Sprung wird als ganzer Block bewegt, die Handform bleibt identisch.

### Später (Roadmap, nicht Bestandteil dieser Version)

- Beide Hände / linke Hand
- Umkehrungen der Dreiklänge
- **Modul „Eigene Akkordfolgen"** (Editor für benutzerdefinierte Progressionen) – als Idee vermerkt, bewusst zurückgestellt.

---

## 4. Kernmodule

### 4.1 Das Tribunal – Fehler als Bewegungsvektoren

**Funktion:** Die App vergleicht die gespielten Töne (Pitch Classes, via MIDI) mit dem Zielakkord. Weicht ein Ton ab, wird nicht die Note genannt, sondern die **Abweichung der Finger-Geometrie**.

**Anzeige – zweistufig (Anpassung für Anfänger):**

| Ebene | Beispiel | Bedeutung |
|---|---|---|
| **Handlungsanweisung (groß)** | `FINGER 5: eine Taste tiefer` | Unmittelbar ausführbar, ohne Theorie |
| **Theorie-Ebene (klein darunter)** | `Quinte +1` | Fachbegriff (Terz, Quinte, Halbton) zum Mitlernen |

- Zu hoch gegriffen → „tiefer", zu tief → „höher", inkl. Richtung relativ zur Hand (z. B. „die schwarze Taste links daneben").
- Bei mehreren falschen Tönen wird nur **ein** Vektor angezeigt (der gröbste Fehler), um Überforderung zu vermeiden.
- Korrekt gespielt → kühles Signalgrün, kurzes, ruhiges Bestätigungssignal.

### 4.2 Die Subdivisions-Maschine – Zeit als Raum, inkl. Timing-Messung

**Funktion (Übung 1):** Horizontaler Balken, vier Segmente: `1 | e | und | a`.

- Segment `1`: harter, massiver Block (der **Aufprall** – hier steht der Klang).
- Segmente `e | und | a`: sich füllender „Reisekorridor" (die Hand ist in der Luft und formt die Geometrie).
- Ein Cursor durchläuft den Korridor; die Hand reist mit und landet exakt am Ende.

**Funktion (Übung 2):** Zwei schwere Blöcke/Pendel. Block 1 = Klang, Block 2 = weiter Sprung. Die Distanz wird als zeitliche Dehnung sichtbar.

**Timing-Messung (Anpassung):** Jeder Anschlag wird gegen das Soll gemessen.

- Anzeige pro Schlag: z. B. `+38 ms zu spät` / `−21 ms zu früh`.
- Toleranzfenster einstellbar, Standard für Anfänger: **±50 ms**, in drei Stufen verschärfbar bis ±20 ms.
- Verlauf der letzten Schläge als kleine Punktelinie (Drift nach früh/spät sofort erkennbar).

### 4.3 Die Topographie-Karte – Landkarte der Griffmulden

**Funktion:** Schmales Band am unteren Bildschirmrand. Zeigt **keine** Tasten, sondern nur die *Gruppen* der schwarzen Tasten (2er- und 3er-Inseln) als reliefartige Erhebungen.

- Der nächste Zielakkord pulsiert als Marker in seiner charakteristischen Position relativ zu den Inselgruppen (z. B. D-Moll: Mulde *zwischen* 2er- und 3er-Gruppe; F-Dur: *linker Rand* der 3er-Gruppe).
- **Effekt:** Das Gehirn lernt „Zielakkord = spezifische Beziehung zu einer schwarzen Inselgruppe" – exakt die taktile Geometrie, die trainiert wird.

### 4.4 Das Zonen-System – Notenlesen über Systemgrenzen (Übung 2)

- Das Notensystem ist in drei subtil hinterlegte Zonen geteilt: **Zenit** (obere Hilfslinien), **Zentrum** (5-Linien-System), **Nadir** (untere Hilfslinien).
- Zielblöcke werden als geschlossene „Chunks" (Klammer um alle Noten des Akkords) dargestellt.
- Vor einem Oktavsprung **leuchtet die Zielzone auf**, dann wird der Block dorthin projiziert.
- **Effekt:** Gelesen wird „Block + Zone" statt Einzelnoten; Hilfslinien verlieren ihren Schrecken.

### 4.5 Der Diktat-Modus – Sequenz, Zufall, adaptiv

Die App entscheidet, welcher Akkord kommt – nie die Gewohnheit der Hand.

- **Modus A (Sequenz):** Strikt diatonisch auf-/absteigend. Dient dem Aufbau der Landkarte. Standard für neue Inhalte.
- **Modus B (Zufall):** Zufälliger Akkord innerhalb der Tonart. Erzwingt Neuberechnung der Topographie bei jedem Schlag. Freigeschaltet, sobald Modus A bestanden ist.
- **Modus C (adaptiv – Anpassung):** Der Zufall ist gewichtet: Akkorde mit der höchsten Fehlerquote (aus der Fehlerhistorie, s. Modul 6) werden häufiger abgefragt.

---

## 5. Inhalte: Tonarten, Akkordfolgen, Steckbriefe

### 5.1 Tonarten & Freischaltung

**Prinzip:** Wenige Tonarten, in sinnvoller Reihenfolge entlang des Quintenzirkels freigeschaltet – jede neue Tonart fügt genau **ein** Vorzeichen hinzu. Zuerst die Dur-Tonart, dann ihre parallele Moll-Tonart.

| Stufe | Dur | Parallel-Moll | Vorzeichen |
|---|---|---|---|
| 1 | C-Dur | a-Moll | – |
| 2 | G-Dur | e-Moll | 1 # |
| 3 | F-Dur | d-Moll | 1 b |
| 4 | D-Dur | h-Moll | 2 # |
| 5 | B-Dur | g-Moll | 2 b |

Weitere Stufen (A-Dur/fis-Moll, Es-Dur/c-Moll usw.) sind in der Datenstruktur vorgesehen, werden aber erst nach Freischaltlogik-Erfahrung ergänzt. **Begründung:** Zu viele Tonarten auf einmal lenken ab; die Rampe folgt dem Quintenzirkel, weil jede Stufe nur ein neues Vorzeichen bringt.

**Freischaltkriterium pro Stufe:** Erfolgskriterium (s. Abschnitt 6) in Modus A **und** Modus B erfüllt.

### 5.2 Akkordfolgen-Datenbank

Keine eigenen Folgen in dieser Version, sondern eine kuratierte Datenbank **strukturell stimmiger Standard-Progressionen**, die beim klassischen Klavierlernen kanonisch sind. Alle Folgen sind als Stufen hinterlegt und werden in der aktiven Tonart realisiert:

| Name | Stufen (Dur) | Stufen (Moll) | Bedeutung |
|---|---|---|---|
| Vollkadenz | I – IV – V – I | i – iv – V – i | Die Grundkadenz, harmonisches Fundament |
| Erweiterte Kadenz | I – IV – I – V – I | i – iv – i – V – i | Kadenz mit Rückkehr |
| Quintfall | ii – V – I | ii° – V – i | Wichtigster Schluss der klassischen Harmonik |
| Kanon-Sequenz | I – V – vi – iii – IV – I – IV – V | – | Pachelbel-Muster, Quintfall-Kette |
| Stufenweg | I – vi – IV – V | i – VI – iv – V | Häufige Verbindungsformel |
| Moll-Wendung | – | i – VII – VI – V | Typische Moll-Abwärtsbewegung |

Jede Folge existiert in beiden Übungs-Modi (als Blind-Griff-Sequenz in Übung 1; ausgewählte Folgen zusätzlich mit Oktavsprüngen in Übung 2).

### 5.3 Steckbriefe

**Zu jeder Tonart, jeder Akkordfolge und jedem Timing-Training gibt es einen Steckbrief**, abrufbar über ein Info-Symbol – kompakt, auf einen Blick lesbar:

**Steckbrief Tonart:**
- Tonika, Vorzeichen, Tonleiter (auf- und absteigend, im Notensystem)
- **Fingersatz-Hinweis:** Standard-Fingersatz der Tonleiter und der Dreiklänge (z. B. rechter Hand 1–2–3–1–2–3–4–5; Dreiklänge 1–3–5), inkl. Warnung vor typischen Fehlgriffen (z. B. Daumen-Untersatz in F-Dur)
- Typische Stolperstellen (z. B. „das H in F-Dur ist ein B – schwarze Taste")

**Steckbrief Akkordfolge:**
- Stufenbezeichnungen und Funktion (Tonika/Subdominante/Dominante in Alltagssprache: „Heimat – Spannung – Rückkehr")
- Harmonische Logik in einem Satz („Warum klingt das richtig?")
- Fingersatz-Hinweise pro Akkordwechsel (welcher Finger wandert, welcher bleibt liegen)

**Steckbrief Timing-Training:**
- Zählweise (z. B. „1 – e – und – a" mit gesprochenem Muster)
- Was wird gemessen, welches Toleranzfenster gilt
- Übungstipp (z. B. „Hand in der Luft formen, nicht auf den Tasten")

---

## 6. Fortschritt, Messung, Statistik

- **Erfolgskriterium (Einheit bestanden):** 8 fehlerfreie Wiederholungen **in Folge** bei aktuellem Tempo, innerhalb des Toleranzfensters.
- **Tempo-Rampe:** Nach Bestehen +4 bpm, bis zum Zieltempo der Übung (Standard: 60 → 100 bpm). Danach gilt die Stufe als abgeschlossen.
- **Fehlerhistorie:** Pro Akkord und Finger werden Abweichungen (Richtung, Halbtöne) gezählt; pro Übung die Timing-Drift (früh/spät-Tendenz). Diese Daten steuern Modus C.
- **Darstellung:** Eine nüchterne Statistik-Ansicht (Heatmap der Akkorde, Drift-Linie, Fortschrittsbalken je Stufe). Keine Gamification-Elemente (keine Punkte, keine Streaks) – Messwerte statt Belohnung.
- **Speicherung:** Lokal im Browser (IndexedDB). Kein Konto, kein Server in dieser Version. Hinweis in der App: „Dein Fortschritt bleibt auf diesem Gerät."

---

## 7. Technisches Fundament

| Bereich | Entscheidung | Begründung |
|---|---|---|
| Plattform | Web-App (PWA-fähig), läuft im Tablet-Browser | Kein App-Store, direkter Zugriff auf Web MIDI |
| MIDI | Web MIDI API über USB-Verbindung zum Piano | Direkte, latenzarme Anschlagsdaten |
| Audio | Web Audio API, Klick **synthetisiert** (tiefer Sinus für `1`, hoher für Subdivisions) | Keine Audio-Dateien, kein Puffern, minimale Latenz |
| Bildschirm | Wake Lock API (Standby während des Übens gesperrt) | Der Bildschirm ist der Lehrer; ein schwarzer Spiegel ist ein schlechter Lehrer |
| Ausrichtung | **Landscape-First**, ausschließlich Querformat | Das Notensystem braucht Breite; Tablet steht auf dem Notenpult |
| Eingabe | Touch nur für Menü/Einstellungen; während der Übung läuft alles über MIDI | Hände bleiben am Klavier |
| Offline | Vollständig offline lauffähig (PWA-Cache) | Üben ohne Netz |

---

## 8. Visuelles Design

**Haltung:** Flugzeug-Cockpit / Reißbrett. Keine verspielten Klavier-App-Ästhetik, keine bunten Tasten.

- **Hintergrund:** Tiefes Anthrazit (kein reines Schwarz, um Blendung zu vermeiden), feines, kaum sichtbares Millimeterraster – ein Arbeitsraum.
- **Typografie:** Breite, kondensierte Grotesk für Vektoren und Stufen (aus 2 m Entfernung im Stehen lesbar); hochgradig lesbare Schrift für Steckbriefe und Analysen.
- **Farben mit fester Bedeutung (keine Dekoration):**
  - **Bernstein** = Takt / Zeit / die Reise (Cursor, Reisekorridor)
  - **Signalgrün** = diatonische Wahrheit (korrekter Anschlag, bestandene Einheit)
  - **Hartes Rot** = geometrischer Fehler (Vektor-Anzeige)
- **Layout (Landscape):**
  - Zentrum: Notensystem mit Zonen (Zenit/Zentrum/Nadir)
  - Darüber: Tribunal-Anzeige (Vektor groß, Theorie klein)
  - Darunter: Subdivisions-Balken mit Cursor und Timing-Rückmeldung
  - Unterer Rand: Topographie-Karte (schwarze-Tasten-Inseln)
  - Rand: dezente Buttons für Steckbrief, Tempo, Modus

---

## 9. Umfang dieser Version (Scope)

**Enthalten:**
- Übung 1 (Blind-Griff) und Übung 2 (Systemsprung)
- Tribunal mit zweistufiger Fehleranzeige
- Subdivisions-Maschine mit Timing-Messung und Toleranzfenstern
- Topographie-Karte, Zonen-System
- Diktat-Modi A (Sequenz), B (Zufall), C (adaptiv)
- 5 freischaltbare Tonart-Stufen (Dur + Parallel-Moll)
- Akkordfolgen-Datenbank (6 kuratierte Progressionen)
- Steckbriefe zu Tonarten, Akkordfolgen, Timing-Trainings (inkl. Fingersatz)
- Fortschritts- und Freischaltsystem, lokale Statistik

**Bewusst nicht enthalten (Roadmap):**
- Editor für eigene Akkordfolgen
- Linke Hand / beide Hände, Akkordumkehrungen
- Konto/Server-Synchronisation des Fortschritts
- Weitere Tonarten über Stufe 5 hinaus

---

## 10. Abnahmekriterien

1. Anschlag am Piano erscheint spürbar verzögerungsfrei als Messwert (Pitch + Timing) auf dem Tablet.
2. Ein falscher Griff erzeugt eine eindeutige, ohne Theoriekenntnisse ausführbare Korrekturanweisung (z. B. „Finger 3: eine Taste höher").
3. Eine Übungseinheit kann nur über das Erfolgskriterium abgeschlossen werden; die nächste Stufe schaltet erst dann frei.
4. Zu jeder Tonart, Folge und jedem Timing-Training ist der Steckbrief in höchstens einem Tippen erreichbar.
5. Das Tablet geht während einer Übung nicht in den Standby; die App läuft offline im Querformat.
