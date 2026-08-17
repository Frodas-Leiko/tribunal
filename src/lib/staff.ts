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

/** Akkord in Terzschicht buchstabieren (Grundstellung). */
export function spellTriad(chord: ChordDef, key: KeyDef, octaveShift = 0): SpelledNote[] {
  // Stufen-Index des Grundtons in der Skala
  const scale = key.mode === 'dur' ? key.scale : [...key.scale.slice(0, 6), (key.scale[6] + 1) % 12];
  const deg = scale.indexOf(chord.pcs[0]);
  const base = tonicLetter(key);
  const rootLetter = ((base + Math.max(deg, 0)) % 7 + 7) % 7;

  // Grundton-Oktave: nahe C4 (60), optional verschoben
  const targetRoot = 60 + octaveShift * 12;
  let rootMidi = chord.pcs[0];
  while (rootMidi < targetRoot - 6) rootMidi += 12;
  while (rootMidi > targetRoot + 6) rootMidi -= 12;
  if (chord.pcs[0] === 0) rootMidi = targetRoot; // C exakt auf C4

  const rootOct = Math.floor(rootMidi / 12) - 1;
  const letters = [rootLetter, (rootLetter + 2) % 7, (rootLetter + 4) % 7];

  const notes: SpelledNote[] = [];
  let oct = rootOct;
  let prevLetter = letters[0];
  for (let i = 0; i < 3; i++) {
    const L = letters[i];
    if (i > 0 && L < prevLetter) oct += 1; // Buchstabe über H hinaus → Oktave hoch
    prevLetter = L;
    let acc = chord.pcs[i] - NATURAL_PC[L];
    // Normalisieren auf -1..1
    while (acc > 6) acc -= 12;
    while (acc < -6) acc += 12;
    const accClamped = (acc === 0 ? 0 : acc > 0 ? 1 : -1) as -1 | 0 | 1;
    const midi = 12 * (oct + 1) + NATURAL_PC[L] + acc;
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
