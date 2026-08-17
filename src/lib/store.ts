// ── Lokale Persistenz: Fortschritt & Statistik (bleibt auf diesem Gerät) ────
// R24: Diese Datei ist die einzige Tür zum Browser-Speicher. Die Lint-Regel in
// `eslint.config.js` hält sie zu – `localStorage` außerhalb ist ein Fehler.

import { KEYS } from './music';

export interface KeyProgress {
  tempoA: number;
  tempoB: number;
  doneA: boolean;
  doneB: boolean;
}

export type ProgressMap = Record<string, KeyProgress>;

export interface ChordError {
  high: number;   // zu hoch gegriffen
  low: number;    // zu tief gegriffen
  total: number;
}

export interface StatsData {
  errors: Record<string, ChordError>;   // Schlüssel: `${keyId}|${chordName}`
  timing: Record<string, number[]>;     // Schlüssel: keyId → letzte 60 Offsets (ms)
  attempts: number;
  hits: number;
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

/** R25: Jeder gespeicherte Datensatz trägt diese Version. Fassung 1 trug keine. */
export const SCHEMA_VERSION = 2;

/** Was beim Laden geschah – der Nutzer erfährt es, wenn es nicht `ok` ist. */
export type LoadStatus = 'ok' | 'migriert' | 'zurückgefallen';

export interface Loaded<T> {
  data: T;
  status: LoadStatus;
}

function emptyStats(): StatsData {
  return { errors: {}, timing: {}, attempts: 0, hits: 0 };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isKeyProgress(v: unknown): v is KeyProgress {
  return isRecord(v)
    && typeof v.tempoA === 'number' && typeof v.tempoB === 'number'
    && typeof v.doneA === 'boolean' && typeof v.doneB === 'boolean';
}

function isProgressMap(v: unknown): v is ProgressMap {
  return isRecord(v) && Object.values(v).every(isKeyProgress);
}

function isChordError(v: unknown): v is ChordError {
  return isRecord(v)
    && typeof v.high === 'number' && typeof v.low === 'number' && typeof v.total === 'number';
}

function isStatsData(v: unknown): v is StatsData {
  return isRecord(v)
    && typeof v.attempts === 'number' && typeof v.hits === 'number'
    && isRecord(v.errors) && Object.values(v.errors).every(isChordError)
    && isRecord(v.timing)
    && Object.values(v.timing).every((t) => Array.isArray(t) && t.every((n) => typeof n === 'number'));
}

/**
 * R25: Rohtext → Datensatz, mit Migrationspfad und ohne stillen Verlust.
 * Rein und ohne Speicherzugriff, damit der Pfad testbar bleibt.
 *
 * - kein Eintrag → Standardwerte, `ok` (nichts gespeichert ist kein Bruch)
 * - Hülle mit aktueller Version und gültigem Inhalt → `ok`
 * - nackter Datensatz ohne Hülle (Fassung 1) → übernommen, `migriert`
 * - kaputtes JSON, fremde Version, kaputte Felder → Standardwerte,
 *   `zurückgefallen`; der Rohtext bleibt liegen, hier schreibt niemand.
 */
function migrateRecord<T>(raw: string | null, fallback: T, valid: (v: unknown) => v is T): Loaded<T> {
  if (raw === null) return { data: fallback, status: 'ok' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { data: fallback, status: 'zurückgefallen' };
  }
  if (isRecord(parsed) && typeof parsed.version === 'number') {
    return parsed.version === SCHEMA_VERSION && valid(parsed.data)
      ? { data: parsed.data, status: 'ok' }
      : { data: fallback, status: 'zurückgefallen' };
  }
  return valid(parsed)
    ? { data: parsed, status: 'migriert' }
    : { data: fallback, status: 'zurückgefallen' };
}

export function migrateProgress(raw: string | null): Loaded<ProgressMap> {
  return migrateRecord(raw, {}, isProgressMap);
}

export function migrateStats(raw: string | null): Loaded<StatsData> {
  return migrateRecord(raw, emptyStats(), isStatsData);
}

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

export function loadProgress(): Loaded<ProgressMap> {
  return migrateProgress(readRaw(P_KEY));
}

export function getKeyProgress(map: ProgressMap, keyId: string): KeyProgress {
  return map[keyId] ?? { tempoA: START_TEMPO, tempoB: START_TEMPO, doneA: false, doneB: false };
}

/**
 * Nach bestandener Einheit: Tempo hoch oder Modus als geschafft markieren.
 * R24: Die Funktion holt den Stand selbst und schreibt ihn selbst zurück – der
 * Aufrufer kennt weder Schlüssel noch Speicher.
 */
export function passTempo(keyId: string, mode: 'A' | 'B'): { map: ProgressMap; newTempo: number; justCompleted: boolean } {
  const map = loadProgress().data;
  const cur = getKeyProgress(map, keyId);
  const next: ProgressMap = { ...map };
  const upd = { ...cur };
  let justCompleted = false;
  if (mode === 'A') {
    if (upd.tempoA >= TARGET_TEMPO) { upd.doneA = true; justCompleted = true; }
    else upd.tempoA = Math.min(TARGET_TEMPO, upd.tempoA + TEMPO_STEP);
  } else {
    if (upd.tempoB >= TARGET_TEMPO) { upd.doneB = true; justCompleted = true; }
    else upd.tempoB = Math.min(TARGET_TEMPO, upd.tempoB + TEMPO_STEP);
  }
  next[keyId] = upd;
  save(P_KEY, next);
  return { map: next, newTempo: mode === 'A' ? upd.tempoA : upd.tempoB, justCompleted };
}

export function isStageComplete(map: ProgressMap, stage: number): boolean {
  const keys = KEYS.filter((k) => k.stage === stage);
  return keys.length > 0 && keys.every((k) => {
    const p = getKeyProgress(map, k.id);
    return p.doneA && p.doneB;
  });
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
 */
export function recommendedNext(map: ProgressMap): Recommendation | null {
  const stages = [...new Set(KEYS.map((k) => k.stage))].sort((a, b) => a - b);
  for (const stage of stages) {
    if (isStageComplete(map, stage)) continue;
    for (const k of KEYS.filter((key) => key.stage === stage)) {
      const p = getKeyProgress(map, k.id);
      if (!p.doneA) return { stage, keyId: k.id, mode: 'A' };
      if (!p.doneB) return { stage, keyId: k.id, mode: 'B' };
    }
  }
  return null;
}

// ── Statistik ────────────────────────────────────────────────────────────────

export function loadStats(): Loaded<StatsData> {
  return migrateStats(readRaw(S_KEY));
}

export function recordAttempt(
  stats: StatsData,
  keyId: string,
  chordName: string,
  pitchOk: boolean,
  direction: 1 | -1 | 0, // 1 = zu hoch, -1 = zu tief, 0 = korrekt/ohne Vektor
  timingOffset: number | null,
): StatsData {
  const next: StatsData = {
    errors: { ...stats.errors },
    timing: { ...stats.timing },
    attempts: stats.attempts + 1,
    hits: stats.hits + (pitchOk ? 1 : 0),
  };
  if (!pitchOk) {
    const k = `${keyId}|${chordName}`;
    const cur = next.errors[k] ?? { high: 0, low: 0, total: 0 };
    next.errors[k] = {
      high: cur.high + (direction === 1 ? 1 : 0),
      low: cur.low + (direction === -1 ? 1 : 0),
      total: cur.total + 1,
    };
  }
  if (timingOffset !== null) {
    const arr = [...(next.timing[keyId] ?? []), Math.round(timingOffset)];
    next.timing[keyId] = arr.slice(-60);
  }
  save(S_KEY, next);
  return next;
}

/** Gewichte für Modus C: Akkorde mit mehr Fehlern werden häufiger abgefragt. */
export function weaknessWeights(stats: StatsData, keyId: string, chordNames: string[]): number[] {
  return chordNames.map((n) => 1 + (stats.errors[`${keyId}|${n}`]?.total ?? 0));
}

export function resetAll(): void {
  localStorage.removeItem(P_KEY);
  localStorage.removeItem(S_KEY);
}
