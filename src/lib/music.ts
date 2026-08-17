// ── Musiktheorie & Inhalte ──────────────────────────────────────────────────
// Deutsche Notennamen: C, Cis/Des, D, …, B (= Bb), H (= B natural)

export const NOTE_NAMES_DE = ['C', 'Cis', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'As', 'A', 'B', 'H'];

export function pcName(pc: number): string {
  return NOTE_NAMES_DE[((pc % 12) + 12) % 12];
}

export function midiName(midi: number): string {
  const pc = midi % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${pcName(pc)}${oct}`;
}

// ── Tonarten ────────────────────────────────────────────────────────────────

export type Mode = 'dur' | 'moll';

export interface KeyDef {
  id: string;            // z.B. "C-dur"
  tonic: number;         // Pitch Class 0..11
  mode: Mode;
  label: string;         // "C-Dur"
  accidentals: string;   // "–", "1 #", "2 b"
  stage: number;         // Freischalt-Stufe 1..5
  scale: number[];       // Pitch Classes der Tonleiter (7 Töne, aufsteigend ab Tonika)
  fingeringScale: string;
  pitfalls: string;
  description: string;
}

function scaleFor(tonic: number, mode: Mode): number[] {
  const steps = mode === 'dur' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  return steps.map((s) => (tonic + s) % 12);
}

function mkKey(tonic: number, mode: Mode, stage: number, accidentals: string, fingering: string, pitfalls: string, description: string): KeyDef {
  const name = pcName(tonic);
  return {
    id: `${name}-${mode}`,
    tonic,
    mode,
    label: `${name}-${mode === 'dur' ? 'Dur' : 'Moll'}`,
    accidentals,
    stage,
    scale: scaleFor(tonic, mode),
    fingeringScale: fingering,
    pitfalls,
    description,
  };
}

export const KEYS: KeyDef[] = [
  mkKey(0, 'dur', 1, '–', '1–2–3–1–2–3–4–5 (Daumen-Untersatz nach dem Mittelfinger)',
    'Keine Vorzeichen – die reine weiße Landkarte. Ideal, um die Griffmulden ohne schwarze Tasten zu festigen.',
    'C-Dur ist die Heimat ohne Vorzeichen. Alle Töne liegen auf weißen Tasten. Hier baust du die Landkarte der Hand auf.'),
  mkKey(9, 'moll', 1, '–', '1–2–3–1–2–3–4–5 (wie C-Dur, aber Start auf A)',
    'Achtung beim Akkord E-Dur (die Dominante): das Gis ist eine schwarze Taste, obwohl a-Moll keine Vorzeichen hat.',
    'a-Moll ist die parallele Moll-Tonart zu C-Dur – gleiche Tasten, andere Heimat. Die kleine Terz macht den Moll-Klang.'),
  mkKey(7, 'dur', 2, '1 #', '1–2–3–1–2–3–4–5 (Standard)',
    'Das Fis! Es liegt als schwarze Taste in der 3er-Gruppe. Genau hier zahlt die Topographie-Karte ein.',
    'G-Dur bringt das erste Kreuz: Fis. Die Hand lernt die erste „Mulde mit schwarzer Taste".'),
  mkKey(4, 'moll', 2, '1 #', '1–2–3–1–2–3–4–5 (Standard)',
    'Das Dis in der Dominante H-Dur ist neu: zwei schwarze Tasten (Fis, Dis) in einem Akkord.',
    'e-Moll teilt das Fis mit G-Dur. Die Dominante H-Dur fügt das Dis als Leitton hinzu.'),
  mkKey(5, 'dur', 3, '1 b', '1–2–3–4–1–2–3–4 (Untersatz nach dem Zeigefinger beim B!)',
    'Das B ist eine schwarze Taste und liegt am linken Rand der 3er-Gruppe. Der klassische Stolperstein: Daumen-Untersatz schon nach Finger 4.',
    'F-Dur bringt das erste b: Das B ersetzt das H. Neue Griffmulde am linken Rand der 3er-Insel.'),
  mkKey(2, 'moll', 3, '1 b', '1–2–3–1–2–3–4–5 (Standard)',
    'Im Akkord A-Dur (Dominante) kommt das Cis dazu – zusammen mit dem B eine anspruchsvolle Mulde.',
    'd-Moll teilt das B mit F-Dur. Die Dominante A-Dur bringt den Leitton Cis.'),
  mkKey(2, 'dur', 4, '2 #', '1–2–3–1–2–3–4–5 (Standard)',
    'Fis UND Cis: zwei schwarze Tasten in der Skala. Der Dreiklang D-Fis-A liegt tief in der 3er-Mulde.',
    'D-Dur mit zwei Kreuzen. Der Grundakkord liegt bereits zwischen den schwarzen Inseln – Topographie pur.'),
  mkKey(11, 'moll', 4, '2 #', '1–2–3–4–1–2–3–4 (Start auf H, Daumen-Untersatz nach 3)',
    'Das Ais in der Dominante Fis-Dur: der erste Dreiklang mit drei schwarzen Tasten im Umfeld.',
    'h-Moll teilt Fis und Cis mit D-Dur. Der Leitton Ais macht die Dominante Fis-Dur zur schwarzen Insel.'),
  mkKey(10, 'dur', 5, '2 b', '4–1–2–3–1–2–3–4 (Start mit Finger 4 auf B!)',
    'B und Es – zwei b-Vorzeichen. Der Grundakkord B-D-F beginnt auf einer schwarzen Taste: Finger 4 als Anker.',
    'B-Dur mit zwei b. Die Hand beginnt auf der schwarzen Taste – die Mulden-Führung wird Pflicht.'),
  mkKey(7, 'moll', 5, '2 b', '1–2–3–1–2–3–4–5 (Standard)',
    'Die Dominante D-Dur enthält das Fis – zusammen mit B und Es drei „fremde" Tasten im Wechsel.',
    'g-Moll teilt B und Es mit B-Dur. Die Dominante D-Dur bringt das Fis als Leitton.'),
];

export function getKey(id: string): KeyDef {
  const k = KEYS.find((k) => k.id === id);
  if (!k) throw new Error(`Unbekannte Tonart: ${id}`);
  return k;
}

// ── Akkorde (Dreiklänge auf Stufen) ─────────────────────────────────────────

export interface ChordDef {
  degree: string;        // "I", "ii", "V" …
  name: string;          // "C-Dur", "d-Moll", "H°"
  pcs: number[];         // Pitch Classes [Grundton, Terz, Quinte]
  quality: 'dur' | 'moll' | 'dim';
}

const ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII'];

export function diatonicChords(key: KeyDef): ChordDef[] {
  // Dur: I ii iii IV V vi vii° – Moll (harmonisch): i ii° III iv V VI VII
  if (key.mode === 'dur') {
    const quals: Array<'dur' | 'moll' | 'dim'> = ['dur', 'moll', 'moll', 'dur', 'dur', 'moll', 'dim'];
    return key.scale.map((pc, i) => triad(pc, quals[i], ROMAN_MAJOR[i]));
  }
  // harmonisches Moll: Leitton +1 auf Stufe 7
  const sc = [...key.scale];
  sc[6] = (sc[6] + 1) % 12;
  const quals: Array<'dur' | 'moll' | 'dim'> = ['moll', 'dim', 'dur', 'moll', 'dur', 'dur', 'dim'];
  return sc.map((pc, i) => triad(pc, quals[i], ROMAN_MINOR[i]));
}

function triad(root: number, quality: 'dur' | 'moll' | 'dim', degree: string): ChordDef {
  const third = quality === 'dur' ? 4 : 3;
  const fifth = quality === 'dim' ? 6 : 7;
  const suffix = quality === 'dur' ? '-Dur' : quality === 'moll' ? '-Moll' : '°';
  return { degree, name: `${pcName(root)}${suffix === '°' ? '°' : suffix}`, pcs: [root, (root + third) % 12, (root + fifth) % 12], quality };
}

// Die MIDI-Lage eines Akkords entsteht ausschließlich in `spellTriad()` (R12.1: genau
// eine Lagen-Regel). Das frühere `chordMidi()` war eine zweite, ungenutzte Variante
// („nächstliegende Lage ab C4") und ist mit B-07 entfallen.

// ── Akkordfolgen-Datenbank ──────────────────────────────────────────────────

export interface ProgressionDef {
  id: string;
  name: string;
  degrees: { dur: string[]; moll: string[] };
  logic: string;         // „Warum klingt das richtig?"
  fingeringHint: string;
}

export const PROGRESSIONS: ProgressionDef[] = [
  {
    id: 'vollkadenz',
    name: 'Vollkadenz',
    degrees: { dur: ['I', 'IV', 'V', 'I'], moll: ['i', 'iv', 'V', 'i'] },
    logic: 'Heimat – Spannung – höchste Spannung – Rückkehr. Die Vollkadenz ist das Fundament der klassischen Harmonik: Subdominante und Dominante umklammern die Tonika.',
    fingeringHint: 'Beim Wechsel I→IV wandert die ganze Mulde eine Stufe nach oben; bei V→I fällt sie zurück. Alle Akkorde bleiben im Fingersatz 1–3–5.',
  },
  {
    id: 'erweitert',
    name: 'Erweiterte Kadenz',
    degrees: { dur: ['I', 'IV', 'I', 'V', 'I'], moll: ['i', 'iv', 'i', 'V', 'i'] },
    logic: 'Die Rückkehr zur Tonika zwischen Sub- und Dominante verlangsamt die Kadenz und lehrt den Wechsel in beide Richtungen.',
    fingeringHint: 'IV→I und I→V sind reine Mulden-Verschiebungen um je eine Stufe. Achte auf den Mittelfinger: Er trägt die Terz und damit Dur/Moll.',
  },
  {
    id: 'quintfall',
    name: 'Quintfall',
    degrees: { dur: ['ii', 'V', 'I'], moll: ['ii°', 'V', 'i'] },
    logic: 'Der wichtigste Schluss der klassischen Harmonik: Die Stufen fallen in Quinten (ii→V→I). Maximale Zielstrebigkeit zur Tonika.',
    fingeringHint: 'Drei Mulden im Abstand je einer Stufe: ii liegt direkt über I, V direkt darüber. Die Hand „klettert" und fällt dann zwei Stufen zurück.',
  },
  {
    id: 'kanon',
    name: 'Kanon-Sequenz',
    degrees: { dur: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], moll: ['i', 'V', 'VI', 'III', 'iv', 'i', 'iv', 'V'] },
    logic: 'Das Pachelbel-Muster: eine Kette von Quintfällen, die sich durch die ganze Tonart spiralt. Steckt in hunderten klassischen und modernen Stücken.',
    fingeringHint: 'Die Sprünge V→vi und iii→IV sind größer als eine Stufe – hier zählt die Topographie-Karte. Erst langsam, die Mulde komplett formen, bevor du landest.',
  },
  {
    id: 'stufenweg',
    name: 'Stufenweg',
    degrees: { dur: ['I', 'vi', 'IV', 'V'], moll: ['i', 'VI', 'iv', 'V'] },
    logic: 'Verbindet Tonika-Gegengewicht (vi) mit der Kadenz (IV–V). Eine der häufigsten Verbindungsformeln überhaupt.',
    fingeringHint: 'I→vi ist ein Wechsel von Dur zur Parallel-Moll: Gleiche Mulden-Lage, aber der Grundton wandert. Mittelfinger prüft die Terz!',
  },
  {
    id: 'mollwendung',
    name: 'Moll-Wendung',
    degrees: { dur: ['I', 'V', 'vi', 'IV'], moll: ['i', 'VII', 'VI', 'V'] },
    logic: 'Die absteigende Moll-Formel: Von der Tonika über die tiefen Stufen VII und VI zur Dominante. Bekannt aus Flamenco bis Filmmusik.',
    fingeringHint: 'Drei Mulden fallen je eine Stufe abwärts (i→VII→VI), dann der Sprung zur Dominante. Die Abwärts-Bewegung fühlt sich anders an – bewusst steuern.',
  },
];

// ── Steckbriefe der Timing-Trainings ────────────────────────────────────────

export const TIMING_BRIEFS = {
  uebung1: {
    title: 'Steckbrief: Blind-Griff (16tel)',
    counting: 'Zählweise: „1 – e – und – a". Auf „1" steht der Klang. Auf „e – und – a" löst sich die Hand und formt in der Luft die nächste Griffmulde.',
    measured: 'Gemessen wird pro Anschlag: Tonhöhe (alle drei Töne korrekt?) und Timing (Abweichung in Millisekunden von der Zählzeit „1").',
    tolerance: 'Toleranzfenster: ±50 ms (Anfänger), verschärfbar auf ±35 ms und ±20 ms.',
    tip: 'Die Hand verlässt die Tasten nach jedem Anschlag komplett. Wer „kleben bleibt", trainiert Suchen statt Mulden.',
  },
  uebung2: {
    title: 'Steckbrief: Systemsprung (6/8)',
    counting: 'Zählweise: „1 – 2" (zwei schwere Schläge pro Takt). Schlag 1: Akkord im Zentrum. Schlag 2: derselbe Block, eine Oktave versetzt in die Zielzone (Zenit oder Nadir).',
    measured: 'Gemessen wird pro Block: Tonhöhe, korrektes Register (richtige Oktave = richtige Zone) und Timing auf beiden Schlägen.',
    tolerance: 'Toleranzfenster wie Übung 1 (±50 ms Standard).',
    tip: 'Lies „Block + Zone", nicht Einzelnoten. Die Handform bleibt beim Sprung identisch – nur der Ort wechselt.',
  },
};

// ── Diktat-Modi ─────────────────────────────────────────────────────────────

export type DictateMode = 'A' | 'B' | 'C';

export const MODE_LABELS: Record<DictateMode, string> = {
  A: 'Sequenz (auf- & absteigend)',
  B: 'Zufall',
  C: 'Adaptiv (deine Schwächen)',
};

// ── Finger-Mapping Grundstellung: Index im Akkord → Finger ──────────────────
export const FINGER_NAMES = ['Daumen (Finger 1)', 'Mittelfinger (Finger 3)', 'Kleiner Finger (Finger 5)'];
export const INTERVAL_NAMES = ['Grundton', 'Terz', 'Quinte'];

// ── Tribunal: Fehlgriff → genau eine ausführbare Korrektur ──────────────────

export interface TribunalVerdict {
  big: string;                  // R2 groß: ausführbar ohne Theoriekenntnis
  small: string;                // R2 klein: Fachbegriff
  direction: 1 | -1 | 0;        // 1 = zu hoch gegriffen, -1 = zu tief, 0 = ohne Richtung
}

/**
 * Bewertet einen Fehlgriff auf Tonhöhenklassen-Ebene und nennt nach R3 genau
 * **einen** Hinweis: den gröbsten Fehler. Rangfolge nach R23:
 *
 * 1. Vektor – ein überzähliger Ton lässt sich einem fehlenden Zielton zuordnen
 * 2. Zielton fehlt, ohne dass ein falscher Ton an seiner Stelle liegt
 * 3. alle Zieltöne liegen, ein Ton zu viel
 * 4. kein einziger Zielton getroffen → Notnagel „Akkord nicht gefunden"
 *
 * Rang 2 und 3 setzen jeweils voraus, dass die andere Menge leer ist – sonst
 * hätte Rang 1 bereits gegriffen.
 *
 * Die Funktion ist total: sie gibt immer ein Urteil zurück. Der Fall „alle Töne
 * richtig, nur die Oktavlage nicht" (Übung 2, R13) gehört **nicht** hierher und
 * muss vom Aufrufer vorher abgefangen werden – Rang 4 wäre dort falsch.
 */
export function tribunal(chord: ChordDef, playedPcs: Set<number>, key: KeyDef): TribunalVerdict {
  const missing = chord.pcs
    .map((pc, idx) => ({ pc, idx }))
    .filter((t) => !playedPcs.has(t.pc));
  const extra = [...playedPcs].filter((pc) => !chord.pcs.includes(pc));

  // Rang 1 – der kleinste Abstand zwischen einem fehlenden Zielton und einem
  // überzähligen Ton ist der Finger, der am ehesten nur danebenlag.
  let best: { idx: number; diff: number } | null = null;
  for (const target of missing) {
    for (const played of extra) {
      let diff = played - target.pc;
      while (diff > 6) diff -= 12;
      while (diff < -6) diff += 12;
      if (!best || Math.abs(diff) < Math.abs(best.diff)) best = { idx: target.idx, diff };
    }
  }
  if (best) {
    const n = Math.abs(best.diff);
    const tasterWord = n === 1 ? 'eine Taste' : `${n} Tasten`;
    return {
      big: `${FINGER_NAMES[best.idx]}: ${tasterWord} ${best.diff > 0 ? 'tiefer' : 'höher'}`,
      small: `${INTERVAL_NAMES[best.idx]} ${best.diff > 0 ? '+' : '−'}${n} Halbton${n > 1 ? 'e' : ''}`,
      direction: best.diff > 0 ? 1 : -1,
    };
  }

  // Rang 2 – ein Ton fehlt, ohne Ersatz. Fehlen mehrere, wiegt der tiefere
  // Finger schwerer: der Grundton trägt die Mulde, dann Terz, dann Quinte.
  if (missing.length > 0 && missing.length < chord.pcs.length) {
    const { idx } = missing[0];
    return {
      big: `${FINGER_NAMES[idx]} fehlt`,
      small: `${INTERVAL_NAMES[idx]} fehlt`,
      direction: 0,
    };
  }

  // Rang 3 – die Mulde stimmt, ein Finger liegt zusätzlich auf.
  if (extra.length > 0) {
    const pc = extra[0];
    return {
      big: `Ein Ton zu viel: ${pcName(pc)} loslassen`,
      // Leitereigene Fremdtöne gehören zur Tonart, nur nicht zu diesem Akkord –
      // „nicht in <Tonart>" wäre für sie falsch (R4: messen statt meinen).
      small: key.scale.includes(pc) ? `nicht in ${chord.name}` : `nicht in ${key.label}`,
      direction: 0,
    };
  }

  // Rang 4 – Notnagel (R23): kein einziger Zielton getroffen.
  return {
    big: 'Akkord nicht gefunden',
    small: `Ziel: ${chord.name} – Mulde komplett neu formen.`,
    direction: 0,
  };
}
