// Tests der Stufenplan-Empfehlung (B-14, R11). Ohne DOM: die Empfehlung ist eine
// reine Funktion des Fortschritts – sie markiert, sie sperrt nicht.

import { describe, expect, it } from 'vitest';
import { KEYS } from '@/lib/music';
import { recommendedNext, type ProgressMap } from '@/lib/store';

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
