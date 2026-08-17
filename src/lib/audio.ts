// ── Audio: Synthetisiertes Metronom (Web Audio API, keine Dateien) ──────────

export type ClickKind = 'beat' | 'sub';

export class Metronome {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  now(): number {
    return this.ensure().currentTime;
  }

  /** Tiefen Sinus für die „1", hohen für Subdivisions – exakt auf `time` (AudioContext-Zeit). */
  click(time: number, kind: ClickKind, strong = false): void {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = kind === 'beat' ? 180 : 880;
    const t = Math.max(time, ctx.currentTime);
    const peak = kind === 'beat' ? (strong ? 0.9 : 0.7) : 0.28;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'beat' ? 0.12 : 0.05));
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Kurzer Bestätigungston (grün) / Fehlerton (rot) – leise, funktional. */
  signal(ok: boolean): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = ok ? 660 : 220;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(ok ? 0.18 : 0.22, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (ok ? 0.15 : 0.3));
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }
}

// ── Lookahead-Scheduler ─────────────────────────────────────────────────────
// Liefert für jedes Zeit-Event (Klick, Beat) einen Callback, ~120 ms vorausgeplant.

export interface ScheduledEvent {
  time: number;      // AudioContext-Zeit
  index: number;     // laufende Nummer
}

export class Scheduler {
  private timer: number | null = null;
  private nextTime = 0;
  private index = 0;
  private ctx: () => AudioContext;
  private intervalSec: () => number;
  private onEvent: (ev: ScheduledEvent) => void;
  constructor(ctx: () => AudioContext, intervalSec: () => number, onEvent: (ev: ScheduledEvent) => void) {
    this.ctx = ctx;
    this.intervalSec = intervalSec;
    this.onEvent = onEvent;
  }

  start(atTime?: number): void {
    this.stop();
    const ctx = this.ctx();
    this.nextTime = atTime ?? ctx.currentTime + 0.1;
    this.index = 0;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  private tick(): void {
    const ctx = this.ctx();
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.onEvent({ time: this.nextTime, index: this.index });
      this.nextTime += this.intervalSec();
      this.index++;
    }
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// ── Wake Lock ───────────────────────────────────────────────────────────────

export async function requestWakeLock(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<unknown> } };
    if (nav.wakeLock) {
      await nav.wakeLock.request('screen');
      return true;
    }
  } catch {
    /* nicht verfügbar */
  }
  return false;
}
