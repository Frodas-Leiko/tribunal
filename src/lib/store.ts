// ── Lokale Persistenz: Fortschritt & Statistik (bleibt auf diesem Gerät) ────

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

const P_KEY = 'tribunal.progress.v1';
const S_KEY = 'tribunal.stats.v1';

export const START_TEMPO = 60;
export const TEMPO_STEP = 4;
export const TARGET_TEMPO = 100;
export const PASS_STREAK = 8;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* Speicher voll / privat */
  }
}

export function loadProgress(): ProgressMap {
  return load<ProgressMap>(P_KEY, {});
}

export function getKeyProgress(map: ProgressMap, keyId: string): KeyProgress {
  return map[keyId] ?? { tempoA: START_TEMPO, tempoB: START_TEMPO, doneA: false, doneB: false };
}

/** Nach bestandener Einheit: Tempo hoch oder Modus als geschafft markieren. */
export function passTempo(map: ProgressMap, keyId: string, mode: 'A' | 'B'): { map: ProgressMap; newTempo: number; justCompleted: boolean } {
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

export function isStageUnlocked(map: ProgressMap, stage: number): boolean {
  if (stage <= 1) return true;
  return isStageComplete(map, stage - 1);
}

// ── Statistik ────────────────────────────────────────────────────────────────

export function loadStats(): StatsData {
  return load<StatsData>(S_KEY, { errors: {}, timing: {}, attempts: 0, hits: 0 });
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
