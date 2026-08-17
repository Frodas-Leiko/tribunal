// ── Notensystem: deutsche Buchstaben-Logik & Staff-Positionen ───────────────

import type { ChordDef, KeyDef } from './music';

// Deutsche Naturtöne: C D E F G A H  (H = B natural)
export const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11]; // C..H

export interface SpelledNote {
  midi: number;
  letterIdx: number;   // 0..6 (C..H)
  octave: number;
  accidental: -1 | 0 | 1;
  diatonic: number;    // octave*7 + letterIdx (C4 = 28)
}

/** Buchstabe der Tonika (Tonarten in dieser App sind alle „natürliche" Buchstaben außer B-Dur). */
function tonicLetter(key: KeyDef): number {
  const map: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6, 10: 6 /* B-Dur: Buchstabe B = H mit ♭ */ };
  return map[key.tonic] ?? 0;
}

// ── Lage / Anker-Oktave (R12) ────────────────────────────────────────────────
// Die Lage ist das C, ab dem die Tonika gebaut wird: `C4` heißt, die Tonika liegt
// in der Oktave C4…H4. In C-Dur ist das C4 (60), in B-Dur B4 (70).

export const ANCHORS = [48, 60, 72] as const; // C3 · C4 · C5
export const ANCHOR_DEFAULT = 60;             // C4

export function anchorLabel(anchor: number): string {
  return `C${Math.floor(anchor / 12) - 1}`;
}

/**
 * Akkord in Terzschicht buchstabieren (Grundstellung).
 *
 * R12: Ausgangspunkt ist immer die Tonika in der Anker-Oktave; jede Stufe wird von
 * dort **aufwärts** gebaut. Der größte Grundton-Abstand innerhalb einer Tonart ist
 * damit die große Septime (11 Halbtöne) – es gibt keinen Sprung nach unten und keine
 * „nächstliegende Lage". `octaveShift` verschiebt den fertigen Block als Ganzes um
 * genau eine Oktave (R12.4, Übung 2); die Handform bleibt identisch.
 */
export function spellTriad(chord: ChordDef, key: KeyDef, octaveShift = 0, anchor: number = ANCHOR_DEFAULT): SpelledNote[] {
  // Stufen-Index des Grundtons in der Skala. Nicht auflösbare Stufen fallen auf den
  // Tonika-Buchstaben zurück; der laute Fehler dafür ist B-21 (R16), das vollständige
  // Moll-Vokabular B-19.
  const scale = key.mode === 'dur' ? key.scale : [...key.scale.slice(0, 6), (key.scale[6] + 1) % 12];
  const deg = scale.indexOf(chord.pcs[0]);
  const base = tonicLetter(key);
  const rootLetter = ((base + Math.max(deg, 0)) % 7 + 7) % 7;

  const tonicMidi = anchor + key.tonic;
  const rootMidi = tonicMidi + ((chord.pcs[0] - key.tonic + 12) % 12) + octaveShift * 12;
  const letters = [rootLetter, (rootLetter + 2) % 7, (rootLetter + 4) % 7];

  const notes: SpelledNote[] = [];
  for (let i = 0; i < 3; i++) {
    // Terzschichtung: Terz und Quinte liegen über dem Grundton, innerhalb einer Oktave.
    notes.push(spellNote(rootMidi + ((chord.pcs[i] - chord.pcs[0] + 12) % 12), letters[i]));
  }
  return notes;
}

/** Klingende Höhe + Buchstabe → Notenkopf-Position und Vorzeichen. */
function spellNote(midi: number, letterIdx: number): SpelledNote {
  let acc = (midi % 12) - NATURAL_PC[letterIdx];
  // Normalisieren auf -1..1
  while (acc > 6) acc -= 12;
  while (acc < -6) acc += 12;
  const accClamped = (acc === 0 ? 0 : acc > 0 ? 1 : -1) as -1 | 0 | 1;
  // Die Oktave folgt aus Buchstabe und Vorzeichen, nicht aus `midi / 12`: bei Ces oder
  // His liegt die Buchstaben-Oktave neben der MIDI-Oktave – und `diatonic` trägt jede
  // y-Position im Notensystem. Die Division geht immer auf (beides ≡ pc mod 12).
  const octave = (midi - acc - NATURAL_PC[letterIdx]) / 12 - 1;
  return { midi, letterIdx, octave, accidental: accClamped, diatonic: octave * 7 + letterIdx };
}

/**
 * Diatonischer Rahmen einer Einheit: von der Tonika in der Lage bis zur Quinte der
 * höchsten Stufe. Der höchste Grundton liegt sechs Buchstaben über der Tonika
 * (R12.3), seine Quinte vier weitere – zusammen zehn Stufen.
 *
 * Der Rahmen hängt nur von Tonart und Lage ab und steht damit für die ganze
 * Einheit fest. Genau das ist der Zweck: Er hält Systemlinien und Zeichenfläche
 * ruhig, während die Notenköpfe von Akkord zu Akkord wandern.
 */
export function unitFrame(key: KeyDef, anchor: number = ANCHOR_DEFAULT): { lo: number; hi: number } {
  const lo = spellNote(anchor + key.tonic, tonicLetter(key)).diatonic;
  return { lo, hi: lo + 10 };
}

// ── Zonen ────────────────────────────────────────────────────────────────────

export type Zone = 'zenit' | 'zentrum' | 'nadir';

/** Violinschlüssel: untere Linie = E4 (diatonic 30), obere Linie = F5 (diatonic 35+... ) */
// E4 = 4*7+2 = 30, F5 = 5*7+3 = 38? Nein: F5 = 5*7+3 = 38. Prüfen: E4..F5 = 30..38? 5 Linien: E4 G4 H4 D5 F5 = 30,32,34,36,38. ✓
export const BOTTOM_LINE = 30;
export const TOP_LINE = 38;

/**
 * Lage einer **einzelnen** Note zum System: oberhalb, im System, unterhalb.
 * Steuert die Hilfslinien – nicht die Zuordnung eines Blocks zu einer Zone.
 * Dafür ist `zoneOfShift()` zuständig (B-10, R4).
 */
export function zoneOf(diatonic: number): Zone {
  if (diatonic > TOP_LINE) return 'zenit';
  if (diatonic < BOTTOM_LINE) return 'nadir';
  return 'zentrum';
}

/** Oktav-Versatz je Zone – Übung 2 verschiebt den Block um genau eine Oktave (R12.4). */
export const ZONE_SHIFT: Record<Zone, number> = { zenit: 1, zentrum: 0, nadir: -1 };

/**
 * Die Zone eines Blocks folgt der beabsichtigten Verschiebung (B-10). Sie ist eine
 * Vorgabe, keine Messung: sie aus einem einzelnen Notenkopf zurückzurechnen, hat
 * Leuchten und Beschriftung auseinanderlaufen lassen (R4).
 */
export function zoneOfShift(shift: number): Zone {
  return shift > 0 ? 'zenit' : shift < 0 ? 'nadir' : 'zentrum';
}

// ── Register (Übung 2, R13) ─────────────────────────────────────────────────

/** Bis hierher gilt die Zone als getroffen; ab ±6 Halbtönen ist es ein Oktavfehler. */
export const REGISTER_TOLERANCE = 5;

/**
 * Abweichung der gegriffenen Lage von der Ziel-Lage, gemessen am **Grundton**
 * (R13, B-12): der gespielte Grundton, der dem Ziel am nächsten liegt, gegen den
 * Grundton des Zielakkords. Ein Mittelwert über alle drei Töne wäre hier falsch –
 * er hängt von der Akkordart ab und lässt sich in keine Anweisung übersetzen (R2).
 *
 * Ohne gespielten Grundton gibt es keine Aussage über die Oktave: dann 0. Der
 * Aufrufer prüft das Register erst, wenn die Tonhöhenklassen bereits stimmen –
 * der Grundton liegt dort immer vor.
 */
export function registerOffset(playedMidi: number[], targetRootMidi: number): number {
  const rootPc = ((targetRootMidi % 12) + 12) % 12;
  let best: number | null = null;
  for (const m of playedMidi) {
    if (((m % 12) + 12) % 12 !== rootPc) continue;
    const d = m - targetRootMidi;
    if (best === null || Math.abs(d) < Math.abs(best)) best = d;
  }
  return best ?? 0;
}

/** Große Zeile für einen Oktavfehler (R2: ausführbar, mit Richtung und Größe). */
export function registerHint(offset: number): string {
  const okt = Math.max(1, Math.round(Math.abs(offset) / 12));
  return `Hand: ${okt === 1 ? 'eine Oktave' : `${okt} Oktaven`} ${offset > 0 ? 'tiefer' : 'höher'}`;
}

// ── Zeichenfläche des Notensystems (B-09) ───────────────────────────────────

export const STAFF_WIDTH = 640;
export const LINE_GAP = 18;
// Luft über und unter dem Block innerhalb eines Zonenbandes. 12 px ist die
// Obergrenze, bei der sich zwei Bänder noch nicht berühren: zwischen zwei Zonen
// liegen 7 diatonische Stufen, der Dreiklang belegt davon 4, es bleiben 3 × 9 px.
const ZONE_PAD = 12;
/** Rand der Zeichenfläche außerhalb der Bänder. */
const EDGE_PAD = 16;

export interface StaffLayout {
  width: number;
  height: number;
  lineGap: number;
  /** y-Position einer diatonischen Stufe in dieser Zeichenfläche. */
  y: (diatonic: number) => number;
  /** y der fünf Systemlinien, von oben nach unten. */
  lines: number[];
  /** Bänder der drei Zonen: dort steht derselbe Block, um je eine Oktave versetzt. */
  zones: Record<Zone, { y: number; h: number }>;
}

/**
 * Die vertikale Ausdehnung wird aus dem Inhalt gerechnet, nicht gesetzt (B-09).
 *
 * Feste Zahlen (`viewBox` 640×240, `topLineY` 100) haben die Nadir-Zone aus dem
 * Bild geschoben: in C-Dur lag der nach unten versetzte Grundton bei y = 253.
 * Mit wählbarer Lage (B-08) wandert der ganze Bereich zusätzlich um ±7 Stufen je
 * Oktave. Hier stehen deshalb Zonenbänder **und** Zeichenfläche in derselben
 * diatonischen Rechnung wie die Notenköpfe.
 *
 * `frame` ist der Rahmen der Einheit (`unitFrame`) und bestimmt die Zeichenfläche:
 * Er ist für die ganze Einheit konstant, damit die Systemlinien stillstehen.
 * `base` ist der **unverschobene** aktuelle Block und bestimmt die Zonenbänder –
 * dieselbe Griffmulde, dreimal um je eine Oktave versetzt.
 */
export function staffLayout(base: { lo: number; hi: number }, frame: { lo: number; hi: number }): StaffLayout {
  const band = (z: Zone) => ({ lo: base.lo + 7 * ZONE_SHIFT[z], hi: base.hi + 7 * ZONE_SHIFT[z] });
  const bands = { zenit: band('zenit'), zentrum: band('zentrum'), nadir: band('nadir') };
  // Die Systemlinien gehören immer dazu, auch wenn der Block weit von ihnen weg steht.
  const dMax = Math.max(TOP_LINE, frame.hi + 7);
  const dMin = Math.min(BOTTOM_LINE, frame.lo - 7);

  const top = EDGE_PAD + ZONE_PAD;
  const y = (d: number) => top + (dMax - d) * (LINE_GAP / 2);
  const height = y(dMin) + ZONE_PAD + EDGE_PAD;

  const zones = {} as Record<Zone, { y: number; h: number }>;
  for (const z of Object.keys(bands) as Zone[]) {
    zones[z] = {
      y: y(bands[z].hi) - ZONE_PAD,
      h: (bands[z].hi - bands[z].lo) * (LINE_GAP / 2) + 2 * ZONE_PAD,
    };
  }

  return {
    width: STAFF_WIDTH,
    height,
    lineGap: LINE_GAP,
    y,
    lines: [0, 1, 2, 3, 4].map((i) => y(TOP_LINE - 2 * i)),
    zones,
  };
}

/**
 * Kartenausschnitt der Topographie (B-11): mindestens C2…C6, erweitert um die
 * gewählte Lage. Ein fester Bereich ab C4 ließ genau die Akkorde aus der Karte
 * fallen, für die sie gebraucht wird.
 *
 * Die Obergrenze folgt dem höchsten erreichbaren Ton der Einheit: Tonika in der
 * Lage, höchster Grundton eine große Septime darüber (R12.3), dessen Quinte
 * (verminderte Stufe: 6 Halbtöne) und die Zenit-Oktave – zusammen 29 Halbtöne
 * über der Tonika. Der Bereich hängt damit nur von Lage und Tonart ab und steht
 * für die ganze Einheit fest; er wandert nicht von Akkord zu Akkord.
 */
export function topographyRange(anchor: number, tonic = 0): { start: number; end: number } {
  return { start: Math.min(36, anchor - 12), end: Math.max(84, anchor + tonic + 29) };
}

// `staffY()` ist mit B-09 entfallen: Die y-Position kommt aus `staffLayout().y`,
// damit Notenköpfe, Zonenbänder und Zeichenfläche dieselbe Rechnung benutzen.
