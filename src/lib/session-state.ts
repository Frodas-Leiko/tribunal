// ── Zustandsautomat der Session (R17) ───────────────────────────────────────
// Genau eine Stelle, an der ein Zustandswechsel stattfindet – und jeder Wechsel
// räumt alle zugehörigen Ressourcen auf. Kein Übergang darf einen Timer
// überleben lassen.
//
// Bewusst ohne React: so ist der Automat ohne DOM prüfbar (B-03 AK 5).

export type SessionState = 'IDLE' | 'ARMED' | 'RUNNING' | 'PAUSED' | 'ENDED';

/**
 * Die Ressourcen, die ein Übergang zurücksetzt (R17). Der Aufrufer reicht die
 * Handles herein; der Automat kennt weder Refs noch Timer-IDs.
 */
export interface SessionResources {
  stopScheduler(): void;
  clearEvalTimers(): void;
  clearResumeTimer(): void;
  clearNotes(): void;
  stopClock(): void;
  /** R22: Banner samt Lebensdauer-Timer – kein Bildschirmzustand überlebt einen Wechsel. */
  clearBanner(): void;
  /** R22: nur beim Eintritt in RUNNING – veraltetes Feedback wird verworfen (B-06 AK 3). */
  dropFeedback(): void;
}

/**
 * Erlaubte Übergänge nach R17 (`IDLE → ARMED → RUNNING ⇄ PAUSED → ENDED`).
 * Ergänzt um zwei Kanten, die der Ablauf braucht:
 * - `ENDED → IDLE` und `IDLE → IDLE`: dieselbe Session-Instanz nimmt eine neue
 *   Einheit auf (auch der Doppelstart unter StrictMode).
 * - `ENDED → ENDED`: „Ende"-Taste und Unmount rufen beide stop(); der zweite
 *   Aufruf räumt idempotent noch einmal auf.
 */
const ALLOWED: Record<SessionState, readonly SessionState[]> = {
  IDLE: ['IDLE', 'ARMED', 'ENDED'],
  ARMED: ['RUNNING', 'ENDED'],
  RUNNING: ['PAUSED', 'ENDED'],
  PAUSED: ['RUNNING', 'ENDED'],
  ENDED: ['IDLE', 'ENDED'],
};

export interface SessionMachine {
  readonly state: SessionState;
  /**
   * Führt den Übergang aus, wenn er nach R17 erlaubt ist: erst alle Ressourcen
   * zurücksetzen, dann den Zustand setzen.
   * @returns `false`, wenn der Übergang nicht erlaubt ist – dann bleibt alles
   *          unangetastet, auch die Ressourcen.
   */
  to(next: SessionState): boolean;
}

export function createSessionMachine(res: SessionResources): SessionMachine {
  let state: SessionState = 'IDLE';
  return {
    get state() {
      return state;
    },
    to(next: SessionState): boolean {
      if (!ALLOWED[state].includes(next)) return false;
      res.stopScheduler();
      res.clearEvalTimers();
      res.clearResumeTimer();
      res.clearNotes();
      res.stopClock();
      res.clearBanner();
      // Nur hier, nicht in der allgemeinen Aufräumung: der Hinweis, der zur Pause
      // geführt hat, muss die Pause überleben – der Wiedereinstieg räumt ihn ab.
      if (next === 'RUNNING') res.dropFeedback();
      state = next;
      return true;
    },
  };
}
