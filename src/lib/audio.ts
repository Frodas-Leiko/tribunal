// ── Audio: Synthetisiertes Metronom (Web Audio API, keine Dateien) ──────────

export type ClickKind = 'beat' | 'sub';

/** Toleranz, innerhalb der ein knapp verpasster Klick noch gespielt wird (R19). */
export const CLICK_LATE_TOLERANCE = 0.02; // s

/**
 * R19: Klicks für vergangene Zeitpunkte werden verworfen, nicht nachgeholt. Ohne
 * das staucht `Math.max(time, currentTime)` einen ganzen Nachhol-Burst auf „jetzt"
 * – hörbar als Doppelklick.
 */
export function clickIsStale(time: number, now: number): boolean {
  return time < now - CLICK_LATE_TOLERANCE;
}

/**
 * Öffnet oder entsperrt den `AudioContext`. R18: ausschließlich im Callstack einer
 * echten Nutzergeste aufrufen – nie aus einem `useEffect`, `setTimeout` oder
 * MIDI-Callback. `existing` wird wiederverwendet, damit über mehrere Einheiten
 * hinweg genau ein Kontext entsteht.
 */
export function openAudioContext(existing?: AudioContext | null): AudioContext {
  const ctx = existing ?? new AudioContext();
  if (ctx.state !== 'running') void ctx.resume();
  return ctx;
}

export class Metronome {
  private ctx: AudioContext;

  /** Der Kontext kommt von außen (R18); das Metronom öffnet keinen eigenen. */
  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  context(): AudioContext {
    return this.ctx;
  }

  /** Tiefen Sinus für die „1", hohen für Subdivisions – exakt auf `time` (AudioContext-Zeit). */
  click(time: number, kind: ClickKind, strong = false): void {
    const ctx = this.ctx;
    if (clickIsStale(time, ctx.currentTime)) return; // R19
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
    const ctx = this.ctx;
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

/** Nur der Teil des AudioContext, den der Scheduler braucht – so ist er ohne DOM prüfbar. */
export interface AudioClock {
  readonly currentTime: number;
}

/**
 * R19: Anzahl **ganzer** Intervallschritte, um `atTime` bis `now` vorzuschieben.
 * 0, wenn `atTime` schon nicht mehr in der Vergangenheit liegt.
 */
export function stepsToCatchUp(atTime: number, now: number, stepSec: number): number {
  if (stepSec <= 0 || atTime >= now) return 0;
  return Math.ceil((now - atTime) / stepSec);
}

export class Scheduler {
  private timer: number | null = null;
  private nextTime = 0;
  private index = 0;
  private ctx: () => AudioClock;
  private intervalSec: () => number;
  private onEvent: (ev: ScheduledEvent) => void;
  constructor(ctx: () => AudioClock, intervalSec: () => number, onEvent: (ev: ScheduledEvent) => void) {
    this.ctx = ctx;
    this.intervalSec = intervalSec;
    this.onEvent = onEvent;
  }

  /**
   * Startet den Lookahead. `atTime` liegt regelmäßig in der Vergangenheit, weil der
   * Aufrufer die Uhr auf einen bereits zurückliegenden Anschlag kalibriert. R19: der
   * Startzeitpunkt wird dann in ganzen Intervallschritten vorgeschoben, bis er nicht
   * mehr in der Vergangenheit liegt – ein Nachhol-Burst wird nie gefeuert.
   *
   * @returns übersprungene Intervallschritte; damit korrigiert der Aufrufer seine
   *          Beat-Nummerierung.
   */
  start(atTime?: number): number {
    this.stop();
    const ctx = this.ctx();
    this.index = 0;
    this.nextTime = atTime ?? ctx.currentTime + 0.1;
    const skipped = stepsToCatchUp(this.nextTime, ctx.currentTime, this.intervalSec());
    this.nextTime += skipped * this.intervalSec();
    this.timer = setInterval(() => this.tick(), 25);
    return skipped;
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
      clearInterval(this.timer);
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
