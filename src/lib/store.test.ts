// Tests der Stufenplan-Empfehlung (B-14, R11). Ohne DOM: die Empfehlung ist eine
// reine Funktion des Fortschritts – sie markiert, sie sperrt nicht.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KEYS } from '@/lib/music';
import {
  getKeyProgress, loadProgress, migrateProgress, migrateStats, passTempo, recommendedNext,
  SCHEMA_VERSION, START_TEMPO, TARGET_TEMPO, TEMPO_STEP,
  type ProgressMap,
} from '@/lib/store';

const stage1 = KEYS.filter((k) => k.stage === 1);
const stage2 = KEYS.filter((k) => k.stage === 2);

/** Setzt eine Tonart auf einen abgeschlossenen Stand. */
function done(map: ProgressMap, keyId: string, doneA: boolean, doneB: boolean): ProgressMap {
  return { ...map, [keyId]: { tempoA: 100, tempoB: 100, doneA, doneB } };
}

describe('recommendedNext (R11)', () => {
  it('empfiehlt bei leerem Fortschritt Stufe 1, erste Tonart, Modus A', () => {
    expect(recommendedNext({})).toEqual({ stage: 1, keyId: stage1[0].id, mode: 'A' });
  });

  it('rückt innerhalb der Tonart von Modus A auf Modus B', () => {
    const map = done({}, stage1[0].id, true, false);
    expect(recommendedNext(map)).toEqual({ stage: 1, keyId: stage1[0].id, mode: 'B' });
  });

  it('rückt nach kompletter Tonart auf die nächste Tonart derselben Stufe', () => {
    const map = done({}, stage1[0].id, true, true);
    expect(recommendedNext(map)).toEqual({ stage: 1, keyId: stage1[1].id, mode: 'A' });
  });

  it('wandert erst nach kompletter Stufe auf die nächste Stufe', () => {
    let map: ProgressMap = {};
    for (const k of stage1) map = done(map, k.id, true, true);
    expect(recommendedNext(map)).toEqual({ stage: 2, keyId: stage2[0].id, mode: 'A' });
  });

  it('überspringt keine offene frühere Stufe, auch wenn eine spätere steht', () => {
    let map: ProgressMap = {};
    for (const k of stage2) map = done(map, k.id, true, true);
    expect(recommendedNext(map)).toEqual({ stage: 1, keyId: stage1[0].id, mode: 'A' });
  });

  it('empfiehlt nichts mehr, wenn jede Tonart in A und B steht', () => {
    let map: ProgressMap = {};
    for (const k of KEYS) map = done(map, k.id, true, true);
    expect(recommendedNext(map)).toBeNull();
  });
});

// ── Migration und Schema-Version (B-17, R25) ─────────────────────────────────

const gueltigerStand = { tempoA: 72, tempoB: 60, doneA: false, doneB: false };
const leereStatistik = { errors: {}, timing: {}, attempts: 0, hits: 0 };

describe('migrateProgress (R25)', () => {
  it('kein Eintrag ist kein Bruch: Standardwerte, Status ok', () => {
    expect(migrateProgress(null)).toEqual({ data: {}, status: 'ok' });
  });

  it('liest die Hülle der aktuellen Version', () => {
    const raw = JSON.stringify({ version: SCHEMA_VERSION, data: { 'C-dur': gueltigerStand } });
    expect(migrateProgress(raw)).toEqual({ data: { 'C-dur': gueltigerStand }, status: 'ok' });
  });

  it('übernimmt den nackten Datensatz der Fassung 1', () => {
    const raw = JSON.stringify({ 'C-dur': gueltigerStand });
    expect(migrateProgress(raw)).toEqual({ data: { 'C-dur': gueltigerStand }, status: 'migriert' });
  });

  it('fällt bei kaputtem JSON auf Standardwerte zurück', () => {
    expect(migrateProgress('{kein json')).toEqual({ data: {}, status: 'zurückgefallen' });
  });

  it('fällt bei fremder Version zurück, statt sie zu raten', () => {
    const raw = JSON.stringify({ version: SCHEMA_VERSION + 1, data: { 'C-dur': gueltigerStand } });
    expect(migrateProgress(raw)).toEqual({ data: {}, status: 'zurückgefallen' });
  });

  it('fällt bei fehlenden Feldern zurück', () => {
    const raw = JSON.stringify({ 'C-dur': { tempoA: 72, doneA: false } });
    expect(migrateProgress(raw)).toEqual({ data: {}, status: 'zurückgefallen' });
  });

  it('fällt bei falschem Feldtyp zurück', () => {
    const raw = JSON.stringify({ version: SCHEMA_VERSION, data: { 'C-dur': { ...gueltigerStand, doneA: 'ja' } } });
    expect(migrateProgress(raw)).toEqual({ data: {}, status: 'zurückgefallen' });
  });
});

describe('migrateStats (R25)', () => {
  it('kein Eintrag ist kein Bruch', () => {
    expect(migrateStats(null)).toEqual({ data: leereStatistik, status: 'ok' });
  });

  it('übernimmt die Statistik der Fassung 1', () => {
    const alt = { errors: { 'C-dur|C': { high: 2, low: 1, total: 3 } }, timing: { 'C-dur': [-12, 4] }, attempts: 9, hits: 6 };
    expect(migrateStats(JSON.stringify(alt))).toEqual({ data: alt, status: 'migriert' });
  });

  it('fällt bei kaputten Timing-Werten zurück', () => {
    const kaputt = { errors: {}, timing: { 'C-dur': ['spät'] }, attempts: 1, hits: 0 };
    expect(migrateStats(JSON.stringify(kaputt))).toEqual({ data: leereStatistik, status: 'zurückgefallen' });
  });

  it('liefert bei jedem Rückfall eine eigene Instanz der Standardwerte', () => {
    const a = migrateStats('{kein json').data;
    a.attempts = 5;
    expect(migrateStats('{kein json').data.attempts).toBe(0);
  });
});

// ── Tempo-Leiter in Folge (B-15, R10) ────────────────────────────────────────

/** Speicher im Arbeitsspeicher: die Testumgebung ist `node`, kein Browser. */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k); },
    setItem: (k: string, v: string) => { m.set(k, v); },
  };
}

describe('passTempo in Folge', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('hebt das Level Schritt für Schritt bis TARGET_TEMPO und meldet dann done', () => {
    const gesehen: number[] = [];
    let fertig = false;
    // Ein Lauf ohne Verlassen der Einheit: jede Serie ruft passTempo erneut.
    for (let i = 0; i < 15 && !fertig; i++) {
      const res = passTempo('C-dur', 'A');
      gesehen.push(res.newTempo);
      fertig = res.justCompleted;
    }
    const stufen = (TARGET_TEMPO - START_TEMPO) / TEMPO_STEP;
    expect(gesehen.slice(0, stufen)).toEqual(
      Array.from({ length: stufen }, (_, i) => START_TEMPO + TEMPO_STEP * (i + 1)),
    );
    expect(gesehen[stufen]).toBe(TARGET_TEMPO);
    expect(fertig).toBe(true);
    expect(getKeyProgress(loadProgress().data, 'C-dur').doneA).toBe(true);
  });
});
