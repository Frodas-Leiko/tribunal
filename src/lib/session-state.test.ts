// Tests des Zustandsautomaten (B-03, R17). Ohne DOM: der Automat kennt nur die
// Ressourcen-Handles, die ihm übergeben werden.

import { describe, expect, it } from 'vitest';
import { createSessionMachine, type SessionState } from '@/lib/session-state';

/** Zählt „laufende" Ressourcen, wie sie ein Übergang zurücksetzen muss. */
function makeResources() {
  const live = { scheduler: false, evalTimers: 0, resumeTimer: false, notes: 0, clock: false, banner: false };
  let feedbackDropped = 0;
  const res = {
    stopScheduler: () => { live.scheduler = false; },
    clearEvalTimers: () => { live.evalTimers = 0; },
    clearResumeTimer: () => { live.resumeTimer = false; },
    clearNotes: () => { live.notes = 0; },
    stopClock: () => { live.clock = false; },
    clearBanner: () => { live.banner = false; },
    dropFeedback: () => { feedbackDropped += 1; },
  };
  const runAll = () => {
    live.scheduler = true;
    live.evalTimers = 3;
    live.resumeTimer = true;
    live.notes = 5;
    live.clock = true;
    live.banner = true;
  };
  return { live, res, runAll, drops: () => feedbackDropped };
}

const ALL_STATES: SessionState[] = ['IDLE', 'ARMED', 'RUNNING', 'PAUSED', 'ENDED'];
const NOTHING_LIVE = {
  scheduler: false, evalTimers: 0, resumeTimer: false, notes: 0, clock: false, banner: false,
};

describe('createSessionMachine', () => {
  it('startet in IDLE', () => {
    const { res } = makeResources();
    expect(createSessionMachine(res).state).toBe('IDLE');
  });

  it('geht den Weg aus R17: IDLE → ARMED → RUNNING ⇄ PAUSED → ENDED', () => {
    const { res } = makeResources();
    const m = createSessionMachine(res);
    expect(m.to('ARMED')).toBe(true);
    expect(m.to('RUNNING')).toBe(true);
    expect(m.to('PAUSED')).toBe(true);
    expect(m.to('RUNNING')).toBe(true);
    expect(m.to('ENDED')).toBe(true);
    expect(m.state).toBe('ENDED');
  });

  it('nimmt nach ENDED eine neue Einheit auf', () => {
    const { res } = makeResources();
    const m = createSessionMachine(res);
    m.to('ARMED');
    m.to('ENDED');
    expect(m.to('IDLE')).toBe(true);
    expect(m.to('ARMED')).toBe(true);
  });

  it('weist einen unerlaubten Übergang ab, ohne etwas anzufassen', () => {
    const { live, res, runAll, drops } = makeResources();
    const m = createSessionMachine(res);
    runAll();
    expect(m.to('RUNNING')).toBe(false); // IDLE → RUNNING gibt es nicht
    expect(m.state).toBe('IDLE');
    expect(live).toEqual({
      scheduler: true, evalTimers: 3, resumeTimer: true, notes: 5, clock: true, banner: true,
    });
    expect(drops()).toBe(0);
  });

  it('verwirft veraltetes Feedback nur beim Eintritt in RUNNING (B-06 AK 3)', () => {
    const { res, drops } = makeResources();
    const m = createSessionMachine(res);
    m.to('ARMED');
    expect(drops()).toBe(0);   // der Hinweis muss ARMED und PAUSED überleben
    m.to('RUNNING');
    expect(drops()).toBe(1);
    m.to('PAUSED');
    expect(drops()).toBe(1);
    m.to('RUNNING');
    expect(drops()).toBe(2);
  });

  it('räumt bei jedem ausgeführten Übergang alle Ressourcen auf', () => {
    const { live, res, runAll } = makeResources();
    const m = createSessionMachine(res);
    runAll();
    m.to('ARMED');
    expect(live).toEqual(NOTHING_LIVE);
  });

  it('lässt bei 200 zufälligen Übergängen keinen Timer überleben', () => {
    const { live, res, runAll } = makeResources();
    const m = createSessionMachine(res);
    // Deterministischer Zufall (LCG), damit ein Fehlschlag reproduzierbar ist.
    let seed = 20260817;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      runAll(); // alles läuft: Scheduler, drei Auswerte-Timer, Wiedereinstiegs-Timer, Puffer, Uhr
      const from = m.state;
      const next = ALL_STATES[Math.floor(rand() * ALL_STATES.length)];
      const changed = m.to(next);
      seen.add(`${from}→${next}:${changed}`);

      if (changed) {
        expect(live, `Übergang ${from} → ${next}`).toEqual(NOTHING_LIVE);
        expect(m.state).toBe(next);
      } else {
        expect(m.state).toBe(from);
      }
      expect(ALL_STATES).toContain(m.state);
    }
    // Der Lauf muss die echten Kanten wirklich getroffen haben, nicht nur Absagen.
    expect([...seen].filter((s) => s.endsWith(':true')).length).toBeGreaterThan(5);
  });
});
