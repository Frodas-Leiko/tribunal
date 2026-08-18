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
// Konzept §10.5: „Das Tablet geht während einer Übung nicht in den Standby."
// Der Browser gibt eine Bildschirmsperre frei, sobald der Tab in den Hintergrund
// geht. Ohne gehaltenen Sentinel gibt es danach niemanden mehr, der sie zurückholt –
// und niemanden, der sie beim Verlassen der Einheit wieder abgibt (R7: das Gerät
// gehört dem Nutzer).

/** Der Teil eines `WakeLockSentinel`, den diese Schicht braucht – so ist sie ohne DOM prüfbar. */
export interface WakeLockSentinelLike {
  readonly released: boolean;
  release(): Promise<void>;
}

/** `navigator.wakeLock.request` in der Form, die diese Schicht erwartet. */
export type WakeLockRequest = (type: 'screen') => Promise<WakeLockSentinelLike>;

/**
 * Die Wake-Lock-API dieses Browsers – oder `null`, wenn es keine gibt. Der Grund
 * für `null` ist kein Fehler: Firefox und ältere iPads kennen die API schlicht
 * nicht, die Einheit läuft dort ohne Sperre weiter.
 */
export function browserWakeLock(): WakeLockRequest | null {
  const nav = navigator as Navigator & { wakeLock?: { request: WakeLockRequest } };
  const api = nav.wakeLock;
  return api ? (type) => api.request(type) : null;
}

/**
 * Hält **genau einen** Bildschirm-Sentinel, solange die Einheit läuft.
 *
 * - `acquire()` ist idempotent: ein zweites Anfordern öffnet keinen zweiten Sentinel.
 * - `refresh()` holt die Sperre zurück, die der Browser beim Tab-Wechsel freigegeben
 *   hat – aber nur, wenn sie überhaupt noch gewollt ist.
 * - `release()` gibt sie ausdrücklich ab; danach fordert `refresh()` nichts mehr an.
 */
export class ScreenWakeLock {
  private request: WakeLockRequest | null;
  private sentinel: WakeLockSentinelLike | null = null;
  /** Gewollt = zwischen `acquire()` und `release()`. Nur dann erneuert `refresh()`. */
  private wanted = false;
  /** Ein laufendes Anfordern; ein zweiter Aufruf hängt sich an, statt zu verdoppeln. */
  private pending: Promise<void> | null = null;

  constructor(request: WakeLockRequest | null = browserWakeLock()) {
    this.request = request;
  }

  /** Steht die Sperre? Ein vom Browser freigegebener Sentinel zählt nicht. */
  held(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }

  /** Fordert die Sperre an und merkt sich, dass sie gewollt ist. */
  async acquire(): Promise<boolean> {
    this.wanted = true;
    return this.open();
  }

  /**
   * Rückkehr auf sichtbar: der Browser hat die Sperre beim Verlassen des Tabs
   * freigegeben. Ohne laufende Einheit passiert hier nichts.
   */
  async refresh(): Promise<boolean> {
    if (!this.wanted) return false;
    return this.open();
  }

  /** Gibt die Sperre ab. Der Bildschirm gehört danach wieder dem Gerät (R7). */
  async release(): Promise<void> {
    this.wanted = false;
    const sentinel = this.sentinel;
    this.sentinel = null;
    if (!sentinel || sentinel.released) return;
    try {
      await sentinel.release();
    } catch {
      // Freigeben kann scheitern, wenn der Browser den Sentinel längst selbst
      // eingezogen hat. Die Referenz ist oben bereits weg – mehr ist nicht zu tun.
    }
  }

  private async open(): Promise<boolean> {
    const request = this.request;
    if (request === null) return false;   // Browser ohne Wake-Lock-API
    if (this.held()) return true;
    if (this.pending === null) {
      this.pending = this.openOnce(request).finally(() => { this.pending = null; });
    }
    await this.pending;
    return this.held();
  }

  private async openOnce(request: WakeLockRequest): Promise<void> {
    try {
      const sentinel = await request('screen');
      // Zwischen Anfordern und Antwort kann die Einheit beendet worden sein –
      // dann wird der frische Sentinel sofort wieder abgegeben, nicht gehalten.
      if (!this.wanted) {
        void sentinel.release();
        return;
      }
      this.sentinel = sentinel;
    } catch {
      // Der Browser darf die Sperre verweigern: kein sicherer Kontext, Akkusparmodus,
      // Berechtigungsregel. Konzept §10.5 ist dann nicht erfüllbar – die Einheit
      // läuft trotzdem weiter (R7), ohne Meldung, weil der Nutzer nichts tun kann.
      this.sentinel = null;
    }
  }
}
