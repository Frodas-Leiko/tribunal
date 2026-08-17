# Regelwerk „Propriozeptives Tribunal"
## Verbindliche Leitplanken für die Weiterentwicklung

**Version:** 1.0 · **Stand:** 17.08.2026
**Verhältnis zu `Konzept.md`:** Das Konzept ist die Vision und bleibt unverändert.
Dieses Regelwerk ist die verbindliche Auslegung für die Umsetzung. Bei Widerspruch
zwischen Konzept und Regelwerk gilt das Regelwerk – mit Begründung und Datum unter §7.

---

## §0 Zweck

Jede Änderung an dieser App wird gegen dieses Regelwerk geprüft, bevor sie gebaut
wird. Regeln sind kurz, prüfbar und mit R-Nummer zitierbar. Ein Backlog-Item ohne
Bezug zu mindestens einer Regel ist kein Item, sondern eine Idee.

---

## §1 Unverhandelbare Leitplanken (aus dem Konzept)

**R1 — Keine virtuelle Klaviatur.**
Nie, in keinem Modus, auch nicht als „Hilfe für Anfänger". Erlaubt sind: Topographie-Band
(Reliefs der schwarzen Inselgruppen), Notensystem, Textanweisungen. Der Demo-Modus
listet Tastenbelegungen als Text, nicht als Grafik.

**R2 — Jede Rückmeldung ist zweistufig.**
Groß: unmittelbar ausführbare Handlungsanweisung ohne Theoriekenntnis
(`FINGER 5: eine Taste tiefer`). Klein darunter: Fachbegriff (`Quinte −1 Halbton`).
Eine Meldung ohne kleine Ebene ist unvollständig, eine ohne große Ebene ist unbrauchbar.

**R3 — Ein Vektor pro Fehler.**
Bei mehreren falschen Tönen wird genau **eine** Korrektur angezeigt: der gröbste Fehler.
Fehlerlisten sind verboten.

**R4 — Messen statt meinen.**
Jeder Anschlag wird auf Tonhöhe **und** Zeit gemessen. Timing wird immer in
Millisekunden mit Vorzeichen ausgegeben. Keine Wertungen wie „gut" ohne Zahl.

**R5 — Keine Gamification.**
Keine Punkte, keine Streak-Feiern, keine Abzeichen, keine Konfetti. Die Serienanzeige
(`n/8`) ist ein Messwert, kein Belohnungssystem. Sprache bleibt nüchtern.

**R6 — Landscape-First, MIDI-First.**
Querformat ist der einzige gestaltete Zustand. Während einer laufenden Einheit wird
nichts angetippt: alle Eingaben laufen über MIDI. Touch nur in Menü, Setup und Steckbrief.

**R7 — Lokal und offline.**
Kein Konto, kein Server, keine Telemetrie. Alles läuft offline. Der Nutzer wird
darauf hingewiesen, dass sein Fortschritt gerätegebunden ist.

**R8 — Der Farbcode ist Bedeutung, keine Dekoration.**
Bernstein = Zeit und Reise. Signalgrün = getroffene Wahrheit. Hartes Rot = geometrischer
Fehler. Grau = Struktur. Andere Farben brauchen eine Regeländerung, keinen Commit.

**R9 — Deutsche Musiksprache.**
Notennamen deutsch (`H` = B natural, `B` = Bb). UI-Sprache Deutsch. Stufen in römischen
Ziffern, Groß = Dur, Klein = Moll, `°` = vermindert.

**R10 — Ein Ziel pro Einheit.**
Jede Übung hat genau ein prüfbares Erfolgskriterium: 8 fehlerfreie Wiederholungen in
Folge im gewählten Toleranzfenster. Kein zweites Nebenziel.

---

## §2 Beschlüsse dieser Sitzung (ergänzen bzw. ändern das Konzept)

**R11 — Alles ist jederzeit spielbar.** *(ändert Konzept §5.1 Freischaltkriterium)*
Alle 5 Stufen, alle 10 Tonarten, alle Diktat-Modi A/B/C und alle Akkordfolgen sind
ohne Vorbedingung wählbar. Schlösser gibt es nicht mehr.
Der Fortschritt bleibt vollständig erhalten und wird weiter gemessen und angezeigt;
er **informiert**, er **sperrt nicht**. Der Stufenplan markiert sichtbar die *empfohlene
nächste* Einheit (erste nicht abgeschlossene Stufe, Modus A vor B).
*Begründung:* Das Konzept will ein Messinstrument, kein Belohnungssystem (R5). Ein
Schloss ist eine Belohnungsmechanik. Die didaktische Reihenfolge wird empfohlen, nicht erzwungen.

**R12 — Lagenregel: feste Anker-Oktave + wählbare Lage.** *(präzisiert Konzept §3/§4.4)*
1. Innerhalb einer Einheit liegt der **Grundton jedes Akkords in derselben Anker-Oktave**.
   Es gibt keine automatische „nächstliegende Lage". Die Mulde bleibt an ihrem Ort.
2. Die Anker-Oktave ist im Setup wählbar (Standard `C4`, wählbar mindestens `C3`, `C4`, `C5`).
   Ausgangspunkt ist immer die Tonika der aktiven Tonart in dieser Oktave.
3. Ein Akkord, dessen Grundton oberhalb der Tonika liegt, wird **aufwärts** gebaut –
   nie sprungweise nach unten. Der größte Grundton-Abstand innerhalb einer Tonart ist
   damit die große Septime aufwärts, nie mehr.
4. Übung 2 verschiebt diesen Block als Ganzes um **genau ±1 Oktave** in die Zielzone.
   Die Handform bleibt identisch; nur der Ort wechselt.
5. Die Lage ist Teil der Einheit und steht im Steckbrief.

**R13 — Übung 1 prüft Tonhöhenklassen, Übung 2 zusätzlich das Register.**
Übung 1 wertet ausschließlich Pitch Classes: die Oktave, in der du greifst, ist frei.
Übung 2 prüft zusätzlich, ob der Block in der richtigen Zone liegt. Die Register-Prüfung
misst gegen die Anker-Oktave aus R12, nicht gegen einen Mittelwert.

**R14 — Akkordfolgen sind Daten, nicht Code.**
Eine neue Folge ist ein Datensatz in einer Liste, sonst nichts. Kein `if` auf einen
Folgen-Namen, keine Sonderbehandlung im Scheduler. Jede Folge trägt: `id`, `name`,
`kategorie`, Stufen für Dur und/oder Moll, harmonische Logik in einem Satz,
Fingersatz-Hinweis, Eignung für Übung 2. Der Bestand ist in `docs/Akkordfolgen.md`
definiert; die Implementierung bildet ihn 1:1 ab.

**R15 — Stufen-Vokabular ist explizit und vollständig.**
Erlaubte Stufenbezeichner:
- Dur: `I ii iii IV V vi vii°`
- Moll (natürlich): `i ii° III iv v VI VII`
- Moll (harmonisch): `V` (Dur-Dominante), `vii°` (Leittondreiklang)

`VII` in Moll bedeutet **immer** den Dur-Dreiklang auf der kleinen Septime (in a-Moll:
G-Dur). Der Leittondreiklang heißt **immer** `vii°` (in a-Moll: Gis°). Beide müssen
parallel verfügbar sein.

**R16 — Unbekannte Stufe ist ein lauter Fehler.**
Eine Akkordfolge, deren Stufe im aktiven Tongeschlecht nicht auflösbar ist, darf
**nicht** stillschweigend gekürzt werden. Sie wird in der Auswahl als nicht verfügbar
markiert und in der Entwicklung als Fehler geloggt.

---

## §3 Ablauf- und Zustandsregeln (gegen Hänger und Anzeigebrüche)

**R17 — Es gibt genau einen Zustandsautomaten.**
Zustände: `IDLE → ARMED → RUNNING ⇄ PAUSED → ENDED`.

| Zustand | Bedeutung | Uhr | Eingabe |
|---|---|---|---|
| `ARMED` | Ziel steht, wartet auf den ersten korrekten Anschlag | steht | Wiedereinstiegsprüfung |
| `RUNNING` | Takt läuft | läuft | Beat-Auswertung |
| `PAUSED` | nach Fehlgriff/Auslassen im Stopp-Modus | steht | Wiedereinstiegsprüfung |
| `ENDED` | Einheit verlassen | aus | – |

Jeder Übergang setzt **alle** zugehörigen Ressourcen zurück: Scheduler, Auswerte-Timer,
Wiedereinstiegs-Timer, Notenpuffer, Cursor-Uhr. Kein Übergang darf einen Timer
überleben lassen. Übergänge finden nur an dieser einen Stelle statt.

**R18 — Audio wird ausschließlich in einer echten Nutzergeste geöffnet.**
Der `AudioContext` wird im Klick-Handler von „Einheit starten" erzeugt und fortgesetzt –
nie in einem `useEffect`, nie in einem `setTimeout`, nie aus einem MIDI-Callback.
Ist der Kontext trotzdem blockiert, zeigt die App das sichtbar an
(`Audio blockiert – zum Aktivieren tippen`) statt stumm stehenzubleiben.
Bei `visibilitychange` zurück auf sichtbar wird der Kontext geprüft und fortgesetzt.

**R19 — Die AudioContext-Zeit ist die einzige Uhr.**
`performance.now()` wird nur über einen explizit gepflegten Offset in diese Zeit
umgerechnet. Der Scheduler wird **nie** auf einen Zeitpunkt in der Vergangenheit
gestartet: der Startzeitpunkt wird in ganzen Intervallschritten vorgeschoben, bis er
in der Zukunft liegt, und die Beat-Nummerierung entsprechend korrigiert. Klicks für
vergangene Zeitpunkte werden verworfen, nicht nachgeholt.

**R20 — Anschlagserfassung ist ein dynamisches Sammelfenster.**
Ein Akkord ist die Menge der Töne von einem ersten Anschlag an, solange innerhalb von
80 ms ein weiterer Ton folgt – gedeckelt bei einer harten Obergrenze
(Standard 300 ms, nie mehr als die halbe Beat-Dauer). Ein starres Fenster ist verboten,
weil es gerollte Akkorde und schnelle Zweitversuche in einen falschen Versuch presst.
Nach Fensterende wird genau einmal bewertet und der Puffer geleert.

**R21 — Auswertungsfenster leiten sich aus Tempo und Toleranz ab.**
Vorlauf- und Nachlauffenster der Beat-Bewertung sind Funktionen von Beat-Dauer und
gewählter Toleranz, nicht Konstanten. Bei ±20 ms darf die Bewertung nicht mit
demselben Fenster arbeiten wie bei ±50 ms.

**R22 — Kein Bildschirmzustand bleibt stehen.**
Feedback, Banner und Pausen-Hinweis haben eine definierte Lebensdauer.
Ein Banner blockiert nie den Takt und nie die Eingabe; es verschwindet spätestens
nach 4 Sekunden oder mit dem nächsten Anschlag. Nach einem Zustandswechsel nach
`RUNNING` wird veraltetes Feedback verworfen. Ein Zustand, den nur ein Tap auflösen
kann, verletzt R6.

**R23 — Fehlermeldungen decken alle Fälle ab.**
Das Tribunal muss mindestens unterscheiden:
zu tief/zu hoch gegriffen (Vektor), **fehlender Ton** (`Finger 5 fehlt`),
**überzähliger Ton** (`ein Ton zu viel – X loslassen`), falsche Zone (Übung 2),
kein Anschlag, Timing daneben. `Akkord nicht gefunden` ist ein Notnagel und darf
nur erscheinen, wenn kein einziger Zielton getroffen wurde.

---

## §4 Datenregeln

**R24 — Genau eine Persistenzschicht.**
Aller Lese- und Schreibzugriff auf gespeicherte Daten läuft über `src/lib/store.ts`.
Direkte `localStorage`-Aufrufe außerhalb dieser Datei sind verboten – auch „nur kurz".

**R25 — Gespeicherte Daten tragen eine Schema-Version.**
Jeder Datensatz hat `version`. Beim Laden wird migriert oder sauber auf Standard
zurückgefallen. Ein Schema-Bruch darf nie den Fortschritt löschen, ohne dass der
Nutzer es erfährt.

**R26 — Tonhöhenfehler und Timingfehler werden getrennt gezählt.**
Ein Anschlag mit korrekten Tönen außerhalb des Toleranzfensters ist **kein**
Akkordfehler. Die Fehler-Heatmap zeigt Griffe, die Drift-Linie zeigt Zeit. Vermischung
macht beide Statistiken wertlos (Konzept §6).

**R27 — Die Fehlerhistorie ist finger-aufgelöst.**
Gespeichert wird pro Tonart, Akkord **und Finger** (Grundton/Terz/Quinte) die Richtung
und Größe der Abweichung. Modus C gewichtet daraus.

---

## §5 Definition of Done

Ein Item gilt als erledigt, wenn **alle** Punkte zutreffen:

1. `npm run build` und `npm run lint` laufen ohne Fehler und ohne neue Warnungen.
2. Die Akzeptanzkriterien des Items sind einzeln nachweisbar erfüllt.
3. Der Nachweis ist **ohne MIDI-Hardware** im Demo-Modus reproduzierbar; steht ein
   Kriterium nur mit Hardware fest, ist der Prüfweg im Item beschrieben.
4. Musik-Logik (Stufenbildung, Buchstabierung, Lage, Akkordfolgen-Auflösung) ist durch
   automatische Tests abgedeckt.
5. Keine `any`, keine leeren `catch`-Blöcke ohne Begründungskommentar, keine
   `as unknown as`-Zugriffe auf private Methoden.
6. Ein Item = ein Commit-Bereich. Keine Sammelcommits über Prioritätsstufen hinweg.
7. Betrifft die Änderung eine Regel, wird die Regel zitiert (`R12`) – nicht umschrieben.

---

## §6 Arbeitsweise

- **Reihenfolge:** P0 vor P1 vor P2 … Innerhalb einer Stufe von oben nach unten.
- **Kein Neubau.** Bestehende Module werden korrigiert und erweitert. Ein Rewrite ist
  eine eigene Entscheidung mit eigener Begründung, kein Nebeneffekt eines Bugfixes.
- **Bei Unsicherheit wird gefragt**, bevor gebaut wird. Eine offene Frage im Backlog
  (`❓`) blockiert das Item, bis sie beantwortet ist.
- **Konzepttreue schlägt Bequemlichkeit.** Wenn eine einfache Lösung gegen §1 verstößt,
  ist sie keine Lösung.

---

## §7 Änderungslog gegenüber `Konzept.md`

| Datum | Regel | Änderung | Begründung |
|---|---|---|---|
| 17.08.2026 | R11 | Freischaltkriterium §5.1 entfällt als Sperre, bleibt als Messung | Schlösser sind Belohnungsmechanik und widersprechen R5 |
| 17.08.2026 | R12 | Lage wird explizit festgelegt und wählbar (Konzept schweigt dazu) | Ohne feste Anker-Oktave zerfällt die Griffmulden-Didaktik (Konzept §3) |
| 17.08.2026 | R14 | Akkordfolgen-Datenbank wächst von 6 auf ~28, in Kategorien | Datensätze sind billig und vervielfachen den Übungswert |
| 17.08.2026 | R15 | Moll-Stufen werden in natürlich und harmonisch getrennt | `VII` und `vii°` sind verschiedene Akkorde; das Konzept nutzt beide |
| offen ❓ | – | Editor für eigene Akkordfolgen (Konzept §3 „Später") | Als Backlog-Item B-27 vorgemerkt, Umsetzung noch nicht beschlossen |
| offen ❓ | – | Speicherung IndexedDB (Konzept §6) vs. localStorage (Ist-Zustand) | Siehe B-24 |
| offen ❓ | – | Notensystem auch in Übung 1 (Konzept §8 Layout) | Siehe B-28 |
