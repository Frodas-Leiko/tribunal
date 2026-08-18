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
// Sollbestand: `docs/Akkordfolgen.md` (32 Folgen, Kategorien A–E). R14: Eine Folge
// ist ein Datensatz, sonst nichts – kein `if` auf eine Folgen-Kennung, keine
// Sonderbehandlung im Scheduler. Reihenfolge wie im Dokument (Nr. 1–32); die
// abweichende Anzeige-Reihenfolge ist Sache der Auswahl (B-22).

export type ProgressionKategorie = 'kadenz' | 'sequenz' | 'moll' | 'pop' | 'blues-jazz';

export interface ProgressionDef {
  id: string;
  name: string;
  kategorie: ProgressionKategorie;
  /**
   * `null` heißt: In diesem Tongeschlecht **bewusst nicht angeboten**. Das ist eine
   * Eigenschaft des Datensatzes, kein Fehler – anders als eine Stufe, die es in der
   * Tonart nicht gibt (R16). Beides führt zu „nicht verfügbar", mit verschiedener
   * Begründung.
   */
  degrees: { dur: string[] | null; moll: string[] | null };
  logic: string;         // „Warum klingt das richtig?"
  fingeringHint: string;
  /** Für Übung 2 (Systemsprung) freigegeben. Faustregel: bis 8 Akkorde ja. */
  uebung2: boolean;
}

/**
 * Stufenkette in der Schreibweise des Datensatzes: Akkorde durch Gedankenstrich
 * getrennt, Taktgruppen (Blues) zusätzlich durch Leerzeichen. Damit steht hier
 * dieselbe Zeile wie in `docs/Akkordfolgen.md` und lässt sich Zeichen für Zeichen
 * vergleichen.
 */
const kette = (chain: string): string[] => chain.split(/[\s\u2013]+/).filter((d) => d.length > 0);

// Die Wippen 24–26 teilen sich im Datensatz einen Text – hier wie dort.
const WIPPE_LOGIK = 'Die kürzestmöglichen Folgen: zwei Mulden im ständigen Wechsel. Nicht als Musik gedacht, sondern als Werkzeug: Wer eine Wippe bei 100 bpm blind trifft, hat genau eine Muldenbeziehung gespeichert.';
const WIPPE_FINGERSATZ = 'Immer denselben Weg gehen, immer die Hand komplett lösen. Diese drei Folgen sind der empfohlene Einstieg für jede neue Tonart – vor jeder Kadenz.';

export const PROGRESSIONS: ProgressionDef[] = [
  // ── A · Kadenzen und Schlusswendungen ─────────────────────────────────────
  {
    id: 'vollkadenz',
    name: 'Vollkadenz',
    kategorie: 'kadenz',
    degrees: { dur: kette('I – IV – V – I'), moll: kette('i – iv – V – i') },
    logic: 'Heimat, Spannung, höchste Spannung, Rückkehr. Das harmonische Fundament: Subdominante und Dominante umklammern die Tonika.',
    fingeringHint: 'I→IV wandert die ganze Mulde eine Stufe aufwärts, V→I fällt sie zurück. Durchgehend 1–3–5. Der Grundton bleibt in der Anker-Oktave (R12).',
    uebung2: true,
  },
  {
    id: 'erweitert',
    name: 'Erweiterte Kadenz',
    kategorie: 'kadenz',
    degrees: { dur: kette('I – IV – I – V – I'), moll: kette('i – iv – i – V – i') },
    logic: 'Die Rückkehr zur Tonika zwischen Sub- und Dominante verlangsamt die Kadenz und trainiert den Wechsel in beide Richtungen.',
    fingeringHint: 'IV→I und I→V sind reine Mulden-Verschiebungen um je eine Stufe. Der Mittelfinger trägt die Terz und entscheidet über Dur oder Moll.',
    uebung2: true,
  },
  {
    id: 'quintfall',
    name: 'Quintfall (ii–V–I)',
    kategorie: 'kadenz',
    degrees: { dur: kette('ii – V – I'), moll: kette('ii° – V – i') },
    logic: 'Der wichtigste Schluss der klassischen Harmonik: die Stufen fallen in Quinten. Maximale Zielstrebigkeit zur Tonika.',
    fingeringHint: 'Drei Mulden im Abstand je einer Stufe; die Hand klettert und fällt dann zwei Stufen zurück.',
    uebung2: true,
  },
  {
    id: 'doppelkadenz',
    name: 'Kadenz mit Subdominantparallele',
    kategorie: 'kadenz',
    degrees: { dur: kette('I – ii – V – I'), moll: kette('i – ii° – V – i') },
    logic: 'Die zweite Stufe übernimmt die Rolle der Subdominante; der Bass schreitet in Sekunden statt zu springen.',
    fingeringHint: 'I→ii ist ein Ganzton für alle drei Finger gleichzeitig – die Mulde bleibt exakt erhalten. Ideal als erste Sequenz-Erfahrung.',
    uebung2: true,
  },
  {
    id: 'plagal',
    name: 'Plagalschluss („Amen-Schluss")',
    kategorie: 'kadenz',
    degrees: { dur: kette('IV – I'), moll: kette('iv – i') },
    logic: 'Zwei Akkorde, ein Schluss. Der weiche „Amen"-Fall ohne Leitton. Die kürzeste vollständige Wendung überhaupt.',
    fingeringHint: 'IV und I teilen sich den Grundton der Tonika; nur zwei Finger bewegen sich wirklich. Perfekt zum Aufbau der ersten Griffmulde.',
    uebung2: true,
  },
  {
    id: 'halbschluss',
    name: 'Halbschluss',
    kategorie: 'kadenz',
    degrees: { dur: kette('I – ii – V'), moll: kette('i – ii° – V') },
    logic: 'Die Kadenz, die offen bleibt: sie endet auf der Dominante und verlangt eine Fortsetzung. Trainiert das Hören von Spannung ohne Auflösung.',
    fingeringHint: 'Zwei Ganztonschritte aufwärts. Die Hand bewegt sich nur in eine Richtung – gut für die Kalibrierung des Bewegungsgefühls.',
    uebung2: true,
  },
  {
    id: 'trugschluss',
    name: 'Trugschluss',
    kategorie: 'kadenz',
    degrees: { dur: kette('I – IV – V – vi'), moll: kette('i – iv – V – VI') },
    logic: 'Die Dominante geht nicht heim, sondern zur Parallele. Der Ohr-Effekt ist verblüffend; die Hand lernt eine unerwartete Zielmulde.',
    fingeringHint: 'V→vi ist ein einziger Halb- bzw. Ganztonschritt aufwärts – winzige Bewegung, große Wirkung. Genau hinhören, nicht hinsehen.',
    uebung2: true,
  },
  {
    id: 'wechselkadenz',
    name: 'Wechselkadenz',
    kategorie: 'kadenz',
    degrees: { dur: kette('I – V – I – IV – I'), moll: kette('i – V – i – iv – i') },
    logic: 'Tonika im Wechsel mit ihren beiden Nachbarn. Die klassische Anfängerformel, um Dominante und Subdominante voneinander zu unterscheiden.',
    fingeringHint: 'Die Hand pendelt um einen festen Mittelpunkt. Wer die Tonika-Mulde blind wiederfindet, hat die Übung bestanden.',
    uebung2: true,
  },
  {
    id: 'bassgang',
    name: 'Große Kadenz (Bassgang)',
    kategorie: 'kadenz',
    degrees: { dur: kette('I – iii – vi – IV – V – I'), moll: kette('i – III – VI – iv – V – i') },
    logic: 'Eine vollständige Rundreise durch die wichtigsten Stufen der Tonart: Tonika, ihre beiden Parallelen, Subdominante, Dominante, zurück.',
    fingeringHint: 'Sechs Mulden hintereinander – die längste Folge, die noch ohne Blick machbar ist. Erst bei 60 bpm sicher, dann Tempo.',
    uebung2: true,
  },

  // ── B · Sequenzen und Ketten ──────────────────────────────────────────────
  {
    id: 'kanon',
    name: 'Kanon-Sequenz (Pachelbel)',
    kategorie: 'sequenz',
    degrees: { dur: kette('I – V – vi – iii – IV – I – IV – V'), moll: null },
    logic: 'Das Pachelbel-Muster: eine Kette von Quintfällen, die sich durch die ganze Tonart spiralt. Steckt in hunderten klassischen und modernen Stücken. (In Moll bewusst nicht angeboten – Konzept §5.2.)',
    fingeringHint: 'Die Sprünge V→vi und iii→IV sind größer als eine Stufe – hier zahlt die Topographie-Karte ein. Erst langsam, die Mulde komplett formen, dann landen.',
    uebung2: true,
  },
  {
    id: 'quintfallkette',
    name: 'Quintfall-Kette (vollständig)',
    kategorie: 'sequenz',
    degrees: { dur: kette('I – IV – vii° – iii – vi – ii – V – I'), moll: kette('i – iv – VII – III – VI – ii° – V – i') },
    logic: 'Alle sieben Stufen der Tonart in einer einzigen Quintfall-Spirale. Die vollständige Landkarte der Tonart in acht Griffen.',
    fingeringHint: 'Der Bass fällt jedes Mal eine Quinte, die Hand steigt abwechselnd eine Stufe und fällt zwei. Die Königsübung für Modus A.',
    uebung2: true,
  },
  {
    id: 'sekundsequenz-auf',
    name: 'Aufsteigende Sekundsequenz',
    kategorie: 'sequenz',
    degrees: { dur: kette('I – ii – iii – IV'), moll: kette('i – ii° – III – iv') },
    logic: 'Vier Stufen im Gänsemarsch aufwärts. Die reinste Form der Mulden-Verschiebung: identische Handform, neuer Ort.',
    fingeringHint: 'Jeder Wechsel ist eine Parallelverschiebung um eine Stufe. Kein Finger wechselt seine Rolle – die einzige Frage ist, ob die Hand den Abstand trifft.',
    uebung2: true,
  },
  {
    id: 'sekundsequenz-ab',
    name: 'Absteigende Sekundsequenz (Lamento)',
    kategorie: 'sequenz',
    degrees: { dur: kette('I – vii° – vi – V'), moll: kette('i – VII – VI – v') },
    logic: 'Die klagende Abwärtslinie. In Moll mit der natürlichen Moll-Dominante (v) – weich, ohne Leitton.',
    fingeringHint: 'Abwärtsbewegungen fühlen sich anders an als Aufwärtsbewegungen: der Arm muss aktiv bremsen. Bewusst steuern, nicht fallen lassen.',
    uebung2: true,
  },
  {
    id: 'terzfallkette',
    name: 'Terzfall-Kette',
    kategorie: 'sequenz',
    degrees: { dur: kette('I – vi – IV – ii'), moll: kette('i – VI – iv – ii°') },
    logic: 'Der Bass fällt in Terzen. Zwei von drei Tönen bleiben bei jedem Wechsel liegen – hörbar weich, taktil anspruchsvoll.',
    fingeringHint: 'Weil zwei Töne gemeinsam sind, verführt die Folge zum Kleben. Genau hier gilt: Hand komplett lösen, in der Luft neu formen (Konzept §3).',
    uebung2: true,
  },

  // ── C · Moll-Wendungen ────────────────────────────────────────────────────
  {
    id: 'mollwendung',
    name: 'Moll-Wendung / Andalusische Kadenz',
    kategorie: 'moll',
    degrees: { dur: null, moll: kette('i – VII – VI – V') },
    logic: 'Die absteigende Moll-Formel von der Tonika über die tiefen Stufen zur Dominante. Von Flamenco bis Filmmusik. VII ist hier der Dur-Dreiklang auf der kleinen Septime (a-Moll → G-Dur), nicht der Leittondreiklang. Die Dur-Variante wird nach Konzept §5.2 bewusst nicht angeboten.',
    fingeringHint: 'Drei Mulden fallen je eine Stufe abwärts, dann der Sprung zur Dominante mit ihrem Leitton – der einzige „fremde" Ton der Folge.',
    uebung2: true,
  },
  {
    id: 'mollkadenz-natur',
    name: 'Natürliche Moll-Kadenz',
    kategorie: 'moll',
    degrees: { dur: null, moll: kette('i – iv – v – i') },
    logic: 'Dieselbe Kadenz wie die Vollkadenz, aber mit der weichen Moll-Dominante statt der Dur-Dominante. Der direkte Hörvergleich macht deutlich, was der Leitton leistet.',
    fingeringHint: 'Identische Mulden-Wege wie in der Vollkadenz – nur der Mittelfinger sitzt auf der Dominante einen Halbton tiefer. Ein Halbton, eine ganz andere Welt.',
    uebung2: true,
  },
  {
    id: 'mollaufstieg',
    name: 'Moll-Aufstieg',
    kategorie: 'moll',
    degrees: { dur: null, moll: kette('i – III – iv – V') },
    logic: 'Von der Moll-Tonika über die Dur-Parallele aufwärts zur Dominante. Zeigt, dass Moll-Tonarten Dur-Akkorde enthalten.',
    fingeringHint: 'i→III teilt sich zwei Töne, die Hand rutscht nur eine Stufe. Der Weg iv→V ist der Standard-Kadenzschritt aus der Vollkadenz.',
    uebung2: true,
  },

  // ── D · Pop und Songwriting ───────────────────────────────────────────────
  {
    id: 'achse',
    name: 'Achse der Vier',
    kategorie: 'pop',
    degrees: { dur: kette('I – V – vi – IV'), moll: kette('i – VI – III – VII') },
    logic: 'Die meistgespielte Vier-Akkord-Folge der populären Musik. Vier Stufen, die in jeder Reihenfolge funktionieren, weil sie sich paarweise Töne teilen.',
    fingeringHint: 'V→vi ist der kleinste Schritt der Folge, vi→IV der größte. Die Topographie-Karte zeigt beide Sprünge als Wechsel zwischen 2er- und 3er-Insel.',
    uebung2: true,
  },
  {
    id: 'achse-vi',
    name: 'Achse ab der Parallele',
    kategorie: 'pop',
    degrees: { dur: kette('vi – IV – I – V'), moll: null },
    logic: 'Dieselben vier Akkorde, aber ab der Moll-Parallele. Dieselbe Hand, ganz anderer Charakter – ein Hörexperiment mit identischer Geometrie.',
    fingeringHint: 'Bewusst als eigene Übung: Die Hand darf sich nicht auf die gewohnte Startmulde verlassen (Konzept §4.5, „nie die Gewohnheit der Hand").',
    uebung2: true,
  },
  {
    id: 'stufenweg',
    name: 'Doo-Wop / Stufenweg (50er)',
    kategorie: 'pop',
    degrees: { dur: kette('I – vi – IV – V'), moll: kette('i – VI – iv – V') },
    logic: 'Verbindet das Tonika-Gegengewicht (vi) mit der Kadenz (IV–V). Eine der häufigsten Verbindungsformeln überhaupt.',
    fingeringHint: 'I→vi ist der Wechsel zur Parallel-Moll: gleiche Lage, wandernder Grundton. Der Mittelfinger prüft die Terz.',
    uebung2: true,
  },
  {
    id: 'turnaround',
    name: 'Turnaround',
    kategorie: 'pop',
    degrees: { dur: kette('I – vi – ii – V'), moll: kette('i – VI – ii° – V') },
    logic: 'Die Rückkehrschleife: Sie endet auf der Dominante und führt zwingend an den Anfang zurück. Grundbaustein von Jazz-Standards und Popsongs.',
    fingeringHint: 'Vier Mulden in fallenden Terzen und Quinten. Weil sich die Folge selbst zurückführt, eignet sie sich besonders für lange Serien.',
    uebung2: true,
  },
  {
    id: 'poppunk',
    name: 'Pop-Wippe',
    kategorie: 'pop',
    degrees: { dur: kette('I – IV – vi – V'), moll: kette('i – iv – VI – V') },
    logic: 'Tonika, Subdominante, Parallele, Dominante. Der eingängigste Weg durch die Tonart, ohne einen einzigen Sprung über zwei Stufen.',
    fingeringHint: 'IV→vi ist der einzige Terzschritt; alles andere sind Sekund- und Quintwege. Gute Folge, um das Tempo hochzuziehen.',
    uebung2: true,
  },
  {
    id: 'mollachse',
    name: 'Moll-Achse',
    kategorie: 'pop',
    degrees: { dur: null, moll: kette('i – III – VII – VI') },
    logic: 'Die Moll-Variante der Achse: von der Tonika über die Dur-Parallele abwärts. Der Standard moderner Moll-Songs.',
    fingeringHint: 'Drei der vier Akkorde sind Dur-Dreiklänge – die Hand muss die kleine Terz nur einmal treffen. Übung für den Wechsel der Terz-Qualität.',
    uebung2: true,
  },
  {
    id: 'wippe-subdominante',
    name: 'Zwei-Akkord-Wippe: Subdominante',
    kategorie: 'pop',
    degrees: { dur: kette('I – IV'), moll: kette('i – iv') },
    logic: WIPPE_LOGIK,
    fingeringHint: WIPPE_FINGERSATZ,
    uebung2: true,
  },
  {
    id: 'wippe-dominante',
    name: 'Zwei-Akkord-Wippe: Dominante',
    kategorie: 'pop',
    degrees: { dur: kette('I – V'), moll: kette('i – V') },
    logic: WIPPE_LOGIK,
    fingeringHint: WIPPE_FINGERSATZ,
    uebung2: true,
  },
  {
    id: 'wippe-parallele',
    name: 'Zwei-Akkord-Wippe: Parallele',
    kategorie: 'pop',
    degrees: { dur: kette('I – vi'), moll: kette('i – VI') },
    logic: WIPPE_LOGIK,
    fingeringHint: WIPPE_FINGERSATZ,
    uebung2: true,
  },

  // ── E · Blues und Jazz (Dreiklangs-Fassungen) ─────────────────────────────
  {
    id: 'blues12',
    name: '12-Takt-Blues',
    kategorie: 'blues-jazz',
    degrees: { dur: kette('I I I I – IV IV I I – V IV I V'), moll: kette('i i i i – iv iv i i – V iv i V') },
    logic: 'Das Grundgerüst des Blues in reiner Dreiklangs-Fassung: zwölf Takte, drei Akkorde, feste Reihenfolge. (Ohne Septakkorde – siehe Set B.)',
    fingeringHint: 'Die langen Tonika-Strecken sind der eigentliche Test: Die Hand muss viermal dieselbe Mulde neu formen, statt liegenzubleiben.',
    uebung2: false,
  },
  {
    id: 'blues-quickchange',
    name: 'Quick-Change-Blues',
    kategorie: 'blues-jazz',
    degrees: { dur: kette('I IV I I – IV IV I I – V IV I V'), moll: kette('i iv i i – iv iv i i – V iv i V') },
    logic: 'Wie der 12-Takt-Blues, aber mit dem frühen Ausflug zur Subdominante im zweiten Takt. Der Standard in Jazz- und Bluesrunden.',
    fingeringHint: 'Der frühe Wechsel im zweiten Takt kommt für die Hand überraschend – genau darum ist er ein gutes Timing-Training.',
    uebung2: false,
  },
  {
    id: 'blues8',
    name: '8-Takt-Blues',
    kategorie: 'blues-jazz',
    degrees: { dur: kette('I – V – IV – IV – I – V – I – V'), moll: kette('i – V – iv – iv – i – V – i – V') },
    logic: 'Die kompakte Blues-Form. Halb so lang, gleiche Logik, für Übung 2 noch handhabbar.',
    fingeringHint: 'Der Wechsel V→IV ist ein Quintfall abwärts – ungewohnt, weil er gegen die klassische Kadenzrichtung läuft.',
    uebung2: true,
  },
  {
    id: 'rhythmchanges',
    name: 'Rhythm-Changes-Kern (A-Teil)',
    kategorie: 'blues-jazz',
    degrees: { dur: kette('I – vi – ii – V – I – vi – ii – V'), moll: kette('i – VI – ii° – V – i – VI – ii° – V') },
    logic: 'Der A-Teil eines der meistgespielten Jazz-Formen, auf Dreiklänge reduziert: zwei Turnarounds hintereinander.',
    fingeringHint: 'Acht Griffe, aber nur vier verschiedene Mulden. Die Wiederholung macht sie zur idealen Serien-Übung für das Erfolgskriterium.',
    uebung2: true,
  },
  {
    id: 'jazzkette',
    name: 'Erweiterter Quintfall',
    kategorie: 'blues-jazz',
    degrees: { dur: kette('iii – vi – ii – V – I'), moll: kette('III – VI – ii° – V – i') },
    logic: 'Der Quintfall, um zwei Stufen nach vorn verlängert. Die längste zielgerichtete Bewegung, die die Tonart hergibt.',
    fingeringHint: 'Fünf Mulden auf einer einzigen fallenden Quintlinie. Wer sie blind schafft, hat die Landkarte der Tonart verinnerlicht.',
    uebung2: true,
  },
  {
    id: 'modalwippe',
    name: 'Modale Wippe',
    kategorie: 'blues-jazz',
    degrees: { dur: kette('I – ii'), moll: kette('i – VII') },
    logic: 'Zwei Akkorde, die keine Kadenz bilden: Tonika und Nachbarstufe im Wechsel. Erzeugt den schwebenden, modalen Charakter moderner Musik.',
    fingeringHint: 'Reine Parallelverschiebung um eine Stufe. Die einfachste denkbare Bewegung – ideal, um bei ±20 ms Toleranz zu üben.',
    uebung2: true,
  },
];

// ── Auflösung einer Akkordfolge (R16) ───────────────────────────────────────

/**
 * Entweder die **vollständige** Akkordkette oder der Grund, warum es sie nicht gibt –
 * nie eine gekürzte Kette. Eine still verworfene Stufe macht aus einer achtgliedrigen
 * Folge klanglos eine siebengliedrige; der Nutzer übt dann etwas anderes als das, was
 * im Steckbrief steht (R16).
 *
 * Die zwei Gründe sind verschieden schwer: `nicht-angeboten` ist eine Entscheidung des
 * Datensatzes (B-20), `nicht-aufloesbar` ein Fehler, der laut werden muss (R16).
 */
export type ProgressionResolution =
  | { ok: true; chords: ChordDef[] }
  | { ok: false; grund: 'nicht-angeboten' }
  | { ok: false; grund: 'nicht-aufloesbar'; missing: string[] };

// Einmal je Folge und Tonart: Die Auswahl fragt bei jedem Rendern nach, die
// Wiederholung derselben Meldung trägt keine neue Information.
const reported = new Set<string>();

export function resolveProgression(key: KeyDef, prog: ProgressionDef): ProgressionResolution {
  const degrees = prog.degrees[key.mode];
  // Kein Fehler, sondern eine Eigenschaft des Datensatzes: Diese Folge wird in diesem
  // Tongeschlecht bewusst nicht angeboten. Deshalb auch kein `console.error`.
  if (degrees === null) return { ok: false, grund: 'nicht-angeboten' };

  const chords: ChordDef[] = [];
  const missing: string[] = [];
  for (const degree of degrees) {
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
  return { ok: false, grund: 'nicht-aufloesbar', missing };
}

/**
 * Warum diese Folge in dieser Einheit nicht spielbar ist – oder `null`, wenn sie es
 * ist. Ein Grund, ein Satz (R3): Die Stufenkette gibt es in dieser Tonart nicht, das
 * Tongeschlecht ist bewusst nicht angeboten (B-20), oder die Folge ist für Übung 2
 * nicht freigegeben. Die Auswahl zeigt den Satz an, statt den Eintrag zu verstecken
 * (R16, B-20 AK 3).
 */
export function unavailableReason(key: KeyDef, prog: ProgressionDef, exercise: 1 | 2): string | null {
  const res = resolveProgression(key, prog);
  if (!res.ok) {
    if (res.grund === 'nicht-angeboten') return `Nur in ${key.mode === 'dur' ? 'Moll' : 'Dur'} angeboten.`;
    return `Stufe ${res.missing.join(', ')} gibt es in ${key.label} nicht.`;
  }
  if (exercise === 2 && !prog.uebung2) return 'Nicht für Übung 2 freigegeben.';
  return null;
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

/**
 * Liegt diese Tonhöhenklasse auf einer schwarzen Taste? Die sieben Naturtöne aus
 * `NATURAL_PC` sind weiß, alles andere ist schwarz – mehr braucht die Hand nicht
 * zu wissen (Konzept §4.1).
 */
export function isBlackKey(pc: number): boolean {
  return !NATURAL_PC.includes(((pc % 12) + 12) % 12);
}

/**
 * Die ausführbare Anweisung für einen Halbtonschritt (B-26, R2 groß): Beschaffenheit
 * der **Zieltaste** und ihre Seite relativ zur Hand.
 *
 * `links`/`rechts` statt `tiefer`/`höher`, weil die große Zeile ohne Theoriekenntnis
 * ausführbar sein muss (R2): „tiefer" ist Tonhöhensprache, „links daneben" ist eine
 * Handbewegung. Konzept §4.1 nennt genau diese Form als Beispiel („die schwarze Taste
 * links daneben", „inkl. Richtung relativ zur Hand"). Ab zwei Tasten Abstand bleibt es
 * bei der Zählform: eine Farbe ohne Nachbarschaft hilft der Hand nicht.
 *
 * @param zielPc Tonhöhenklasse des **Ziels**, nicht des gespielten Tons – wer eine
 *               schwarze Taste zu tief liegt, soll wissen, worauf er landet.
 * @param diff   gespielt − Ziel in Halbtönen; positiv = zu hoch gegriffen.
 */
export function nachbartasteText(zielPc: number, diff: 1 | -1): string {
  const farbe = isBlackKey(zielPc) ? 'schwarze' : 'weiße';
  return `die ${farbe} Taste ${diff > 0 ? 'links' : 'rechts'} daneben`;
}

// ── Tribunal: Fehlgriff → genau eine ausführbare Korrektur ──────────────────

export interface TribunalVerdict {
  big: string;                  // R2 groß: ausführbar ohne Theoriekenntnis
  small: string;                // R2 klein: Fachbegriff
  direction: 1 | -1 | 0;        // 1 = zu hoch gegriffen, -1 = zu tief, 0 = ohne Richtung
  /**
   * R27: der Finger, über den das Urteil spricht – 0 Grundton, 1 Terz,
   * 2 Quinte. `null` bei Urteilen ohne Finger: „Ein Ton zu viel" und
   * „Akkord nicht gefunden" nennen keinen.
   */
  finger: 0 | 1 | 2 | null;
  /** Größe der Abweichung in Halbtönen; 0, wenn das Urteil ohne Vektor auskommt. */
  halbtoene: number;
}

/** Der Index eines Dreiklang-Tons als Finger (R27); alles andere hat keinen. */
function fingerOf(idx: number): 0 | 1 | 2 | null {
  return idx === 0 || idx === 1 || idx === 2 ? idx : null;
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
  let best: { idx: number; diff: number; zielPc: number } | null = null;
  for (const target of missing) {
    for (const played of extra) {
      let diff = played - target.pc;
      while (diff > 6) diff -= 12;
      while (diff < -6) diff += 12;
      if (!best || Math.abs(diff) < Math.abs(best.diff)) best = { idx: target.idx, diff, zielPc: target.pc };
    }
  }
  if (best) {
    const n = Math.abs(best.diff);
    // B-26: Beim Nachbarn nennt die Anweisung die Zieltaste selbst, sonst zählt sie.
    const weg = n === 1
      ? nachbartasteText(best.zielPc, best.diff > 0 ? 1 : -1)
      : `${n} Tasten ${best.diff > 0 ? 'tiefer' : 'höher'}`;
    return {
      big: `${FINGER_NAMES[best.idx]}: ${weg}`,
      small: `${INTERVAL_NAMES[best.idx]} ${best.diff > 0 ? '+' : '−'}${n} Halbton${n > 1 ? 'e' : ''}`,
      direction: best.diff > 0 ? 1 : -1,
      finger: fingerOf(best.idx),
      halbtoene: n,
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
      // Der Finger steht fest, die Größe nicht: ein fehlender Ton hat keinen Vektor.
      finger: fingerOf(idx),
      halbtoene: 0,
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
      finger: null,
      halbtoene: 0,
    };
  }

  // Rang 4 – Notnagel (R23): kein einziger Zielton getroffen.
  return {
    big: 'Akkord nicht gefunden',
    small: `Ziel: ${chord.name} – Mulde komplett neu formen.`,
    direction: 0,
    finger: null,
    halbtoene: 0,
  };
}
