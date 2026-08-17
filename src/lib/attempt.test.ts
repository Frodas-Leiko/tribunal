// Tests des Sammelfensters (B-04, R20/R21). Ohne DOM und ohne Tastendruck:
// AK 1, 4 und 5 sind damit auch ohne Demo-Modus abgesichert.

import { describe, expect, it } from 'vitest';
import {
  ATTEMPT_GAP_MS, ATTEMPT_MAX_MS, MIN_EVAL_WINDOW_MS,
  attemptCapMs, attemptForBeat, evalWindowMs, groupAttempts,
} from '@/lib/attempt';
import type { NoteEvent } from '@/lib/midi';

/** Anschläge als (Zeit, MIDI)-Paare. */
function notes(...pairs: Array<[number, number]>): NoteEvent[] {
  return pairs.map(([time, midi]) => ({ time, midi }));
}

const CAP_60_BPM = attemptCapMs(1000); // Übung 1 bei 60 bpm: Beat 1000 ms → 300 ms

describe('attemptCapMs (R20 AK 1)', () => {
  it('deckelt bei 300 ms', () => {
    expect(attemptCapMs(1000)).toBe(ATTEMPT_MAX_MS);
  });

  it('nie mehr als die halbe Beat-Dauer', () => {
    expect(attemptCapMs(400)).toBe(200);
    expect(attemptCapMs(600)).toBe(300);
  });
});

describe('evalWindowMs (R21)', () => {
  it('leitet sich aus der Toleranz ab', () => {
    expect(evalWindowMs(50, 1000)).toBe(150);
    expect(evalWindowMs(35, 1000)).toBe(105);
    expect(evalWindowMs(20, 1000)).toBe(60);
  });

  it('arbeitet bei ±20 ms nicht mit demselben Fenster wie bei ±50 ms', () => {
    expect(evalWindowMs(20, 1000)).not.toBe(evalWindowMs(50, 1000));
  });

  it('fällt nie unter die Untergrenze und nie über die halbe Beat-Dauer', () => {
    expect(evalWindowMs(5, 1000)).toBe(MIN_EVAL_WINDOW_MS);
    expect(evalWindowMs(50, 200)).toBe(100);
  });
});

describe('groupAttempts (R20)', () => {
  it('fasst einen gerollten Akkord zu einem Versuch zusammen (AK 4)', () => {
    // 120 ms Rollzeit, 60 ms zwischen den Tönen
    const a = groupAttempts(notes([0, 60], [60, 64], [120, 67]), CAP_60_BPM);
    expect(a).toHaveLength(1);
    expect(a[0].notes.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(a[0].start).toBe(0);
    expect(a[0].end).toBe(120);
  });

  it('trennt zwei Versuche im Abstand von 400 ms (AK 5)', () => {
    const a = groupAttempts(notes([0, 60], [20, 64], [420, 60], [440, 64], [460, 67]), CAP_60_BPM);
    expect(a).toHaveLength(2);
    expect(a[0].notes).toHaveLength(2);
    expect(a[1].notes).toHaveLength(3);
    expect(a[1].start).toBe(420);
  });

  it('schließt den Versuch genau nach der Stille-Grenze ab', () => {
    // exakt 80 ms Abstand gehören noch dazu, 81 ms nicht mehr
    expect(groupAttempts(notes([0, 60], [ATTEMPT_GAP_MS, 64]), CAP_60_BPM)).toHaveLength(1);
    expect(groupAttempts(notes([0, 60], [ATTEMPT_GAP_MS + 1, 64]), CAP_60_BPM)).toHaveLength(2);
  });

  it('deckelt einen langen Nachzügler-Akkord bei der Obergrenze', () => {
    // alle 70 ms ein Ton: die Kette reißt nicht an der Stille, sondern am Deckel
    const t: Array<[number, number]> = [];
    for (let i = 0; i <= 6; i++) t.push([i * 70, 60 + i]);
    const a = groupAttempts(t.map(([time, midi]) => ({ time, midi })), CAP_60_BPM);
    expect(a).toHaveLength(2);
    expect(a[0].end - a[0].start).toBeLessThanOrEqual(CAP_60_BPM);
  });

  it('beendet den Versuch nicht wegen eines falschen Tons (AK 2)', () => {
    // Fis (66) gehört nicht zu C-Dur, hält den Versuch aber zusammen
    const a = groupAttempts(notes([0, 60], [30, 66], [60, 67]), CAP_60_BPM);
    expect(a).toHaveLength(1);
    expect(a[0].notes).toHaveLength(3);
  });

  it('sortiert Anschläge, die verdreht ankommen', () => {
    const a = groupAttempts(notes([60, 67], [0, 60], [30, 64]), CAP_60_BPM);
    expect(a).toHaveLength(1);
    expect(a[0].notes.map((n) => n.time)).toEqual([0, 30, 60]);
  });

  it('liefert für keine Anschläge keinen Versuch', () => {
    expect(groupAttempts([], CAP_60_BPM)).toEqual([]);
  });
});

describe('attemptForBeat (R21)', () => {
  const attempts = groupAttempts(notes([900, 60], [1040, 60], [1600, 60]), CAP_60_BPM);

  it('nimmt den Versuch, der dem Beat am nächsten liegt', () => {
    const a = attemptForBeat(attempts, 1000, 150);
    expect(a?.start).toBe(1040); // 40 ms statt 100 ms Abstand
  });

  it('lässt Versuche außerhalb des Fensters liegen', () => {
    expect(attemptForBeat(attempts, 1000, 30)).toBeNull();
    expect(attemptForBeat(attempts, 1600, 150)?.start).toBe(1600);
  });

  it('rechnet den Rand noch zum Beat', () => {
    expect(attemptForBeat(attempts, 1000, 100)?.start).toBe(1040);
    expect(attemptForBeat(attempts, 1140, 100)?.start).toBe(1040);
  });
});
