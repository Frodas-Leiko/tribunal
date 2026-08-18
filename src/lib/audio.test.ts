// Tests des Schedulers (B-02, R19). Der Scheduler braucht nur `currentTime`
// (AudioClock) – deshalb genügt hier eine Stub-Uhr, kein DOM und keine Hardware
// (Regelwerk §5.3).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLICK_LATE_TOLERANCE, Scheduler, ScreenWakeLock, clickIsStale, stepsToCatchUp,
  type AudioClock, type ScheduledEvent, type WakeLockSentinelLike,
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

// ── Wake Lock (B-27, R6/R7, Konzept §10.5) ──────────────────────────────────
// Geprüft wird mit einem eingesetzten Doppel statt mit `navigator.wakeLock`: die
// echte API gibt es weder in der Testumgebung noch verlässlich im Browser, und der
// Nachweis von AK 1 hängt nur daran, wie viele Sentinel diese Schicht hält
// (Regelwerk §5.3).

/** Zählt Anforderungen und Freigaben und ahmt das Verhalten des Browsers nach. */
function wakeLockDouble() {
  const sentinels: Array<WakeLockSentinelLike & { released: boolean }> = [];
  const doppel = {
    sentinels,
    /** Sentinel, die der Browser noch hält. */
    offen: () => sentinels.filter((s) => !s.released).length,
    /** Angefordert insgesamt – auch das, was danach wieder freigegeben wurde. */
    angefordert: () => sentinels.length,
    /** Was der Browser beim Verlassen des Tabs tut: er zieht die Sperre ein. */
    browserGibtFrei: () => sentinels.forEach((s) => { s.released = true; }),
    request: async (type: 'screen'): Promise<WakeLockSentinelLike> => {
      expect(type).toBe('screen');
      const sentinel = {
        released: false,
        release: async () => { sentinel.released = true; },
      };
      sentinels.push(sentinel);
      return sentinel;
    },
  };
  return doppel;
}

describe('ScreenWakeLock (B-27, AK 1)', () => {
  it('hält nach dem Anfordern genau einen Sentinel', async () => {
    const doppel = wakeLockDouble();
    const lock = new ScreenWakeLock(doppel.request);

    expect(lock.held()).toBe(false);
    expect(await lock.acquire()).toBe(true);
    expect(lock.held()).toBe(true);
    expect(doppel.offen()).toBe(1);
  });

  it('öffnet bei einem zweiten Anfordern keinen zweiten', async () => {
    const doppel = wakeLockDouble();
    const lock = new ScreenWakeLock(doppel.request);

    await lock.acquire();
    await lock.acquire();
    expect(doppel.angefordert()).toBe(1);
    expect(doppel.offen()).toBe(1);
  });

  it('verdoppelt auch bei zwei gleichzeitigen Anforderungen nicht', async () => {
    const doppel = wakeLockDouble();
    const lock = new ScreenWakeLock(doppel.request);

    // Beide Aufrufe laufen los, bevor der erste seinen Sentinel hat.
    await Promise.all([lock.acquire(), lock.acquire()]);
    expect(doppel.angefordert()).toBe(1);
    expect(doppel.offen()).toBe(1);
  });

  it('steht nach `visibilitychange` auf sichtbar wieder bei genau einem', async () => {
    const doppel = wakeLockDouble();
    const lock = new ScreenWakeLock(doppel.request);

    await lock.acquire();
    doppel.browserGibtFrei();          // Tab-Wechsel: der Browser zieht die Sperre ein
    expect(lock.held()).toBe(false);

    expect(await lock.refresh()).toBe(true);
    expect(lock.held()).toBe(true);
    expect(doppel.offen()).toBe(1);
    expect(doppel.angefordert()).toBe(2);
  });

  it('erneuert nach `refresh()` nichts, wenn die Sperre noch steht', async () => {
    const doppel = wakeLockDouble();
    const lock = new ScreenWakeLock(doppel.request);

    await lock.acquire();
    await lock.refresh();
    expect(doppel.angefordert()).toBe(1);
  });

  it('gibt die Sperre beim Verlassen der Einheit frei', async () => {
    const doppel = wakeLockDouble();
    const lock = new ScreenWakeLock(doppel.request);

    await lock.acquire();
    await lock.release();
    expect(lock.held()).toBe(false);
    expect(doppel.offen()).toBe(0);
  });

  it('fordert nach dem Verlassen der Einheit nichts mehr an (R7)', async () => {
    const doppel = wakeLockDouble();
    const lock = new ScreenWakeLock(doppel.request);

    await lock.acquire();
    await lock.release();
    expect(await lock.refresh()).toBe(false);
    expect(doppel.offen()).toBe(0);
    expect(doppel.angefordert()).toBe(1);
  });

  it('hält keinen Sentinel, der während des Anforderns ungewollt wurde', async () => {
    const doppel = wakeLockDouble();
    const lock = new ScreenWakeLock(doppel.request);

    const kommt = lock.acquire();
    await lock.release();              // Einheit endet, bevor die Sperre da ist
    await kommt;
    expect(lock.held()).toBe(false);
    expect(doppel.offen()).toBe(0);
  });

  it('läuft ohne Wake-Lock-API weiter, statt zu scheitern (R7)', async () => {
    const lock = new ScreenWakeLock(null);

    expect(await lock.acquire()).toBe(false);
    expect(lock.held()).toBe(false);
    expect(await lock.refresh()).toBe(false);
    await expect(lock.release()).resolves.toBeUndefined();
  });

  it('läuft weiter, wenn der Browser die Sperre verweigert (R7)', async () => {
    const lock = new ScreenWakeLock(() => Promise.reject(new Error('NotAllowedError')));

    expect(await lock.acquire()).toBe(false);
    expect(lock.held()).toBe(false);
    // Ein zweiter Versuch bleibt erlaubt – die Verweigerung kann am Akkustand liegen.
    expect(await lock.refresh()).toBe(false);
  });
});
