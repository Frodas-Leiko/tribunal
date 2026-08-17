// Tests des Schedulers (B-02, R19). Der Scheduler braucht nur `currentTime`
// (AudioClock) – deshalb genügt hier eine Stub-Uhr, kein DOM und keine Hardware
// (Regelwerk §5.3).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLICK_LATE_TOLERANCE, Scheduler, clickIsStale, stepsToCatchUp,
  type AudioClock, type ScheduledEvent,
} from '@/lib/audio';

describe('stepsToCatchUp (R19)', () => {
  it('schiebt einen vergangenen Startzeitpunkt in ganzen Schritten vor', () => {
    // 500 ms in der Vergangenheit bei 250 ms Intervall → 2 Schritte
    expect(stepsToCatchUp(9.5, 10, 0.25)).toBe(2);
  });

  it('rundet auf den nächsten ganzen Schritt auf', () => {
    expect(stepsToCatchUp(9.6, 10, 0.25)).toBe(2);   // 0.4 / 0.25 = 1.6
    expect(stepsToCatchUp(9.9, 10, 0.25)).toBe(1);
  });

  it('lässt einen Startzeitpunkt in der Zukunft unangetastet', () => {
    expect(stepsToCatchUp(10.5, 10, 0.25)).toBe(0);
    expect(stepsToCatchUp(10, 10, 0.25)).toBe(0);
  });

  it('läuft bei einem unbrauchbaren Intervall nicht endlos', () => {
    expect(stepsToCatchUp(9.5, 10, 0)).toBe(0);
    expect(stepsToCatchUp(9.5, 10, -1)).toBe(0);
  });
});

describe('Scheduler.start (R19)', () => {
  let clock: AudioClock & { currentTime: number };
  let events: ScheduledEvent[];
  let sched: Scheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    clock = { currentTime: 10 };
    events = [];
    sched = new Scheduler(() => clock, () => 0.25, (ev) => events.push(ev));
  });

  afterEach(() => {
    sched.stop();
    vi.useRealTimers();
  });

  it('meldet die übersprungenen Schritte und startet nicht in der Vergangenheit', () => {
    const skipped = sched.start(clock.currentTime - 0.5);
    expect(skipped).toBe(2);

    vi.advanceTimersByTime(25); // erster tick
    expect(events).toHaveLength(1);
    expect(events[0].index).toBe(0);
    expect(events[0].time).toBeGreaterThanOrEqual(clock.currentTime);
  });

  it('feuert keinen Nachhol-Burst – auch nicht nach einer langen Pause', () => {
    // 3 s Rückstand bei 250 ms Intervall: ungebremst wären das 12 Nachhol-Events
    const skipped = sched.start(clock.currentTime - 3);
    expect(skipped).toBe(12);

    vi.advanceTimersByTime(25);
    expect(events).toHaveLength(1);
  });

  it('zählt die Events danach im Intervall weiter', () => {
    sched.start(clock.currentTime - 0.5);
    vi.advanceTimersByTime(25);
    clock.currentTime += 0.25;  // eine Intervalllänge Audio-Zeit später
    vi.advanceTimersByTime(25);
    expect(events.map((e) => e.index)).toEqual([0, 1]);
    expect(events[1].time - events[0].time).toBeCloseTo(0.25, 10);
  });

  it('startet ohne Zeitangabe im Lookahead-Fenster hinter der Uhr', () => {
    const skipped = sched.start();
    expect(skipped).toBe(0);
    vi.advanceTimersByTime(25);
    expect(events).toHaveLength(1);
    expect(events[0].time).toBeCloseTo(clock.currentTime + 0.1, 10);
  });
});

describe('clickIsStale (R19)', () => {
  it('verwirft Zeitpunkte, die weiter als die Toleranz zurückliegen', () => {
    expect(clickIsStale(10 - 0.021, 10)).toBe(true);
    expect(clickIsStale(9.5, 10)).toBe(true);
  });

  it('spielt knapp verpasste und künftige Zeitpunkte', () => {
    expect(clickIsStale(10 - CLICK_LATE_TOLERANCE, 10)).toBe(false);
    expect(clickIsStale(10, 10)).toBe(false);
    expect(clickIsStale(10.5, 10)).toBe(false);
  });
});
