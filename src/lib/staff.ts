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
    const L = letters[i];
    // Terzschichtung: Terz und Quinte liegen über dem Grundton, innerhalb einer Oktave.
    const midi = rootMidi + ((chord.pcs[i] - chord.pcs[0] + 12) % 12);
    let acc = chord.pcs[i] - NATURAL_PC[L];
    // Normalisieren auf -1..1
    while (acc > 6) acc -= 12;
    while (acc < -6) acc += 12;
    const accClamped = (acc === 0 ? 0 : acc > 0 ? 1 : -1) as -1 | 0 | 1;
    // Die Oktave folgt aus Buchstabe und Vorzeichen, nicht aus `midi / 12`: bei Ces oder
    // His liegt die Buchstaben-Oktave neben der MIDI-Oktave – und `diatonic` trägt jede
    // y-Position im Notensystem. Die Division geht immer auf (beides ≡ pc mod 12).
    const oct = (midi - acc - NATURAL_PC[L]) / 12 - 1;
    notes.push({ midi, letterIdx: L, octave: oct, accidental: accClamped, diatonic: oct * 7 + L });
  }
  return notes;
}

// ── Zonen ────────────────────────────────────────────────────────────────────

export type Zone = 'zenit' | 'zentrum' | 'nadir';

/** Violinschlüssel: untere Linie = E4 (diatonic 30), obere Linie = F5 (diatonic 35+... ) */
// E4 = 4*7+2 = 30, F5 = 5*7+3 = 38? Nein: F5 = 5*7+3 = 38. Prüfen: E4..F5 = 30..38? 5 Linien: E4 G4 H4 D5 F5 = 30,32,34,36,38. ✓
export const BOTTOM_LINE = 30;
export const TOP_LINE = 38;

export function zoneOf(diatonic: number): Zone {
  if (diatonic > TOP_LINE) return 'zenit';
  if (diatonic < BOTTOM_LINE) return 'nadir';
  return 'zentrum';
}

/** y-Position im SVG: Halbschritte in Linienabständen. lineGap = Abstand zweier Linien. */
export function staffY(diatonic: number, topLineY: number, lineGap: number): number {
  return topLineY - (diatonic - TOP_LINE) * (lineGap / 2);
}
