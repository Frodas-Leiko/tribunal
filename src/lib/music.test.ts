// Tests der Musik-Logik (Regelwerk §5.4).
// Der Import läuft absichtlich über den Alias `@/` – damit prüft schon dieser
// Test mit, dass Test- und Build-Auflösung identisch sind.

import { describe, expect, it } from 'vitest';
import { getKey, pcName, tribunal, type ChordDef } from '@/lib/music';

describe('deutsche Notennamen (R9)', () => {
  it('nennt Pitch Class 11 „H" und Pitch Class 10 „B"', () => {
    expect(pcName(11)).toBe('H');
    expect(pcName(10)).toBe('B');
  });

  it('rechnet Pitch Classes außerhalb 0..11 in die Oktave zurück', () => {
    expect(pcName(12)).toBe('C');
    expect(pcName(-1)).toBe('H');
  });
});

// ── Tribunal (B-05, R23/R2/R3) ──────────────────────────────────────────────
// Die Akkorde stehen absichtlich als Literale hier und kommen nicht aus
// diatonicChords(): dessen Lage-Logik wird in P1 (B-07) noch geändert.

describe('tribunal', () => {
  const dDur = getKey('D-dur');                                   // Skala: D E Fis G A H Cis
  const tonika: ChordDef = { degree: 'I', name: 'D-Dur', pcs: [2, 6, 9], quality: 'dur' };
  const zweite: ChordDef = { degree: 'ii', name: 'E-Moll', pcs: [4, 7, 11], quality: 'moll' };

  describe('Rang 1 · Vektor (bestehendes Verhalten, AK 3)', () => {
    it('nennt den Finger und die Richtung, wenn ein Ton zu hoch liegt', () => {
      // D – Fis – B statt D – Fis – A: die Quinte liegt einen Halbton zu hoch
      const v = tribunal(tonika, new Set([2, 6, 10]), dDur);
      expect(v.big).toBe('Kleiner Finger (Finger 5): eine Taste tiefer');
      expect(v.small).toBe('Quinte +1 Halbton');
      expect(v.direction).toBe(1);
    });

    it('nennt die Gegenrichtung, wenn ein Ton zu tief liegt', () => {
      // D – F – A statt D – Fis – A: die Terz liegt einen Halbton zu tief
      const v = tribunal(tonika, new Set([2, 5, 9]), dDur);
      expect(v.big).toBe('Mittelfinger (Finger 3): eine Taste höher');
      expect(v.small).toBe('Terz −1 Halbton');
      expect(v.direction).toBe(-1);
    });

    it('zeigt bei mehreren Fehlern nur den kleinsten Abstand (R3)', () => {
      // C – Fis – B statt D – Fis – A: der Grundton liegt zwei Tasten daneben,
      // die Quinte nur eine → gemeldet wird die Quinte.
      const v = tribunal(tonika, new Set([0, 6, 10]), dDur);
      expect(v.big).toBe('Kleiner Finger (Finger 5): eine Taste tiefer');
      expect(v.small).toBe('Quinte +1 Halbton');
    });

    it('schreibt den Plural der Tastenanzahl aus', () => {
      // D – Fis – H: die Quinte liegt zwei Tasten zu hoch.
      // „Halbtone" ist der unveränderte Bestand (AK 3), nicht Absicht.
      const v = tribunal(tonika, new Set([2, 6, 11]), dDur);
      expect(v.big).toBe('Kleiner Finger (Finger 5): 2 Tasten tiefer');
      expect(v.small).toBe('Quinte +2 Halbtone');
    });
  });

  describe('Rang 2 · fehlender Ton (AK 1)', () => {
    it('nennt den fehlenden Finger, wenn kein überzähliger Ton liegt', () => {
      const v = tribunal(tonika, new Set([2, 6]), dDur);
      expect(v.big).toBe('Kleiner Finger (Finger 5) fehlt');
      expect(v.small).toBe('Quinte fehlt');
      expect(v.direction).toBe(0);
    });

    it('erkennt auch die fehlende Terz', () => {
      const v = tribunal(tonika, new Set([2, 9]), dDur);
      expect(v.big).toBe('Mittelfinger (Finger 3) fehlt');
      expect(v.small).toBe('Terz fehlt');
    });

    it('nennt bei zwei fehlenden Tönen den tieferen Finger (R3)', () => {
      // nur die Terz liegt: Grundton und Quinte fehlen → Grundton trägt die Mulde
      const v = tribunal(tonika, new Set([6]), dDur);
      expect(v.big).toBe('Daumen (Finger 1) fehlt');
      expect(v.small).toBe('Grundton fehlt');
    });
  });

  describe('Rang 3 · überzähliger Ton (AK 2)', () => {
    it('nennt den loszulassenden Ton und die fremde Tonart', () => {
      // D – Fis – A + C: das C gehört nicht zu D-Dur
      const v = tribunal(tonika, new Set([2, 6, 9, 0]), dDur);
      expect(v.big).toBe('Ein Ton zu viel: C loslassen');
      expect(v.small).toBe('nicht in D-Dur');
      expect(v.direction).toBe(0);
    });

    it('nennt bei einem leitereigenen Fremdton den Akkord statt der Tonart', () => {
      // E – G – H + Fis: das Fis gehört zu D-Dur, aber nicht zu diesem Akkord
      const v = tribunal(zweite, new Set([4, 7, 11, 6]), dDur);
      expect(v.big).toBe('Ein Ton zu viel: Fis loslassen');
      expect(v.small).toBe('nicht in E-Moll');
    });
  });

  describe('Rang 4 · Notnagel (AK 4)', () => {
    it('erscheint, wenn überhaupt nichts gegriffen wurde', () => {
      const v = tribunal(tonika, new Set(), dDur);
      expect(v.big).toBe('Akkord nicht gefunden');
      expect(v.small).toBe('Ziel: D-Dur – Mulde komplett neu formen.');
      expect(v.direction).toBe(0);
    });

    it('erscheint für keine andere Griffkombination', () => {
      // Alle 4096 Teilmengen der 12 Tonhöhenklassen. Ausgenommen ist nur der
      // korrekte Griff selbst – dafür wird das Tribunal nie aufgerufen.
      const target = new Set(tonika.pcs);
      for (let bits = 0; bits < 1 << 12; bits++) {
        const played = new Set<number>();
        for (let pc = 0; pc < 12; pc++) if (bits & (1 << pc)) played.add(pc);
        const korrekt = played.size === target.size && [...target].every((pc) => played.has(pc));
        if (korrekt) continue;

        const v = tribunal(tonika, played, dDur);
        expect(v.big === 'Akkord nicht gefunden', `Griff ${[...played].join(',')}`).toBe(played.size === 0);
        // R2: beide Ebenen sind immer besetzt · AK 6: Richtung ist nie geraten
        expect(v.big.length, `Griff ${[...played].join(',')}`).toBeGreaterThan(0);
        expect(v.small.length, `Griff ${[...played].join(',')}`).toBeGreaterThan(0);
        expect([1, -1, 0], `Griff ${[...played].join(',')}`).toContain(v.direction);
      }
    });
  });
});
