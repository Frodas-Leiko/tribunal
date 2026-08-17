// ── Sammelfenster: Anschläge werden zu Versuchen gruppiert (R20, R21) ───────
// Reine Funktionen über einer Liste von NoteEvents – dieselbe Gruppierung gilt
// für den laufenden Takt und für den Wiedereinstieg. Zwei parallele
// Fenster-Logiken erzeugen genau die Fehlerklasse, die P0 beseitigen soll.

import type { NoteEvent } from './midi';

/** R20: So lange darf Stille innerhalb eines Akkords liegen. */
export const ATTEMPT_GAP_MS = 80;
/** R20: harte Obergrenze eines Versuchs. */
export const ATTEMPT_MAX_MS = 300;
/** Untergrenze des Auswertefensters, damit es bei scharfer Toleranz nicht verschwindet. */
export const MIN_EVAL_WINDOW_MS = 60;

export interface Attempt {
  notes: NoteEvent[];
  start: number;   // performance.now() des ersten Tons
  end: number;     // performance.now() des letzten Tons
}

/** R20: Obergrenze eines Versuchs – 300 ms, aber nie mehr als die halbe Beat-Dauer. */
export function attemptCapMs(beatDurMs: number): number {
  return Math.min(ATTEMPT_MAX_MS, beatDurMs / 2);
}

/**
 * R21: Vor- und Nachlauffenster der Beat-Bewertung – dreifache Toleranz, mindestens
 * 60 ms, höchstens halbe Beat-Dauer. Bei ±20 ms arbeitet die Bewertung damit nicht
 * mit demselben Fenster wie bei ±50 ms.
 */
export function evalWindowMs(toleranceMs: number, beatDurMs: number): number {
  return Math.min(Math.max(3 * toleranceMs, MIN_EVAL_WINDOW_MS), beatDurMs / 2);
}

/**
 * R20: Gruppiert Anschläge zu Versuchen. Ein Versuch ist abgeschlossen, wenn
 * `gapMs` lang kein weiterer Ton folgt oder `capMs` seit dem ersten Ton
 * verstrichen sind. Ein falscher Ton beendet ihn **nicht** – das entscheidet
 * allein die Zeit (B-04 AK 2).
 */
export function groupAttempts(notes: NoteEvent[], capMs: number, gapMs = ATTEMPT_GAP_MS): Attempt[] {
  const out: Attempt[] = [];
  for (const n of [...notes].sort((a, b) => a.time - b.time)) {
    const open = out[out.length - 1];
    if (open && n.time - open.end <= gapMs && n.time - open.start <= capMs) {
      open.notes.push(n);
      open.end = n.time;
    } else {
      out.push({ notes: [n], start: n.time, end: n.time });
    }
  }
  return out;
}

/**
 * Der Versuch, der einem Beat zugerechnet wird: der nächstgelegene, dessen erster
 * Ton im Fenster liegt. Alles außerhalb gehört zu keinem Beat – der Beat gilt dann
 * als ausgelassen.
 */
export function attemptForBeat(attempts: Attempt[], beatTime: number, windowMs: number): Attempt | null {
  let best: Attempt | null = null;
  for (const a of attempts) {
    const d = Math.abs(a.start - beatTime);
    if (d > windowMs) continue;
    if (!best || d < Math.abs(best.start - beatTime)) best = a;
  }
  return best;
}
