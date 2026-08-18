// Tests der Musik-Logik (Regelwerk §5.4).
// Der Import läuft absichtlich über den Alias `@/` – damit prüft schon dieser
// Test mit, dass Test- und Build-Auflösung identisch sind.

import { describe, expect, it, vi } from 'vitest';
import {
  DEGREE_VOCABULARY, KEYS, PROGRESSIONS, chordForDegree, diatonicChords, getKey, pcName,
  resolveProgression, tribunal, type ChordDef, type ProgressionDef,
} from '@/lib/music';

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
  const tonika: ChordDef = { degree: 'I', step: 0, name: 'D-Dur', pcs: [2, 6, 9], quality: 'dur' };
  const zweite: ChordDef = { degree: 'ii', step: 1, name: 'E-Moll', pcs: [4, 7, 11], quality: 'moll' };

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

// ── Stufen-Vokabular (B-19, R15) ────────────────────────────────────────────
// Die Erwartung steht als Tabelle da und wird nicht gerechnet: sonst prüfte der
// Test dieselbe Formel, die er messen soll. Je Moll-Tonart alle neun Bezeichner
// mit Name und Tönen (AK 5 – deckt AK 1, 2 und 4 ab).

type Erwartung = [name: string, pcs: number[]];

const MOLL_VOKABULAR: Record<string, Record<string, Erwartung>> = {
  'A-moll': {
    'i':    ['A-Moll',   [9, 0, 4]],
    'ii°':  ['H°',       [11, 2, 5]],
    'III':  ['C-Dur',    [0, 4, 7]],
    'iv':   ['D-Moll',   [2, 5, 9]],
    'v':    ['E-Moll',   [4, 7, 11]],
    'VI':   ['F-Dur',    [5, 9, 0]],
    'VII':  ['G-Dur',    [7, 11, 2]],
    'V':    ['E-Dur',    [4, 8, 11]],
    'vii°': ['Gis°',     [8, 11, 2]],
  },
  'E-moll': {
    'i':    ['E-Moll',   [4, 7, 11]],
    'ii°':  ['Fis°',     [6, 9, 0]],
    'III':  ['G-Dur',    [7, 11, 2]],
    'iv':   ['A-Moll',   [9, 0, 4]],
    'v':    ['H-Moll',   [11, 2, 6]],
    'VI':   ['C-Dur',    [0, 4, 7]],
    'VII':  ['D-Dur',    [2, 6, 9]],
    'V':    ['H-Dur',    [11, 3, 6]],
    'vii°': ['Dis°',     [3, 6, 9]],
  },
  'D-moll': {
    'i':    ['D-Moll',   [2, 5, 9]],
    'ii°':  ['E°',       [4, 7, 10]],
    'III':  ['F-Dur',    [5, 9, 0]],
    'iv':   ['G-Moll',   [7, 10, 2]],
    'v':    ['A-Moll',   [9, 0, 4]],
    'VI':   ['B-Dur',    [10, 2, 5]],
    'VII':  ['C-Dur',    [0, 4, 7]],
    'V':    ['A-Dur',    [9, 1, 4]],
    'vii°': ['Cis°',     [1, 4, 7]],
  },
  'H-moll': {
    'i':    ['H-Moll',   [11, 2, 6]],
    'ii°':  ['Cis°',     [1, 4, 7]],
    'III':  ['D-Dur',    [2, 6, 9]],
    'iv':   ['E-Moll',   [4, 7, 11]],
    'v':    ['Fis-Moll', [6, 9, 1]],
    'VI':   ['G-Dur',    [7, 11, 2]],
    'VII':  ['A-Dur',    [9, 1, 4]],
    'V':    ['Fis-Dur',  [6, 10, 1]],
    'vii°': ['Ais°',     [10, 1, 4]],
  },
  'G-moll': {
    'i':    ['G-Moll',   [7, 10, 2]],
    'ii°':  ['A°',       [9, 0, 3]],
    'III':  ['B-Dur',    [10, 2, 5]],
    'iv':   ['C-Moll',   [0, 3, 7]],
    'v':    ['D-Moll',   [2, 5, 9]],
    'VI':   ['Es-Dur',   [3, 7, 10]],
    'VII':  ['F-Dur',    [5, 9, 0]],
    'V':    ['D-Dur',    [2, 6, 9]],
    'vii°': ['Fis°',     [6, 9, 0]],
  },
};

const DUR_VOKABULAR: Record<string, Record<string, Erwartung>> = {
  'C-dur': {
    'I':    ['C-Dur',   [0, 4, 7]],
    'ii':   ['D-Moll',  [2, 5, 9]],
    'iii':  ['E-Moll',  [4, 7, 11]],
    'IV':   ['F-Dur',   [5, 9, 0]],
    'V':    ['G-Dur',   [7, 11, 2]],
    'vi':   ['A-Moll',  [9, 0, 4]],
    'vii°': ['H°',      [11, 2, 5]],
  },
  'B-dur': {
    'I':    ['B-Dur',   [10, 2, 5]],
    'ii':   ['C-Moll',  [0, 3, 7]],
    'iii':  ['D-Moll',  [2, 5, 9]],
    'IV':   ['Es-Dur',  [3, 7, 10]],
    'V':    ['F-Dur',   [5, 9, 0]],
    'vi':   ['G-Moll',  [7, 10, 2]],
    'vii°': ['A°',      [9, 0, 3]],
  },
};

describe('Stufen-Vokabular (B-19, R15)', () => {
  it('stellt in Moll beide Vorräte bereit – natürlich und harmonisch (AK 1)', () => {
    expect(DEGREE_VOCABULARY.moll).toEqual(
      ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII', 'V', 'vii°'],
    );
    expect(DEGREE_VOCABULARY.dur).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  });

  it('löst jeden Bezeichner in jeder Moll-Tonart zu Name und Tönen auf (AK 5)', () => {
    for (const [keyId, vokabular] of Object.entries(MOLL_VOKABULAR)) {
      const key = getKey(keyId);
      for (const [degree, [name, pcs]] of Object.entries(vokabular)) {
        const chord = chordForDegree(key, degree);
        expect(chord, `${key.label} ${degree}`).not.toBeNull();
        expect(chord?.name, `${key.label} ${degree}`).toBe(name);
        expect(chord?.pcs, `${key.label} ${degree} (${name})`).toEqual(pcs);
      }
    }
  });

  it('deckt die Tabelle den vollständigen Vorrat aller 5 Moll-Tonarten ab', () => {
    const mollKeys = KEYS.filter((k) => k.mode === 'moll').map((k) => k.id);
    expect(Object.keys(MOLL_VOKABULAR).sort()).toEqual([...mollKeys].sort());
    for (const vokabular of Object.values(MOLL_VOKABULAR)) {
      expect(Object.keys(vokabular).sort()).toEqual([...DEGREE_VOCABULARY.moll].sort());
    }
  });

  it('löst jeden Bezeichner in Dur auf – unverändert gegenüber dem Bestand', () => {
    for (const [keyId, vokabular] of Object.entries(DUR_VOKABULAR)) {
      const key = getKey(keyId);
      for (const [degree, [name, pcs]] of Object.entries(vokabular)) {
        const chord = chordForDegree(key, degree);
        expect(chord?.name, `${key.label} ${degree}`).toBe(name);
        expect(chord?.pcs, `${key.label} ${degree} (${name})`).toEqual(pcs);
      }
    }
  });

  it('nennt VII den Dur-Dreiklang auf der kleinen Septime, vii° den Leittondreiklang (AK 2)', () => {
    for (const key of KEYS.filter((k) => k.mode === 'moll')) {
      const sept = chordForDegree(key, 'VII');
      const leitton = chordForDegree(key, 'vii°');
      // Kleine Septime: 10 Halbtöne über der Tonika, Dur. Leitton: 11 Halbtöne, vermindert.
      expect(sept?.quality, key.label).toBe('dur');
      expect((sept!.pcs[0] - key.tonic + 12) % 12, key.label).toBe(10);
      expect(leitton?.quality, key.label).toBe('dim');
      expect((leitton!.pcs[0] - key.tonic + 12) % 12, key.label).toBe(11);
      // Beide stehen auf derselben Skalenstufe – daher derselbe Buchstabe (R9)
      expect(sept?.step, key.label).toBe(6);
      expect(leitton?.step, key.label).toBe(6);
    }
  });

  it('gibt für einen Bezeichner, den es in dieser Tonart nicht gibt, null zurück', () => {
    const cDur = getKey('C-dur');
    for (const degree of ['VII', 'i', 'v', 'III', 'iv', 'VI', 'ii°']) {
      expect(chordForDegree(cDur, degree), `${degree} in C-Dur`).toBeNull();
    }
    expect(chordForDegree(getKey('A-moll'), 'IV')).toBeNull();
    expect(chordForDegree(cDur, 'bII')).toBeNull();
    // Kein Treffer über die Prototypenkette
    expect(chordForDegree(cDur, 'toString')).toBeNull();
  });
});

describe('Stufen-Sequenz der Modi A/B/C (B-19)', () => {
  it('bleibt der skalengeordnete Siebener – in Moll harmonisch', () => {
    expect(diatonicChords(getKey('C-dur')).map((c) => c.degree))
      .toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect(diatonicChords(getKey('A-moll')).map((c) => c.degree))
      .toEqual(['i', 'ii°', 'III', 'iv', 'V', 'VI', 'vii°']);
  });

  it('klingt in Moll unverändert – nur die 7. Stufe heißt jetzt richtig', () => {
    // Bestand vor B-19: dieselben Töne, aber als `VII` beschriftet und `As°` benannt.
    const chords = diatonicChords(getKey('A-moll'));
    expect(chords.map((c) => c.pcs)).toEqual([
      [9, 0, 4], [11, 2, 5], [0, 4, 7], [2, 5, 9], [4, 8, 11], [5, 9, 0], [8, 11, 2],
    ]);
    expect(chords[6].name).toBe('Gis°');
  });

  it('führt jede Skalenstufe genau einmal – Modus A braucht eine eindeutige Reihenfolge', () => {
    for (const key of KEYS) {
      expect(diatonicChords(key).map((c) => c.step), key.label).toEqual([0, 1, 2, 3, 4, 5, 6]);
    }
  });

  it('lässt v und VII aus der Sequenz heraus, hält sie aber verfügbar', () => {
    for (const key of KEYS.filter((k) => k.mode === 'moll')) {
      const degrees = diatonicChords(key).map((c) => c.degree);
      expect(degrees, key.label).not.toContain('v');
      expect(degrees, key.label).not.toContain('VII');
      expect(chordForDegree(key, 'v'), key.label).not.toBeNull();
      expect(chordForDegree(key, 'VII'), key.label).not.toBeNull();
    }
  });
});

describe('Moll-Wendung (B-19 AK 3)', () => {
  it('löst in a-Moll zu a-Moll → G-Dur → F-Dur → E-Dur auf', () => {
    const prog = PROGRESSIONS.find((p) => p.id === 'mollwendung')!;
    const key = getKey('A-moll');
    expect(prog.degrees.moll).toEqual(['i', 'VII', 'VI', 'V']);
    expect(prog.degrees.moll.map((d) => chordForDegree(key, d)?.name))
      .toEqual(['A-Moll', 'G-Dur', 'F-Dur', 'E-Dur']);
  });
});

// ── Auflösung von Akkordfolgen (B-21, R16) ──────────────────────────────────

describe('resolveProgression', () => {
  const kaputt: ProgressionDef = {
    id: 'test-unaufloesbar',
    name: 'Künstlich fehlerhaft',
    // `VII` gibt es in Dur nicht – die Folge ist dort nicht auflösbar.
    degrees: { dur: ['I', 'VII', 'IV', 'V'], moll: ['i', 'VII', 'iv', 'V'] },
    logic: 'Nur für den Test.',
    fingeringHint: 'Nur für den Test.',
  };

  it('löst jede Folge des Bestands in jeder Tonart vollständig auf', () => {
    for (const key of KEYS) {
      for (const prog of PROGRESSIONS) {
        const res = resolveProgression(key, prog);
        const wo = `${prog.id} in ${key.label}`;
        expect(res.ok, wo).toBe(true);
        expect(res.ok && res.chords.length, wo).toBe(prog.degrees[key.mode].length);
      }
    }
  });

  it('kürzt eine fehlerhafte Folge nicht, sondern nennt die fehlenden Stufen (AK 3)', () => {
    const fehler = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = resolveProgression(getKey('C-dur'), kaputt);
      expect(res.ok).toBe(false);
      expect(res.ok === false && res.missing).toEqual(['VII']);
      // Nicht n−1: es gibt gar keine Kette.
      expect('chords' in res).toBe(false);
      // R16: laut – mit Folge, Tonart und Stufe
      expect(fehler).toHaveBeenCalledTimes(1);
      expect(String(fehler.mock.calls[0][0])).toContain('test-unaufloesbar');
      expect(String(fehler.mock.calls[0][0])).toContain('C-Dur');
      expect(String(fehler.mock.calls[0][0])).toContain('VII');
    } finally {
      fehler.mockRestore();
    }
  });

  it('löst dieselbe Folge in Moll vollständig auf – dort gibt es VII (R15)', () => {
    const res = resolveProgression(getKey('A-moll'), kaputt);
    expect(res.ok).toBe(true);
    expect(res.ok && res.chords.map((c) => c.name)).toEqual(['A-Moll', 'G-Dur', 'D-Moll', 'E-Dur']);
  });
});
