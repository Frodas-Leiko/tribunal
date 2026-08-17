// Tests der Lagen- und Buchstabier-Logik (Regelwerk §5.4, B-28 AK 2).
// Grundlage: R12 – feste Anker-Oktave, alle Stufen aufwärts, Block-Versatz um genau
// eine Oktave.

import { describe, expect, it } from 'vitest';
import {
  ANCHORS, ANCHOR_DEFAULT, NATURAL_PC, anchorLabel, spellTriad, type SpelledNote,
} from '@/lib/staff';
import { KEYS, diatonicChords, getKey } from '@/lib/music';

// Nur für lesbare Fehlermeldungen: Buchstabe + Vorzeichen → deutscher Notenname.
// Bewusst hier und nicht in `staff.ts` – die App braucht die Schreibweise nicht.
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
const FLAT: Record<string, string> = { C: 'Ces', D: 'Des', E: 'Es', F: 'Fes', G: 'Ges', A: 'As', H: 'B' };
function nameOf(n: SpelledNote): string {
  const L = LETTERS[n.letterIdx];
  const name = n.accidental === 1 ? `${L}is` : n.accidental === -1 ? FLAT[L] : L;
  return `${name}${n.octave}`;
}
const namesOf = (notes: SpelledNote[]) => notes.map(nameOf).join('–');

const SHIFTS = [-1, 0, 1];

describe('Lage (R12.2)', () => {
  it('kennt C3, C4 und C5 und benennt sie', () => {
    expect(ANCHORS.map(anchorLabel)).toEqual(['C3', 'C4', 'C5']);
    expect(ANCHOR_DEFAULT).toBe(60);
    expect(anchorLabel(ANCHOR_DEFAULT)).toBe('C4');
  });
});

describe('spellTriad · Anker-Oktave (B-07)', () => {
  it('baut C-Dur in Lage C4 auf den Grundtönen 60 62 64 65 67 69 71 (AK 2)', () => {
    const key = getKey('C-dur');
    const roots = diatonicChords(key).map((c) => spellTriad(c, key)[0].midi);
    expect(roots).toEqual([60, 62, 64, 65, 67, 69, 71]);
  });

  it('springt von IV nach V nicht mehr abwärts (Regression zum gemessenen Befund)', () => {
    const key = getKey('C-dur');
    const [vier, fuenf] = ['IV', 'V'].map((d) => {
      const chord = diatonicChords(key).find((c) => c.degree === d)!;
      return spellTriad(chord, key)[0].midi;
    });
    expect(fuenf - vier).toBe(2); // früher: −10 (große Septime abwärts)
  });

  it('hält jeden Grundton im Fenster Tonika … große Septime aufwärts (AK 1, AK 4)', () => {
    for (const key of KEYS) {
      for (const anchor of ANCHORS) {
        const tonicMidi = anchor + key.tonic;
        for (const chord of diatonicChords(key)) {
          const abstand = spellTriad(chord, key, 0, anchor)[0].midi - tonicMidi;
          expect(abstand, `${key.label} ${chord.degree} in ${anchorLabel(anchor)}`).toBeGreaterThanOrEqual(0);
          expect(abstand, `${key.label} ${chord.degree} in ${anchorLabel(anchor)}`).toBeLessThanOrEqual(11);
        }
      }
    }
  });
});

describe('spellTriad · Buchstabierung (AK 3, AK 4)', () => {
  it('schichtet Terzen und hält Vorzeichen, Oktave und Tonhöhe konsistent', () => {
    for (const key of KEYS) {
      for (const anchor of ANCHORS) {
        for (const shift of SHIFTS) {
          for (const chord of diatonicChords(key)) {
            const notes = spellTriad(chord, key, shift, anchor);
            const wo = `${key.label} ${chord.degree} (${chord.name}) in ${anchorLabel(anchor)}${shift ? ` ${shift > 0 ? '+' : ''}${shift} Okt.` : ''}`;

            // Tonhöhenklassen sind die des Akkords, in der Reihenfolge Grundton–Terz–Quinte
            notes.forEach((n, i) => expect(n.midi % 12, `${wo}: Ton ${i}`).toBe(chord.pcs[i]));

            // Grundstellung: streng aufsteigend, im Buchstabenraster je eine Terz
            expect(notes[1].midi, wo).toBeGreaterThan(notes[0].midi);
            expect(notes[2].midi, wo).toBeGreaterThan(notes[1].midi);
            expect(notes[1].diatonic - notes[0].diatonic, wo).toBe(2);
            expect(notes[2].diatonic - notes[1].diatonic, wo).toBe(2);

            for (const n of notes) {
              // Kein Doppelvorzeichen: der Buchstabe passt zur Tonhöhenklasse
              expect(Math.abs(n.accidental), `${wo}: ${nameOf(n)}`).toBeLessThanOrEqual(1);
              // Notenkopf-Position und Klang beschreiben denselben Ton
              expect(12 * (n.octave + 1) + NATURAL_PC[n.letterIdx] + n.accidental, `${wo}: ${nameOf(n)}`).toBe(n.midi);
              expect(n.diatonic, `${wo}: ${nameOf(n)}`).toBe(n.octave * 7 + n.letterIdx);
            }
          }
        }
      }
    }
  });

  it('buchstabiert die Stolperstellen der 10 Tonarten richtig', () => {
    const fall = (keyId: string, degree: string) => {
      const key = getKey(keyId);
      const chord = diatonicChords(key).find((c) => c.degree === degree)!;
      return namesOf(spellTriad(chord, key));
    };
    expect(fall('B-dur', 'I')).toBe('B4–D5–F5');       // Tonika auf schwarzer Taste, ♭ am Buchstaben H
    expect(fall('B-dur', 'IV')).toBe('Es5–G5–B5');     // zwei ♭ im selben Akkord
    expect(fall('H-moll', 'V')).toBe('Fis5–Ais5–Cis6'); // drei ♯, Leitton Ais
    expect(fall('A-moll', 'V')).toBe('E5–Gis5–H5');    // Gis: schwarze Taste in einer Tonart ohne Vorzeichen
    expect(fall('E-moll', 'ii°')).toBe('Fis4–A4–C5');  // verminderter Dreiklang, Quinte ohne Vorzeichen
    expect(fall('G-moll', 'ii°')).toBe('A4–C5–Es5');   // verminderte Quinte als ♭
  });
});

describe('spellTriad · Block-Versatz und Lage (R12.2, R12.4)', () => {
  it('verschiebt den ganzen Block um genau eine Oktave (AK 4 in B-08)', () => {
    for (const key of KEYS) {
      for (const chord of diatonicChords(key)) {
        const mitte = spellTriad(chord, key, 0);
        const oben = spellTriad(chord, key, 1);
        const unten = spellTriad(chord, key, -1);
        mitte.forEach((n, i) => {
          expect(oben[i].midi - n.midi, `${key.label} ${chord.degree}`).toBe(12);
          expect(oben[i].diatonic - n.diatonic, `${key.label} ${chord.degree}`).toBe(7);
          expect(n.midi - unten[i].midi, `${key.label} ${chord.degree}`).toBe(12);
          expect(n.diatonic - unten[i].diatonic, `${key.label} ${chord.degree}`).toBe(7);
        });
      }
    }
  });

  it('verschiebt mit der Lage denselben Griff um ganze Oktaven', () => {
    for (const key of KEYS) {
      for (const chord of diatonicChords(key)) {
        const c4 = spellTriad(chord, key, 0, 60);
        const c3 = spellTriad(chord, key, 0, 48);
        const c5 = spellTriad(chord, key, 0, 72);
        c4.forEach((n, i) => {
          expect(n.midi - c3[i].midi, `${key.label} ${chord.degree}`).toBe(12);
          expect(c5[i].midi - n.midi, `${key.label} ${chord.degree}`).toBe(12);
          // Die Handform bleibt identisch – nur der Ort wechselt (R12.4)
          expect(c3[i].letterIdx).toBe(n.letterIdx);
          expect(c5[i].accidental).toBe(n.accidental);
        });
      }
    }
  });
});
