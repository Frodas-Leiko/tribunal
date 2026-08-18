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

// ── Buchstabierung (R9) ─────────────────────────────────────────────────────
// `pcName()` nennt einen Klang; ein Notenname braucht zusätzlich den **Buchstaben**.
// Tonhöhenklasse 8 heißt mit dem Buchstaben G „Gis" und mit dem Buchstaben A „As" –
// derselbe Ton, zwei Namen. Welcher gilt, entscheidet die Skalenstufe (B-19), nie
// eine Suche nach dem Grundton.

/** Klingende Tonhöhenklassen der sieben Naturtöne C D E F G A H. */
export const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
const FLAT_NAMES = ['Ces', 'Des', 'Es', 'Fes', 'Ges', 'As', 'B'];

/** Vorzeichen in Halbtönen, das den Buchstaben auf die klingende Tonhöhenklasse bringt. */
export function accidentalFor(letterIdx: number, pc: number): number {
  const acc = (((pc - NATURAL_PC[letterIdx]) % 12) + 12) % 12;
  return acc > 6 ? acc - 12 : acc;
}

/**
 * Buchstabe + Klang → deutscher Notenname (R9).
 *
 * Das Stufen-Vokabular nach R15 kommt mit einem einfachen Vorzeichen aus. Ein
 * Doppelvorzeichen wäre ein Fehler in der Stufen-Tabelle und scheitert deshalb
 * laut, statt einen falschen Namen zu liefern (R16).
 */
export function spelledName(letterIdx: number, pc: number): string {
  const acc = accidentalFor(letterIdx, pc);
  if (acc === 0) return LETTERS[letterIdx];
  if (acc === 1) return `${LETTERS[letterIdx]}is`;
  if (acc === -1) return FLAT_NAMES[letterIdx];
  throw new Error(`Doppelvorzeichen: Buchstabe ${LETTERS[letterIdx]} auf Tonhöhenklasse ${pc}`);
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

/**
 * Buchstabe der Tonika (0..6 = C..H). Alle Tonarten dieser App schreiben sich mit
 * einem Naturton-Buchstaben – B-Dur mit dem Buchstaben H und einem ♭.
 */
const TONIC_LETTER: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 10: 6, 11: 6 };

export function tonicLetter(key: KeyDef): number {
  const letter = TONIC_LETTER[key.tonic];
  if (letter === undefined) throw new Error(`Tonart ohne Buchstaben: ${key.label}`);
  return letter;
}

// ── Akkorde (Dreiklänge auf Stufen) ─────────────────────────────────────────

export type ChordQuality = 'dur' | 'moll' | 'dim';

export interface ChordDef {
  degree: string;        // "I", "ii", "V" …
  step: number;          // Skalenstufe 0..6 – sie trägt den Buchstaben (B-19)
  name: string;          // "C-Dur", "d-Moll", "H°"
  pcs: number[];         // Pitch Classes [Grundton, Terz, Quinte]
  quality: ChordQuality;
}

/**
 * Eine Stufenbezeichnung, aufgelöst gegen die Tonleiter der Tonart.
 *
 * `step` ist die Skalenstufe und bestimmt den **Buchstaben**: `VII` und `vii°`
 * stehen beide auf der siebten Stufe. `alter` ist der Halbtonschritt gegenüber
 * dem leitereigenen Ton – in Moll ist `key.scale` die **natürliche** Leiter, das
 * harmonische Moll entsteht aus `alter: 1` auf der siebten Stufe.
 */
interface DegreeSpec {
  step: number;
  alter: number;
  quality: ChordQuality;
}

/**
 * Das vollständige Stufen-Vokabular nach R15. Was hier nicht steht, gibt es in
 * dieser Tonart nicht: `chordForDegree()` liefert dafür `null`, und die Folge gilt
 * als nicht verfügbar (R16) – statt still zu schrumpfen.
 */
const DEGREES: Record<Mode, Record<string, DegreeSpec>> = {
  dur: {
    'I':    { step: 0, alter: 0, quality: 'dur' },
    'ii':   { step: 1, alter: 0, quality: 'moll' },
    'iii':  { step: 2, alter: 0, quality: 'moll' },
    'IV':   { step: 3, alter: 0, quality: 'dur' },
    'V':    { step: 4, alter: 0, quality: 'dur' },
    'vi':   { step: 5, alter: 0, quality: 'moll' },
    'vii°': { step: 6, alter: 0, quality: 'dim' },
  },
  moll: {
    // natürliches Moll
    'i':    { step: 0, alter: 0, quality: 'moll' },
    'ii°':  { step: 1, alter: 0, quality: 'dim' },
    'III':  { step: 2, alter: 0, quality: 'dur' },
    'iv':   { step: 3, alter: 0, quality: 'moll' },
    'v':    { step: 4, alter: 0, quality: 'moll' },
    'VI':   { step: 5, alter: 0, quality: 'dur' },
    'VII':  { step: 6, alter: 0, quality: 'dur' },   // Dur-Dreiklang auf der kleinen Septime
    // harmonisches Moll – der Leitton hebt die siebte Stufe um einen Halbton
    'V':    { step: 4, alter: 0, quality: 'dur' },   // Dur-Dominante
    'vii°': { step: 6, alter: 1, quality: 'dim' },   // Leittondreiklang
  },
};

/** Alle Stufenbezeichner eines Tongeschlechts – der Vorrat, nicht die Reihenfolge. */
export const DEGREE_VOCABULARY: Record<Mode, string[]> = {
  dur: Object.keys(DEGREES.dur),
  moll: Object.keys(DEGREES.moll),
};

/**
 * Die skalengeordnete Reihenfolge der Stufen-Modi A/B/C: genau ein Akkord je
 * Skalenstufe. Moll steht dabei harmonisch. Zwei Varianten auf derselben Stufe
 * hätten in der Auf- und Abwärtsfolge von Modus A keine definierte Ordnung –
 * `v` und `VII` sind deshalb über `chordForDegree()` verfügbar, nicht hier.
 */
const SEQUENCE: Record<Mode, string[]> = {
  dur: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  moll: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'vii°'],
};

function triad(key: KeyDef, degree: string, spec: DegreeSpec): ChordDef {
  const root = (key.scale[spec.step] + spec.alter + 12) % 12;
  const third = spec.quality === 'dur' ? 4 : 3;
  const fifth = spec.quality === 'dim' ? 6 : 7;
  const suffix = spec.quality === 'dur' ? '-Dur' : spec.quality === 'moll' ? '-Moll' : '°';
  // Der Name folgt dem Buchstaben der Stufe, nicht der Tonhöhenklasse: in a-Moll
  // heißt der Leittondreiklang `Gis°` und nicht `As°` (R9, B-19).
  const name = `${spelledName((tonicLetter(key) + spec.step) % 7, root)}${suffix}`;
  return {
    degree,
    step: spec.step,
    name,
    pcs: [root, (root + third) % 12, (root + fifth) % 12],
    quality: spec.quality,
  };
}

/**
 * Der skalengeordnete Siebener einer Tonart – Grundlage der Stufen-Modi A/B/C.
 * Dur: `I ii iii IV V vi vii°` · Moll (harmonisch): `i ii° III iv V VI vii°`.
 */
export function diatonicChords(key: KeyDef): ChordDef[] {
  const vocabulary = DEGREES[key.mode];
  return SEQUENCE[key.mode].map((d) => triad(key, d, vocabulary[d]));
}

/**
 * Löst eine Stufenbezeichnung im **vollständigen** Vokabular auf (R15) – also
 * einschließlich `v` und `VII`, die in der Sequenz oben nicht vorkommen.
 * `null` heißt: Diesen Akkord gibt es in dieser Tonart nicht.
 */
export function chordForDegree(key: KeyDef, degree: string): ChordDef | null {
  const vocabulary = DEGREES[key.mode];
  if (!Object.hasOwn(vocabulary, degree)) return null;
  return triad(key, degree, vocabulary[degree]);
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

// ── Auflösung einer Akkordfolge (R16) ───────────────────────────────────────

/**
 * Entweder die **vollständige** Akkordkette oder die Liste der Stufen, die es in
 * dieser Tonart nicht gibt – nie eine gekürzte Kette. Eine still verworfene Stufe
 * macht aus einer achtgliedrigen Folge klanglos eine siebengliedrige; der Nutzer
 * übt dann etwas anderes als das, was im Steckbrief steht (R16).
 */
export type ProgressionResolution =
  | { ok: true; chords: ChordDef[] }
  | { ok: false; missing: string[] };

// Einmal je Folge und Tonart: Die Auswahl fragt bei jedem Rendern nach, die
// Wiederholung derselben Meldung trägt keine neue Information.
const reported = new Set<string>();

export function resolveProgression(key: KeyDef, prog: ProgressionDef): ProgressionResolution {
  const chords: ChordDef[] = [];
  const missing: string[] = [];
  for (const degree of prog.degrees[key.mode]) {
    const chord = chordForDegree(key, degree);
    if (chord) chords.push(chord);
    else if (!missing.includes(degree)) missing.push(degree);
  }
  if (missing.length === 0) return { ok: true, chords };

  // R16: laut. In der Entwicklung steht die Ursache in der Konsole – mit Folge,
  // Tonart und Stufe, damit sie ohne Suche im Datensatz zu finden ist.
  const mark = `${prog.id}|${key.id}`;
  if (import.meta.env.DEV && !reported.has(mark)) {
    reported.add(mark);
    console.error(
      `Akkordfolge „${prog.id}" ist in ${key.label} nicht auflösbar: `
      + `Stufe ${missing.join(', ')} gibt es in dieser Tonart nicht (R15, R16).`,
    );
  }
  return { ok: false, missing };
}

// ── Steckbriefe der Timing-Trainings ────────────────────────────────────────

export const TIMING_BRIEFS = {
  uebung1: {
    title: 'Steckbrief: Blind-Griff (16tel)',
    counting: 'Zählweise: „1 – e – und – a". Auf „1" steht der Klang. Auf „e – und – a" löst sich die Hand und formt in der Luft die nächste Griffmulde.',
    measured: 'Gemessen wird pro Anschlag: Tonhöhe (alle drei Töne korrekt?) und Timing (Abweichung in Millisekunden von der Zählzeit „1"). Die Oktave wird nicht geprüft – in welcher Lage du greifst, ist in Übung 1 frei.',
    tolerance: 'Toleranzfenster: ±50 ms (Anfänger), verschärfbar auf ±35 ms und ±20 ms.',
    tip: 'Die Hand verlässt die Tasten nach jedem Anschlag komplett. Wer „kleben bleibt", trainiert Suchen statt Mulden.',
  },
  uebung2: {
    title: 'Steckbrief: Systemsprung (6/8)',
    counting: 'Zählweise: „1 – 2" (zwei schwere Schläge pro Takt). Schlag 1: Akkord im Zentrum. Schlag 2: derselbe Block, eine Oktave versetzt in die Zielzone (Zenit oder Nadir).',
    measured: 'Gemessen wird pro Block: Tonhöhe, korrektes Register (richtige Oktave = richtige Zone, gemessen am Grundton gegen die gewählte Lage) und Timing auf beiden Schlägen.',
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
