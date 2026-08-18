// Tests der Lagen- und Buchstabier-Logik (Regelwerk §5.4, B-28 AK 2).
// Grundlage: R12 – feste Anker-Oktave, alle Stufen aufwärts, Block-Versatz um genau
// eine Oktave.

import { describe, expect, it } from 'vitest';
import {
  ANCHORS, ANCHOR_DEFAULT, BOTTOM_LINE, REGISTER_TOLERANCE, TOP_LINE,
  ZONE_SHIFT, anchorLabel, registerHint, registerOffset, spellTriad, staffLayout, unitFrame,
  topographyRange, zoneOf, zoneOfShift, type SpelledNote, type Zone,
} from '@/lib/staff';
import {
  DEGREE_VOCABULARY, KEYS, NATURAL_PC, chordForDegree, diatonicChords, getKey, spelledName,
  type ChordDef, type KeyDef,
} from '@/lib/music';

// Notenname aus Buchstabe und klingender Höhe – dieselbe Schreibregel, die auch
// die Akkordnamen trägt (B-19). Hier nur, um Zusagen und Fehlermeldungen lesbar
// zu halten; die Oktave hängt der Test selbst an.
const nameOf = (n: SpelledNote) => `${spelledName(n.letterIdx, n.midi % 12)}${n.octave}`;
const namesOf = (notes: SpelledNote[]) => notes.map(nameOf).join('–');

const SHIFTS = [-1, 0, 1];

/** Der vollständige Vorrat einer Tonart nach R15 – in Moll neun statt sieben Akkorde. */
function allChords(key: KeyDef): ChordDef[] {
  return DEGREE_VOCABULARY[key.mode].map((d) => {
    const chord = chordForDegree(key, d);
    if (!chord) throw new Error(`${d} fehlt im Vokabular von ${key.label}`);
    return chord;
  });
}

describe('Lage (R12.2)', () => {
  it('kennt C3, C4 und C5 und benennt sie', () => {
    expect(ANCHORS.map(anchorLabel)).toEqual(['C3', 'C4', 'C5']);
    expect(ANCHOR_DEFAULT).toBe(60);
    expect(anchorLabel(ANCHOR_DEFAULT)).toBe('C4');
  });
});

// Die Regressionsschleifen laufen über `allChords()`, nicht über die sieben Stufen
// der Sequenz: `v`, `VII` und `vii°` werden in Akkordfolgen genauso gespielt und
// gezeichnet wie die Stufen der Modi A/B/C (B-19, R15).

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
        for (const chord of allChords(key)) {
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
          for (const chord of allChords(key)) {
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

describe('spellTriad · Moll-Vokabular (B-19 AK 4)', () => {
  // Der Grundton des Leittondreiklangs liegt auf einer schwarzen Taste, die es in
  // der Skala nicht gibt. Vor B-19 fand `indexOf` ihn nicht und der Akkord bekam
  // stumm den Tonika-Buchstaben – in a-Moll stand dort `As°` statt `Gis°`.
  const fall = (keyId: string, degree: string) => {
    const key = getKey(keyId);
    const chord = chordForDegree(key, degree);
    if (!chord) throw new Error(`${degree} fehlt in ${keyId}`);
    return namesOf(spellTriad(chord, key));
  };

  it('schreibt den Leittondreiklang mit dem Buchstaben der siebten Stufe', () => {
    expect(fall('A-moll', 'vii°')).toBe('Gis5–H5–D6');   // nicht As°
    expect(fall('E-moll', 'vii°')).toBe('Dis5–Fis5–A5'); // nicht Es°
    expect(fall('D-moll', 'vii°')).toBe('Cis5–E5–G5');
    expect(fall('H-moll', 'vii°')).toBe('Ais5–Cis6–E6'); // nicht B°
    expect(fall('G-moll', 'vii°')).toBe('Fis5–A5–C6');
  });

  it('schreibt VII als Dur-Dreiklang auf der kleinen Septime – einen Halbton tiefer', () => {
    expect(fall('A-moll', 'VII')).toBe('G5–H5–D6');
    expect(fall('E-moll', 'VII')).toBe('D5–Fis5–A5');
    expect(fall('D-moll', 'VII')).toBe('C5–E5–G5');
    expect(fall('H-moll', 'VII')).toBe('A5–Cis6–E6');
    expect(fall('G-moll', 'VII')).toBe('F5–A5–C6');
  });

  it('schreibt die natürliche Moll-Dominante v mit demselben Buchstaben wie V', () => {
    expect(fall('A-moll', 'v')).toBe('E5–G5–H5');
    expect(fall('A-moll', 'V')).toBe('E5–Gis5–H5');
    expect(fall('G-moll', 'v')).toBe('D5–F5–A5');
    expect(fall('G-moll', 'V')).toBe('D5–Fis5–A5');
  });

  it('gibt VII und vii° denselben Buchstaben, aber verschiedene Grundtöne', () => {
    for (const key of KEYS.filter((k) => k.mode === 'moll')) {
      const sept = spellTriad(chordForDegree(key, 'VII')!, key);
      const leitton = spellTriad(chordForDegree(key, 'vii°')!, key);
      sept.forEach((n, i) => {
        expect(leitton[i].letterIdx, `${key.label}: Buchstabe ${i}`).toBe(n.letterIdx);
        expect(leitton[i].diatonic, `${key.label}: Notenzeile ${i}`).toBe(n.diatonic);
      });
      expect(leitton[0].midi - sept[0].midi, key.label).toBe(1);
      expect(leitton[0].accidental, key.label).toBe(1);
    }
  });
});

describe('Register-Prüfung (B-12, R13)', () => {
  // Ziel: C-Dur in Lage C4, Grundton C4 = 60. Gespielt wird der ganze Block.
  const ziel = 60;
  const block = (root: number) => [root, root + 4, root + 7];

  it('meldet keine Abweichung, wenn der Block in der Ziel-Oktave liegt', () => {
    expect(registerOffset(block(60), ziel)).toBe(0);
  });

  it('misst am Grundton, nicht am Mittelwert (AK 1)', () => {
    // Eine Oktave zu tief: der Mittelwert läge ebenfalls 12 daneben – entscheidend
    // ist aber, dass die Zahl vom Grundton kommt und nicht von der Akkordart.
    expect(registerOffset(block(48), ziel)).toBe(-12);
    expect(registerOffset(block(72), ziel)).toBe(12);
    // Verminderter Dreiklang: engere Spanne, gleiche Aussage über die Oktave.
    expect(registerOffset([48, 51, 54], 48)).toBe(0);
  });

  it('nimmt bei mehreren gegriffenen Grundtönen den nächstliegenden', () => {
    expect(registerOffset([48, 60, 72], ziel)).toBe(0);
    expect(registerOffset([36, 48], ziel)).toBe(-12);
  });

  it('gibt ohne gespielten Grundton keine Richtung vor', () => {
    expect(registerOffset([64, 67], ziel)).toBe(0);
    expect(registerOffset([], ziel)).toBe(0);
  });

  it('zieht die Grenze zwischen richtiger Zone und Oktavfehler bei ±6 (AK 2)', () => {
    expect(REGISTER_TOLERANCE).toBe(5);
    expect(Math.abs(registerOffset(block(60), ziel))).toBeLessThanOrEqual(REGISTER_TOLERANCE);
    expect(Math.abs(registerOffset(block(48), ziel))).toBeGreaterThan(REGISTER_TOLERANCE);
  });

  it('nennt Richtung und Größe als ausführbare Anweisung (R2)', () => {
    expect(registerHint(-12)).toBe('Hand: eine Oktave höher');
    expect(registerHint(12)).toBe('Hand: eine Oktave tiefer');
    expect(registerHint(24)).toBe('Hand: 2 Oktaven tiefer');
  });
});

describe('spellTriad · Block-Versatz und Lage (R12.2, R12.4)', () => {
  it('verschiebt den ganzen Block um genau eine Oktave (AK 4 in B-08)', () => {
    for (const key of KEYS) {
      for (const chord of allChords(key)) {
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
      for (const chord of allChords(key)) {
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

// ── Darstellung (Paket 3) ───────────────────────────────────────────────────

describe('Zonen-Zuordnung (B-10, R13)', () => {
  it('leitet die Zone aus der Verschiebung ab, nicht aus einem Notenkopf', () => {
    expect(zoneOfShift(0)).toBe('zentrum');
    expect(zoneOfShift(1)).toBe('zenit');
    expect(zoneOfShift(-1)).toBe('nadir');
    expect(ZONE_SHIFT.zenit).toBe(1);
    expect(ZONE_SHIFT.zentrum).toBe(0);
    expect(ZONE_SHIFT.nadir).toBe(-1);
  });

  it('widerspricht dem gemessenen Befund: die Terz allein trifft die Zone nicht', () => {
    // Zenit-versetzter C-Dur-Block C5–E5–G5: die Terz E5 hat diatonic 37, TOP_LINE
    // ist 38 – zoneOf() nennt das „zentrum", obwohl der Block im Zenit steht.
    const key = getKey('C-dur');
    const chord = diatonicChords(key).find((c) => c.degree === 'I')!;
    const zenit = spellTriad(chord, key, ZONE_SHIFT.zenit);
    expect(zoneOf(zenit[1].diatonic)).toBe('zentrum');   // die alte Herleitung
    expect(zoneOfShift(ZONE_SHIFT.zenit)).toBe('zenit'); // die neue
  });

  it('beschreibt mit zoneOf weiterhin die einzelne Note (AK 3)', () => {
    expect(zoneOf(TOP_LINE + 1)).toBe('zenit');
    expect(zoneOf(TOP_LINE)).toBe('zentrum');
    expect(zoneOf(BOTTOM_LINE)).toBe('zentrum');
    expect(zoneOf(BOTTOM_LINE - 1)).toBe('nadir');
  });
});

describe('Zeichenfläche des Notensystems (B-09)', () => {
  const ZONEN: Zone[] = ['zenit', 'zentrum', 'nadir'];

  it('hält Block, Zonen und Systemlinien in jeder Tonart, Lage und Zone im Bild (AK 1, AK 2)', () => {
    for (const key of KEYS) {
      for (const anchor of ANCHORS) {
        const frame = unitFrame(key, anchor);
        for (const chord of allChords(key)) {
          const base = spellTriad(chord, key, 0, anchor);
          const L = staffLayout({ lo: base[0].diatonic, hi: base[2].diatonic }, frame);
          const wo = `${key.label} ${chord.degree} in ${anchorLabel(anchor)}`;

          // Die fünf Systemlinien liegen im Bild
          for (const y of L.lines) {
            expect(y, `${wo}: Systemlinie`).toBeGreaterThanOrEqual(0);
            expect(y, `${wo}: Systemlinie`).toBeLessThanOrEqual(L.height);
          }

          for (const zone of ZONEN) {
            // Zonenband vollständig im Bild
            const band = L.zones[zone];
            expect(band.y, `${wo}: Band ${zone}`).toBeGreaterThanOrEqual(0);
            expect(band.y + band.h, `${wo}: Band ${zone}`).toBeLessThanOrEqual(L.height);

            // Notenköpfe samt Klammer (±12 px) im Bild – und im eigenen Band
            const block = spellTriad(chord, key, ZONE_SHIFT[zone], anchor);
            for (const n of block) {
              const y = L.y(n.diatonic);
              expect(y - 12, `${wo}: ${zone} Notenkopf`).toBeGreaterThanOrEqual(0);
              expect(y + 12, `${wo}: ${zone} Notenkopf`).toBeLessThanOrEqual(L.height);
              expect(y, `${wo}: ${zone} im Band`).toBeGreaterThanOrEqual(band.y);
              expect(y, `${wo}: ${zone} im Band`).toBeLessThanOrEqual(band.y + band.h);
            }

            // Hilfslinien zwischen Block und System liegen ebenfalls im Bild
            for (const n of block) {
              for (let l = TOP_LINE + 2; l <= n.diatonic; l += 2) {
                expect(L.y(l), `${wo}: Hilfslinie oben`).toBeGreaterThanOrEqual(0);
              }
              for (let l = BOTTOM_LINE - 2; l >= n.diatonic; l -= 2) {
                expect(L.y(l), `${wo}: Hilfslinie unten`).toBeLessThanOrEqual(L.height);
              }
            }
          }
        }
      }
    }
  });

  it('trennt die drei Bänder überschneidungsfrei, Zenit oben', () => {
    const key = getKey('C-dur');
    const L = staffLayout({ lo: 28, hi: 32 }, unitFrame(key)); // C4–G4
    expect(L.zones.zenit.y + L.zones.zenit.h).toBeLessThanOrEqual(L.zones.zentrum.y);
    expect(L.zones.zentrum.y + L.zones.zentrum.h).toBeLessThanOrEqual(L.zones.nadir.y);
  });

  it('behält den Zeilenabstand: eine diatonische Stufe ist ein halber Linienabstand', () => {
    const L = staffLayout({ lo: 28, hi: 32 }, unitFrame(getKey('C-dur')));
    expect(L.y(30) - L.y(31)).toBe(L.lineGap / 2);
    expect(L.lines[0]).toBe(L.y(TOP_LINE));
    expect(L.lines[4]).toBe(L.y(BOTTOM_LINE));
  });

  it('lässt die Systemlinien stehen, während die Noten wandern (Regression)', () => {
    // Die Zeichenfläche hängt am Rahmen der Einheit, nicht am aktuellen Akkord.
    // Sonst verschiebt jeder Stufenwechsel das ganze System um eine Notenzeile.
    for (const key of KEYS) {
      for (const anchor of ANCHORS) {
        const frame = unitFrame(key, anchor);
        const layouts = allChords(key).map((chord) => {
          const b = spellTriad(chord, key, 0, anchor);
          return staffLayout({ lo: b[0].diatonic, hi: b[2].diatonic }, frame);
        });
        const wo = `${key.label} in ${anchorLabel(anchor)}`;
        for (const L of layouts) {
          expect(L.height, `${wo}: Höhe`).toBe(layouts[0].height);
          expect(L.lines, `${wo}: Systemlinien`).toEqual(layouts[0].lines);
          expect(L.y(TOP_LINE), `${wo}: Bezugspunkt`).toBe(layouts[0].y(TOP_LINE));
        }
      }
    }
  });

  it('umfasst der Rahmen den ganzen Stufenvorrat der Tonart', () => {
    for (const key of KEYS) {
      for (const anchor of ANCHORS) {
        const frame = unitFrame(key, anchor);
        for (const chord of allChords(key)) {
          const b = spellTriad(chord, key, 0, anchor);
          const wo = `${key.label} ${chord.degree} in ${anchorLabel(anchor)}`;
          expect(b[0].diatonic, wo).toBeGreaterThanOrEqual(frame.lo);
          expect(b[2].diatonic, wo).toBeLessThanOrEqual(frame.hi);
        }
      }
    }
  });
});

describe('Kartenausschnitt der Topographie (B-11)', () => {
  it('umfasst mindestens C2…C6 (AK 1)', () => {
    for (const key of KEYS) {
      for (const anchor of ANCHORS) {
        const { start, end } = topographyRange(anchor, key.tonic);
        expect(start, `${key.label} ${anchorLabel(anchor)}`).toBeLessThanOrEqual(36);
        expect(end, `${key.label} ${anchorLabel(anchor)}`).toBeGreaterThanOrEqual(84);
        expect(start % 12, 'beginnt auf einem C').toBe(0);
      }
    }
  });

  it('enthält jeden Ton jeder Stufe – auch zenit- und nadir-versetzt (AK 1)', () => {
    for (const key of KEYS) {
      for (const anchor of ANCHORS) {
        const { start, end } = topographyRange(anchor, key.tonic);
        for (const chord of allChords(key)) {
          for (const shift of SHIFTS) {
            for (const n of spellTriad(chord, key, shift, anchor)) {
              const wo = `${key.label} ${chord.degree} in ${anchorLabel(anchor)} (${shift})`;
              expect(n.midi, wo).toBeGreaterThanOrEqual(start);
              expect(n.midi, wo).toBeLessThanOrEqual(end);
            }
          }
        }
      }
    }
  });
});
