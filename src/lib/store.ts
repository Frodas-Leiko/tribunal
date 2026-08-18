// ── Lokale Persistenz: Fortschritt & Statistik (bleibt auf diesem Gerät) ────
// R24: Diese Datei ist die einzige Tür zum Browser-Speicher. Die Lint-Regel in
// `eslint.config.js` hält sie zu – `localStorage` außerhalb ist ein Fehler.

import { KEYS, type DictateMode } from './music';

/** Der Stand genau einer bespielbaren Einheit (B-16). */
export interface Stand {
  tempo: number;
  done: boolean;
}

/**
 * R10/R11: Jede spielbare Einheit hat einen messbaren Stand – Stufen-Einheiten
 * je Tonart und Modus (A/B/C), Folgen-Einheiten je Tonart und Akkordfolge.
 */
export interface Progress {
  stufen: Record<string, Stand>;   // Schlüssel: `${keyId}|${A|B|C}`
  folgen: Record<string, Stand>;   // Schlüssel: `${keyId}|${progId}`
}

export type UnitKind = 'stufen' | 'folgen';

/** Zeigt auf genau einen Stand. `passTempo()` kennt nur noch diese Referenz. */
export interface UnitRef {
  kind: UnitKind;
  id: string;
}

export interface ChordError {
  high: number;   // zu hoch gegriffen
  low: number;    // zu tief gegriffen
  total: number;
}

/**
 * R26: Die Aufschlüsselung der Trefferquote in Griff und Zeit. Sie zählt
 * getrennt von `attempts`/`hits`, weil ältere Datensätze beides in einer Zahl
 * vermischt haben – ihre Anschläge zählen hier nicht mit, statt eine
 * Aufteilung zu behaupten, die nie gemessen wurde (R4).
 */
export interface SplitCount {
  attempts: number;         // Anschläge, die getrennt gezählt wurden
  griffOk: number;          // davon mit sitzendem Griff
  timingOk: number;         // davon im Toleranzfenster
  timingMeasured: number;   // Anschläge mit gemessener Zeit (Nenner der Zeit-Quote)
}

export interface StatsData {
  errors: Record<string, ChordError>;   // Schlüssel: `${keyId}|${chordName}`; nur Griff-Fehler (R26)
  timing: Record<string, number[]>;     // Schlüssel: keyId → letzte 60 Offsets (ms)
  attempts: number;
  hits: number;                         // Ton *und* Zeit – die Quote des Konzepts
  split: SplitCount;
}

// Die Schlüsselnamen stammen aus der ersten Fassung und bleiben, damit vorhandener
// Fortschritt erhalten bleibt. Die Schema-Version steht seit R25 *im* Datensatz,
// nicht im Namen des Fachs.
const P_KEY = 'tribunal.progress.v1';
const S_KEY = 'tribunal.stats.v1';

export const START_TEMPO = 60;
export const TEMPO_STEP = 4;
export const TARGET_TEMPO = 100;
export const PASS_STREAK = 8;

/**
 * R25: Jeder gespeicherte Datensatz trägt diese Version.
 * 1 = nackte Tonart-Tabelle ohne Hülle · 2 = dieselbe Tabelle in der Hülle
 * `{version,data}` · 3 = Stände je Einheit (B-16) · 4 = Statistik trennt Griff
 * und Zeit (B-24, R26). Alle Wege sind verlustfrei.
 *
 * Die Nummer gilt für beide Fächer. Der Fortschritt hat seine Form seit
 * Fassung 3 nicht geändert; er zieht bei einem Statistik-Bruch mit und wird
 * dabei unverändert übernommen.
 */
export const SCHEMA_VERSION = 4;

/** Was beim Laden geschah – der Nutzer erfährt es, wenn es nicht `ok` ist. */
export type LoadStatus = 'ok' | 'migriert' | 'zurückgefallen';

export interface Loaded<T> {
  data: T;
  status: LoadStatus;
}

export function emptyProgress(): Progress {
  return { stufen: {}, folgen: {} };
}

function emptySplit(): SplitCount {
  return { attempts: 0, griffOk: 0, timingOk: 0, timingMeasured: 0 };
}

function emptyStats(): StatsData {
  return { errors: {}, timing: {}, attempts: 0, hits: 0, split: emptySplit() };
}

export function stufenUnit(keyId: string, mode: DictateMode): UnitRef {
  return { kind: 'stufen', id: `${keyId}|${mode}` };
}

export function folgenUnit(keyId: string, progId: string): UnitRef {
  return { kind: 'folgen', id: `${keyId}|${progId}` };
}

export function getStand(progress: Progress, unit: UnitRef): Stand {
  return progress[unit.kind][unit.id] ?? { tempo: START_TEMPO, done: false };
}

// ── Formprüfung und Migration ────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStand(v: unknown): v is Stand {
  return isRecord(v) && typeof v.tempo === 'number' && typeof v.done === 'boolean';
}

function isStandMap(v: unknown): v is Record<string, Stand> {
  return isRecord(v) && Object.values(v).every(isStand);
}

function isProgress(v: unknown): v is Progress {
  return isRecord(v) && isStandMap(v.stufen) && isStandMap(v.folgen);
}

/** Fassung 1 und 2 trugen vier Felder je Tonart. */
interface LegacyKeyProgress {
  tempoA: number;
  tempoB: number;
  doneA: boolean;
  doneB: boolean;
}

function isLegacyKeyProgress(v: unknown): v is LegacyKeyProgress {
  return isRecord(v)
    && typeof v.tempoA === 'number' && typeof v.tempoB === 'number'
    && typeof v.doneA === 'boolean' && typeof v.doneB === 'boolean';
}

function isLegacyMap(v: unknown): v is Record<string, LegacyKeyProgress> {
  return isRecord(v) && Object.values(v).every(isLegacyKeyProgress);
}

/** Verlustfrei: `tempoA/doneA` → `…|A`, `tempoB/doneB` → `…|B`. */
function fromLegacy(map: Record<string, LegacyKeyProgress>): Progress {
  const stufen: Record<string, Stand> = {};
  for (const [keyId, p] of Object.entries(map)) {
    stufen[`${keyId}|A`] = { tempo: p.tempoA, done: p.doneA };
    stufen[`${keyId}|B`] = { tempo: p.tempoB, done: p.doneB };
  }
  return { stufen, folgen: {} };
}

/** Fassung 1–3: dieselben Felder, nur ohne die Aufschlüsselung nach R26. */
type LegacyStats = Omit<StatsData, 'split'>;

function isLegacyStats(v: unknown): v is LegacyStats {
  return isRecord(v)
    && typeof v.attempts === 'number' && typeof v.hits === 'number'
    && isRecord(v.errors) && Object.values(v.errors).every(isChordError)
    && isRecord(v.timing)
    && Object.values(v.timing).every((t) => Array.isArray(t) && t.every((n) => typeof n === 'number'));
}

function isSplitCount(v: unknown): v is SplitCount {
  return isRecord(v)
    && typeof v.attempts === 'number' && typeof v.griffOk === 'number'
    && typeof v.timingOk === 'number' && typeof v.timingMeasured === 'number';
}

function isStatsData(v: unknown): v is StatsData {
  return isRecord(v) && isSplitCount(v.split) && isLegacyStats(v);
}

function isChordError(v: unknown): v is ChordError {
  return isRecord(v)
    && typeof v.high === 'number' && typeof v.low === 'number' && typeof v.total === 'number';
}

/**
 * Verlustfrei: Anschläge, Treffer, Fehler und Drift bleiben, wie sie gezählt
 * wurden. Sie enthalten vermischte Ursachen – deshalb beginnt die
 * Aufschlüsselung bei null, statt sie nachträglich zu erfinden (R4, R26).
 */
function fromLegacyStats(s: LegacyStats): StatsData {
  return { ...s, split: emptySplit() };
}

/** Hülle `{version,data}` erkennen; `null`, wenn der Rohtext keine trägt. */
function envelope(v: unknown): { version: number; data: unknown } | null {
  if (!isRecord(v) || typeof v.version !== 'number') return null;
  return { version: v.version, data: v.data };
}

function parse(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * R25: Rohtext → Fortschritt, mit Migrationspfad und ohne stillen Verlust.
 * Rein und ohne Speicherzugriff, damit der Pfad testbar bleibt.
 *
 * - kein Eintrag → Standardwerte, `ok` (nichts gespeichert ist kein Bruch)
 * - Hülle der aktuellen Version → `ok`
 * - Fassung 1 (nackt) oder 2 (Hülle um die Tonart-Tabelle) → übernommen, `migriert`
 * - kaputtes JSON, fremde Version, kaputte Felder → Standardwerte,
 *   `zurückgefallen`; der Rohtext bleibt liegen, hier schreibt niemand.
 */
export function migrateProgress(raw: string | null): Loaded<Progress> {
  if (raw === null) return { data: emptyProgress(), status: 'ok' };
  const p = parse(raw);
  if (!p.ok) return { data: emptyProgress(), status: 'zurückgefallen' };

  const env = envelope(p.value);
  if (env === null) {
    return isLegacyMap(p.value)
      ? { data: fromLegacy(p.value), status: 'migriert' }
      : { data: emptyProgress(), status: 'zurückgefallen' };
  }
  if (env.version === SCHEMA_VERSION && isProgress(env.data)) {
    return { data: env.data, status: 'ok' };
  }
  // Die Stände haben ihre Form seit Fassung 3; hochgezogen hat sie ein Bruch im
  // anderen Fach (B-24). Ein solcher Datensatz ist vollständig, nur älter.
  if (env.version < SCHEMA_VERSION && isProgress(env.data)) {
    return { data: env.data, status: 'migriert' };
  }
  if (env.version === 2 && isLegacyMap(env.data)) {
    return { data: fromLegacy(env.data), status: 'migriert' };
  }
  return { data: emptyProgress(), status: 'zurückgefallen' };
}

/**
 * R25: Rohtext → Statistik. Fassung 1–3 zählten Griff und Zeit in einer Zahl;
 * ihre Werte werden übernommen, die Aufschlüsselung beginnt bei null.
 */
export function migrateStats(raw: string | null): Loaded<StatsData> {
  if (raw === null) return { data: emptyStats(), status: 'ok' };
  const p = parse(raw);
  if (!p.ok) return { data: emptyStats(), status: 'zurückgefallen' };

  const env = envelope(p.value);
  if (env === null) {
    return isLegacyStats(p.value)
      ? { data: fromLegacyStats(p.value), status: 'migriert' }
      : { data: emptyStats(), status: 'zurückgefallen' };
  }
  if (env.version === SCHEMA_VERSION && isStatsData(env.data)) return { data: env.data, status: 'ok' };
  if (env.version < SCHEMA_VERSION && isLegacyStats(env.data)) {
    return { data: fromLegacyStats(env.data), status: 'migriert' };
  }
  return { data: emptyStats(), status: 'zurückgefallen' };
}

// ── Speicherzugriff ──────────────────────────────────────────────────────────

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Privater Modus oder gesperrter Speicher: wie „kein Eintrag".
    return null;
  }
}

function save(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ version: SCHEMA_VERSION, data }));
  } catch {
    /* Speicher voll / privat */
  }
}

export function loadProgress(): Loaded<Progress> {
  return migrateProgress(readRaw(P_KEY));
}

/**
 * Nach bestandener Einheit: Tempo hoch oder Einheit als geschafft markieren.
 * Die Rampe ist für Stufen und Folgen dieselbe (R10).
 * R24: Die Funktion holt den Stand selbst und schreibt ihn selbst zurück – der
 * Aufrufer kennt weder Schlüssel noch Speicher.
 */
export function passTempo(unit: UnitRef): { progress: Progress; newTempo: number; justCompleted: boolean } {
  const progress = loadProgress().data;
  const upd: Stand = { ...getStand(progress, unit) };
  let justCompleted = false;
  if (upd.tempo >= TARGET_TEMPO) {
    upd.done = true;
    justCompleted = true;
  } else {
    upd.tempo = Math.min(TARGET_TEMPO, upd.tempo + TEMPO_STEP);
  }
  const next: Progress = { stufen: { ...progress.stufen }, folgen: { ...progress.folgen } };
  next[unit.kind] = { ...next[unit.kind], [unit.id]: upd };
  save(P_KEY, next);
  return { progress: next, newTempo: upd.tempo, justCompleted };
}

/** Eine Stufe steht, wenn beide Tonarten in Modus A und B stehen (Konzept §5.1). */
export function isStageComplete(progress: Progress, stage: number): boolean {
  const keys = KEYS.filter((k) => k.stage === stage);
  return keys.length > 0 && keys.every((k) =>
    getStand(progress, stufenUnit(k.id, 'A')).done && getStand(progress, stufenUnit(k.id, 'B')).done);
}

export interface Recommendation {
  stage: number;
  keyId: string;
  mode: 'A' | 'B';
}

/**
 * R11: Der Stufenplan empfiehlt, statt zu sperren. Empfohlen ist die erste nicht
 * abgeschlossene Stufe, darin die erste Tonart mit offenem Modus – Modus A vor
 * Modus B. Steht alles, gibt es nichts mehr zu empfehlen (`null`).
 * Modus C ist adaptives Training und steht bewusst außerhalb der Empfehlung.
 */
export function recommendedNext(progress: Progress): Recommendation | null {
  const stages = [...new Set(KEYS.map((k) => k.stage))].sort((a, b) => a - b);
  for (const stage of stages) {
    if (isStageComplete(progress, stage)) continue;
    for (const k of KEYS.filter((key) => key.stage === stage)) {
      if (!getStand(progress, stufenUnit(k.id, 'A')).done) return { stage, keyId: k.id, mode: 'A' };
      if (!getStand(progress, stufenUnit(k.id, 'B')).done) return { stage, keyId: k.id, mode: 'B' };
    }
  }
  return null;
}

// ── Statistik ────────────────────────────────────────────────────────────────

export function loadStats(): Loaded<StatsData> {
  return migrateStats(readRaw(S_KEY));
}

/**
 * Ein bewerteter Anschlag. R26 hält Griff und Zeit auseinander: der Griff geht
 * in die Fehler-Heatmap, die Zeit in die Drift-Linie, und keiner der beiden
 * Werte schreibt in das Fach des anderen.
 */
export interface AttemptRecord {
  keyId: string;
  chordName: string;
  /** Tonhöhenklassen und – in Übung 2 – die Zone: der Block gehört zur Hand (R13). */
  griffOk: boolean;
  /** `null` = nicht gemessen (stehende Uhr). Nicht gemessen ist nicht bestanden (R4). */
  timingOk: boolean | null;
  /** Richtung des Griff-Fehlers: 1 = zu hoch, -1 = zu tief, 0 = ohne Vektor. */
  direction: 1 | -1 | 0;
  /** Gemessene Landung in ms gegen die Zählzeit; `null`, wenn die Uhr steht. */
  timingOffset: number | null;
}

export function recordAttempt(stats: StatsData, a: AttemptRecord): StatsData {
  const next: StatsData = {
    errors: { ...stats.errors },
    timing: { ...stats.timing },
    attempts: stats.attempts + 1,
    // Die Quote des Konzepts ist Ton *und* Zeit – eine nicht gemessene Zeit
    // besteht sie nicht (R4).
    hits: stats.hits + (a.griffOk && a.timingOk === true ? 1 : 0),
    split: {
      attempts: stats.split.attempts + 1,
      griffOk: stats.split.griffOk + (a.griffOk ? 1 : 0),
      timingOk: stats.split.timingOk + (a.timingOk === true ? 1 : 0),
      timingMeasured: stats.split.timingMeasured + (a.timingOk !== null ? 1 : 0),
    },
  };
  if (!a.griffOk) {
    const k = `${a.keyId}|${a.chordName}`;
    const cur = next.errors[k] ?? { high: 0, low: 0, total: 0 };
    next.errors[k] = {
      high: cur.high + (a.direction === 1 ? 1 : 0),
      low: cur.low + (a.direction === -1 ? 1 : 0),
      total: cur.total + 1,
    };
  }
  if (a.timingOffset !== null) {
    const arr = [...(next.timing[a.keyId] ?? []), Math.round(a.timingOffset)];
    next.timing[a.keyId] = arr.slice(-60);
  }
  save(S_KEY, next);
  return next;
}

/**
 * Gewichte für Modus C: Akkorde mit mehr Fehlern werden häufiger abgefragt.
 * `errors` enthält seit R26 nur noch Griff-Fehler – Modus C übt damit Griffe,
 * nicht Landungen. Die Signatur bleibt, die Zahlen darin sind andere.
 */
export function weaknessWeights(stats: StatsData, keyId: string, chordNames: string[]): number[] {
  return chordNames.map((n) => 1 + (stats.errors[`${keyId}|${n}`]?.total ?? 0));
}

export function resetAll(): void {
  localStorage.removeItem(P_KEY);
  localStorage.removeItem(S_KEY);
}
