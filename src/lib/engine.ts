// ── Übungs-Engine: Scheduler, Diktat, Tribunal, Messung ─────────────────────
// Start erst mit dem ersten korrekten Anschlag; optionaler Stopp bei Fehlern.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ATTEMPT_GAP_MS, attemptCapMs, attemptForBeat, evalWindowMs, groupAttempts,
  type Attempt,
} from './attempt';
import { Metronome, Scheduler, requestWakeLock } from './audio';
import type { NoteEvent } from './midi';
import {
  diatonicChords, getKey, tribunal,
  type ChordDef, type DictateMode, PROGRESSIONS,
} from './music';
import { createSessionMachine, type SessionMachine, type SessionState } from './session-state';
import { spellTriad, zoneOf, type SpelledNote, type Zone } from './staff';
import {
  loadStats, recordAttempt, weaknessWeights, passTempo, PASS_STREAK, START_TEMPO,
  type StatsData,
} from './store';

export type ErrorMode = 'stop' | 'continue';

export interface SessionConfig {
  exercise: 1 | 2;
  keyId: string;
  source: 'stufen' | 'progression';
  mode: DictateMode;
  progressionId?: string;
  tolerance: number;   // ms, z.B. 50
  errorMode: ErrorMode;
  levelTempo: number;  // aktuelles Fortschritts-Level (für Rampen-Logik)
}

export interface Feedback {
  kind: 'ok' | 'wrong' | 'miss' | 'timing' | 'info';
  big: string;
  small: string;
  offsetMs: number | null;
}

export interface Hud {
  chordName: string;
  degree: string;
  spelled: SpelledNote[];
  zone: Zone;
  zoneGlow: Zone | null;
  nextName: string | null;    // Vorschau: nächster Akkord (schon vor dem Wechsel sichtbar)
  nextDegree: string | null;
  nextZone: Zone | null;      // Übung 2: Ziel-Zone des nächsten Takts
  feedback: Feedback | null;
  streak: number;
  tempo: number;
  offsets: number[];
  banner: string | null;
  chordIndex: number;
  beatsPerBar: number;
  state: SessionState;   // die Anzeige leitet sich aus dem Zustand ab, nicht aus der Feedback-Art
}

/** R22: Ein Banner verschwindet spätestens nach 4 Sekunden. */
const BANNER_MS = 4000;

export interface ClockRef {
  segStartPerf: number;
  segDur: number;
  segInBeat: number;
  subs: number;
  active: boolean;
  beatStartPerf: number;
  beatDur: number;
}

// `audio` entsteht in der Nutzergeste von „Einheit starten" (R18) und wird von
// dort durchgereicht – die Engine öffnet selbst nie einen Kontext.
export function useSession(config: SessionConfig, onPass: () => void, audio: AudioContext) {
  const [hud, setHud] = useState<Hud | null>(null);

  const metroRef = useRef<Metronome | null>(null);
  const schedRef = useRef<Scheduler | null>(null);
  const tempoRef = useRef(START_TEMPO);
  const notesRef = useRef<NoteEvent[]>([]);
  const perfOffsetRef = useRef(0);
  const seqIdxRef = useRef(0);
  const chordsRef = useRef<ChordDef[]>([]);
  const weightsRef = useRef<number[]>([]);
  const currentRef = useRef<{ chord: ChordDef; shift: number } | null>(null);
  const upcomingRef = useRef<ChordDef | null>(null); // Vorschau: einen Schritt voraus gezogener Akkord
  const currentBeatRef = useRef(-1);   // Beat-Nr., der currentRef zugeordnet ist
  const beatBaseRef = useRef(0);       // Offset: Beat-Nr. = base + schedulerIndex/subs
  const resumeTimerRef = useRef<number | null>(null);
  const skipEvalBeatRef = useRef(-1); // Beat, der bereits per Anschlag bewertet wurde
  const streakRef = useRef(0);
  const offsetsRef = useRef<number[]>([]);
  const statsRef = useRef<StatsData>(loadStats());
  const upDownRef = useRef(0);
  const clockRef = useRef<ClockRef>({ segStartPerf: 0, segDur: 0.2, segInBeat: 0, subs: 4, active: false, beatStartPerf: 0, beatDur: 0.5 });
  const evalTimersRef = useRef<number[]>([]);
  const bannerTimerRef = useRef<number | null>(null);
  const onPassRef = useRef(onPass);
  onPassRef.current = onPass;

  // R17: der einzige Ort, an dem der Zustand wechselt. Jeder Übergang räumt die
  // hier übergebenen Ressourcen auf – vollständig, ohne Ausnahme. Der Automat
  // entsteht beim ersten Zugriff, nicht während des Renderings: die Handles
  // dürfen die Refs erst binden, wenn sie außerhalb des Renderings laufen.
  const machineRef = useRef<SessionMachine | null>(null);
  const getMachine = useCallback((): SessionMachine => {
    const existing = machineRef.current;
    if (existing) return existing;
    const machine = createSessionMachine({
      stopScheduler: () => {
        schedRef.current?.stop();
        schedRef.current = null;
      },
      clearEvalTimers: () => {
        evalTimersRef.current.forEach((t) => window.clearTimeout(t));
        evalTimersRef.current = [];
      },
      clearResumeTimer: () => {
        if (resumeTimerRef.current !== null) {
          window.clearTimeout(resumeTimerRef.current);
          resumeTimerRef.current = null;
        }
      },
      clearNotes: () => {
        notesRef.current = [];
      },
      stopClock: () => {
        // Die Uhr steht; der Balken beginnt beim nächsten Start sichtbar neu (R19).
        clockRef.current = { ...clockRef.current, active: false, segInBeat: 0 };
      },
      clearBanner: () => {
        if (bannerTimerRef.current !== null) {
          window.clearTimeout(bannerTimerRef.current);
          bannerTimerRef.current = null;
        }
        setHud((h) => (h && h.banner !== null ? { ...h, banner: null } : h));
      },
      dropFeedback: () => {
        setHud((h) => (h && h.feedback !== null ? { ...h, feedback: null } : h));
      },
    });
    machineRef.current = machine;
    return machine;
  }, []);

  const key = getKey(config.keyId);
  const subs = config.exercise === 1 ? 4 : 3;

  // Übung 1 zählt 16tel auf einen Viertel-Beat, Übung 2 zwei schwere Schläge im 6/8.
  const segDurSec = useCallback(
    () => (config.exercise === 1 ? (60 / tempoRef.current) / 4 : (60 / tempoRef.current) / 2),
    [config.exercise],
  );
  const beatDurMs = useCallback(() => segDurSec() * subs * 1000, [segDurSec, subs]);

  // ── Sequenz-Generierung ──────────────────────────────────────────────────
  const nextChord = useCallback((): ChordDef => {
    const chords = chordsRef.current;
    if (chords.length === 0) throw new Error('Keine Akkorde');
    if (config.source === 'progression') {
      const c = chords[seqIdxRef.current % chords.length];
      seqIdxRef.current += 1;
      return c;
    }
    if (config.mode === 'A') {
      const pattern = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
      const c = chords[pattern[upDownRef.current % pattern.length]];
      upDownRef.current += 1;
      return c;
    }
    if (config.mode === 'C') {
      const w = weightsRef.current;
      const sum = w.reduce((a, b) => a + b, 0);
      let r = Math.random() * sum;
      for (let i = 0; i < chords.length; i++) {
        r -= w[i];
        if (r <= 0) return chords[i];
      }
      return chords[chords.length - 1];
    }
    return chords[Math.floor(Math.random() * chords.length)];
  }, [config.source, config.mode]);

  // ── Serien-Logik (Bestehen, Rampe, Banner) ────────────────────────────────
  const registerSuccess = useCallback((): string | null => {
    streakRef.current += 1;
    if (streakRef.current !== PASS_STREAK) return null;
    streakRef.current = 0;
    let banner: string;
    if (config.source === 'stufen' && config.mode !== 'C') {
      if (tempoRef.current === config.levelTempo) {
        const stored = JSON.parse(localStorage.getItem('tribunal.progress.v1') ?? '{}');
        const res = passTempo(stored, config.keyId, config.mode);
        localStorage.setItem('tribunal.progress.v1', JSON.stringify(res.map));
        banner = res.justCompleted
          ? `Modus ${config.mode} abgeschlossen! ${config.mode === 'A' ? 'Modus B ist jetzt dein Prüfstein.' : 'Diese Tonart sitzt.'}`
          : `Serie geschafft – Tempo-Level steigt auf ${res.newTempo} bpm.`;
        tempoRef.current = res.newTempo;
      } else {
        banner = `Serie geschafft – Fortschritt zählt auf Level ${config.levelTempo} bpm (freies Tempo: ${tempoRef.current}).`;
      }
    } else {
      banner = 'Serie geschafft – 8 in Folge.';
    }
    onPassRef.current();
    return banner;
  }, [config.source, config.mode, config.levelTempo, config.keyId]);

  // ── Banner-Lebensdauer (R22) ──────────────────────────────────────────────
  // Ein Banner verschwindet von selbst – der „Weiter"-Button ist Zugabe, nicht
  // Voraussetzung. Sonst bliebe mitten in der Einheit ein Zustand stehen, den nur
  // ein Tippen auflöst (R6).
  const armBannerTimeout = useCallback(() => {
    if (bannerTimerRef.current !== null) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => {
      bannerTimerRef.current = null;
      setHud((h) => (h && h.banner !== null ? { ...h, banner: null } : h));
    }, BANNER_MS);
  }, []);

  const clearBanner = useCallback(() => {
    if (bannerTimerRef.current !== null) {
      window.clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
    setHud((h) => (h && h.banner !== null ? { ...h, banner: null } : h));
  }, []);

  // ── Pausieren (bei Fehler im Stopp-Modus) ─────────────────────────────────
  const pauseSession = useCallback(() => {
    const machine = getMachine();
    if (!machine.to('PAUSED')) return;
    setHud((h) => h && ({ ...h, state: machine.state }));
  }, [getMachine]);

  // ── Auswertung eines Beats (laufende Übung) ───────────────────────────────
  // Ein Urteil pro Beat: bewertet wird der Versuch, dessen erster Ton dem Beat am
  // nächsten liegt (R20/R21). Rollt der Akkord noch, wartet die Bewertung, bis das
  // Sammelfenster geschlossen ist – ein falscher Ton beendet ihn nicht (AK 2).
  const evaluate = useCallback((beatPerf: number, beatIndex: number) => {
    const judge = () => {
    const cur = currentRef.current;
    if (!cur || getMachine().state !== 'RUNNING') return;

    const beatDur = beatDurMs();
    const cap = attemptCapMs(beatDur);
    const win = evalWindowMs(config.tolerance, beatDur);
    // Vorfilter weit genug, dass die Gruppierung am Rand dieselbe bleibt.
    const inRange = notesRef.current.filter((n) => n.time >= beatPerf - win - cap && n.time <= beatPerf + win + cap);
    const chosen = attemptForBeat(groupAttempts(inRange, cap), beatPerf, win);

    if (chosen) {
      const sinceLast = performance.now() - chosen.end;
      if (sinceLast < ATTEMPT_GAP_MS && chosen.end - chosen.start < cap) {
        // Der Akkord rollt noch – erst nach Fensterende bewerten (R20).
        const t = window.setTimeout(() => {
          evalTimersRef.current = evalTimersRef.current.filter((id) => id !== t);
          judge();
        }, ATTEMPT_GAP_MS - sinceLast);
        evalTimersRef.current.push(t);
        return;
      }
    }
    const notes = chosen?.notes ?? [];
    const cut = Math.max(beatPerf + win, chosen?.end ?? Number.NEGATIVE_INFINITY);
    notesRef.current = notesRef.current.filter((n) => n.time > cut);

    let feedback: Feedback;
    let pitchOk = false;
    let direction: 1 | -1 | 0 = 0;
    let offset: number | null = null;

    const spelled = spellTriad(cur.chord, key, cur.shift);
    const targetPcs = new Set(cur.chord.pcs);

    if (notes.length === 0) {
      feedback = { kind: 'miss', big: 'Kein Anschlag', small: 'Die Hand war nicht da, als der Klang stehen musste.', offsetMs: null };
    } else {
      const playedPcs = new Set(notes.map((n) => n.midi % 12));
      offset = notes[0].time - beatPerf;   // der erste Ton des Versuchs ist die Landung
      offsetsRef.current = [...offsetsRef.current, offset].slice(-12);

      const allHit = [...targetPcs].every((pc) => playedPcs.has(pc));
      const noExtra = [...playedPcs].every((pc) => targetPcs.has(pc));
      pitchOk = allHit && noExtra;

      let registerOk = true;
      let registerMsg = '';
      if (config.exercise === 2 && pitchOk) {
        const avgPlayed = notes.reduce((a, n) => a + n.midi, 0) / notes.length;
        const avgTarget = spelled.reduce((a, s) => a + s.midi, 0) / spelled.length;
        const d = avgPlayed - avgTarget;
        if (Math.abs(d) >= 6) {
          registerOk = false;
          direction = d > 0 ? 1 : -1;
          registerMsg = d > 0 ? 'Hand: eine Oktave tiefer' : 'Hand: eine Oktave höher';
        }
      }

      if (pitchOk && registerOk) {
        if (Math.abs(offset) <= config.tolerance) {
          feedback = { kind: 'ok', big: 'Richtig', small: `${offset > 0 ? '+' : ''}${Math.round(offset)} ms`, offsetMs: offset };
        } else {
          feedback = {
            kind: 'timing',
            big: `${Math.abs(Math.round(offset))} ms ${offset > 0 ? 'zu spät' : 'zu früh'}`,
            small: 'Tonlage stimmt – die Landung nicht. Reise mit dem Cursor.',
            offsetMs: offset,
          };
          pitchOk = false;
        }
      } else if (pitchOk && !registerOk) {
        feedback = { kind: 'wrong', big: registerMsg, small: 'Richtiger Block, falsche Zone.', offsetMs: offset };
        pitchOk = false;
      } else {
        const vec = tribunal(cur.chord, playedPcs, key);
        direction = vec.direction;
        feedback = { kind: 'wrong', big: vec.big, small: vec.small, offsetMs: offset };
      }
    }

    const success = feedback.kind === 'ok';
    if (!success) streakRef.current = 0;
    const banner = success ? registerSuccess() : null;
    statsRef.current = recordAttempt(statsRef.current, config.keyId, cur.chord.name, success, direction, offset);

    setHud((h) => h && ({
      ...h,
      feedback,
      streak: streakRef.current,
      tempo: tempoRef.current,
      offsets: [...offsetsRef.current],
      banner: banner ?? h.banner,
      chordIndex: beatIndex,
    }));
    if (banner) armBannerTimeout();

    metroRef.current?.signal(success);

    // Stopp-Modus: nur Fehlgriff (wrong) oder Auslassen (miss) halten an.
    // Timing-Fehler (zu früh/spät, Töne korrekt) werden nur angezeigt – der Takt läuft weiter.
    const halts = feedback.kind === 'wrong' || feedback.kind === 'miss';
    if (halts && config.errorMode === 'stop') pauseSession();
    };
    judge();
  }, [config.exercise, config.keyId, config.tolerance, config.errorMode, key, beatDurMs, getMachine, registerSuccess, pauseSession, armBannerTimeout]);

  // ── Beat-Scheduling ───────────────────────────────────────────────────────
  const onEvent = useCallback((ev: { time: number; index: number }) => {
    const metro = metroRef.current;
    if (!metro) return;
    const isBeat = ev.index % subs === 0;
    const beatIndex = beatBaseRef.current + Math.floor(ev.index / subs);
    metro.click(ev.time, isBeat ? 'beat' : 'sub', ev.index === 0 && beatBaseRef.current === 0);

    const segDur = segDurSec();
    const segStartPerf = (ev.time * 1000 + perfOffsetRef.current) / 1000;
    clockRef.current = {
      segStartPerf,
      segDur,
      segInBeat: ev.index % subs,
      subs,
      active: true,
      beatStartPerf: isBeat ? segStartPerf : clockRef.current.beatStartPerf,
      beatDur: segDur * subs,
    };

    if (!isBeat) return;

    const barNum = config.exercise === 2 ? Math.floor(beatIndex / 2) : 0;
    const targetZone: Zone = barNum % 2 === 0 ? 'zenit' : 'nadir';
    const parity = config.exercise === 2 ? beatIndex % 2 : 0;
    const shift = config.exercise === 2 ? (parity === 0 ? 0 : targetZone === 'zenit' ? 1 : -1) : 0;

    // Akkord nur bei neuem Beat-Index wechseln (Beat 1 in Übung 1, Taktbeginn in Übung 2)
    const advance = config.exercise === 1 ? beatIndex !== currentBeatRef.current
      : beatIndex % 2 === 0 && beatIndex !== currentBeatRef.current;
    if (advance || !currentRef.current) {
      // Der in der Vorschau angezeigte Akkord wird aktuell – und ein neuer wird vorausgezogen.
      // So steht der nächste Akkord schon einen Beat vorher fest (auch im Zufallsmodus).
      const chord = upcomingRef.current ?? nextChord();
      currentRef.current = { chord, shift };
      upcomingRef.current = nextChord();
    } else {
      currentRef.current = { ...currentRef.current, shift };
    }
    currentBeatRef.current = beatIndex;

    const cur = currentRef.current;
    const spelled = spellTriad(cur.chord, key, shift);
    const zone = zoneOf(spelled[1].diatonic);
    const zoneGlow: Zone | null = config.exercise === 2 ? (parity === 0 ? targetZone : 'zentrum') : null;

    setHud((h) => ({
      chordName: cur.chord.name,
      degree: cur.chord.degree,
      spelled,
      zone,
      zoneGlow,
      nextName: upcomingRef.current?.name ?? null,
      nextDegree: upcomingRef.current?.degree ?? null,
      nextZone: config.exercise === 2 ? (targetZone === 'zenit' ? 'nadir' : 'zenit') : null,
      feedback: h?.feedback ?? null,
      streak: streakRef.current,
      tempo: tempoRef.current,
      offsets: offsetsRef.current,
      banner: h?.banner ?? null,
      chordIndex: beatIndex,
      beatsPerBar: config.exercise === 2 ? 2 : 1,
      state: getMachine().state,
    }));

    // Der Wiedereinstiegs-Anschlag wurde bereits bewertet – diesen Beat nicht doppelt auswerten
    if (beatIndex === skipEvalBeatRef.current) {
      skipEvalBeatRef.current = -1;
      return;
    }
    const beatPerf = ev.time * 1000 + perfOffsetRef.current;
    // R21: Der Nachlauf ist das abgeleitete Fenster, keine Konstante. Rollt zu
    // diesem Zeitpunkt noch ein Akkord, verlängert `evaluate` selbst.
    const delay = Math.max(0, beatPerf + evalWindowMs(config.tolerance, beatDurMs()) - performance.now());
    // AK 3: Der Timer trägt sich nach dem Feuern selbst aus – die Liste enthält
    // nur noch ausstehende Auswertungen.
    const t = window.setTimeout(() => {
      evalTimersRef.current = evalTimersRef.current.filter((id) => id !== t);
      evaluate(beatPerf, beatIndex);
    }, delay);
    evalTimersRef.current.push(t);
  }, [config.exercise, config.tolerance, subs, nextChord, key, segDurSec, beatDurMs, getMachine, evaluate]);

  // ── Wiedereinstieg / erster Anschlag ──────────────────────────────────────
  // Läuft in ARMED (vor dem ersten Anschlag) und PAUSED (nach einem Fehler): prüft,
  // ob der aktuelle Ziel-Akkord korrekt gespielt wurde. Wenn ja: Uhr wird auf
  // diesen Anschlag kalibriert, weiter geht's.
  const tryResume = useCallback((attempt: Attempt) => {
    const cur = currentRef.current;
    const metro = metroRef.current;
    if (!cur || !metro) return;
    const machine = getMachine();
    if (machine.state !== 'ARMED' && machine.state !== 'PAUSED') return;

    const notes = attempt.notes;
    const t0 = attempt.start;
    const playedPcs = new Set(notes.map((n) => n.midi % 12));
    const targetPcs = new Set(cur.chord.pcs);
    const allHit = [...targetPcs].every((pc) => playedPcs.has(pc));
    const noExtra = [...playedPcs].every((pc) => targetPcs.has(pc));

    // Register-Prüfung (Übung 2)
    let registerOk = true;
    let registerDelta = 0;
    if (allHit && noExtra && config.exercise === 2) {
      const spelled = spellTriad(cur.chord, key, cur.shift);
      const avgPlayed = notes.reduce((a, n) => a + n.midi, 0) / notes.length;
      const avgTarget = spelled.reduce((a, s) => a + s.midi, 0) / spelled.length;
      registerDelta = avgPlayed - avgTarget;
      registerOk = Math.abs(registerDelta) < 6;
    }

    if (allHit && noExtra && registerOk) {
      const banner = registerSuccess();
      statsRef.current = recordAttempt(statsRef.current, config.keyId, cur.chord.name, true, 0, null);

      // Uhr kalibrieren: der Anschlag IST der Beat
      const ctx = metro.context();
      perfOffsetRef.current = performance.now() - ctx.currentTime * 1000;
      const noteAudio = (t0 - perfOffsetRef.current) / 1000;

      // R17: Der Übergang räumt Wiedereinstiegs-Timer, Notenpuffer und Uhr auf –
      // der Balken beginnt damit sichtbar neu (Segment 1, Cursor erst mit dem
      // ersten Event). Der neue Scheduler entsteht erst danach.
      machine.to('RUNNING');
      skipEvalBeatRef.current = currentBeatRef.current; // dieser Beat ist durch den Anschlag bereits bewertet
      const sched = new Scheduler(() => ctx, segDurSec, onEvent);
      schedRef.current = sched;
      // R19: `noteAudio` liegt beim Aufruf schon zurück – mindestens um das
      // Sammelfenster. start() schiebt den Startzeitpunkt in ganzen Schritten vor
      // und meldet die übersprungenen Schritte; die Beat-Nummerierung folgt um die
      // darin enthaltenen ganzen Beats.
      const skipped = sched.start(noteAudio);
      beatBaseRef.current = currentBeatRef.current + Math.floor(skipped / subs);

      setHud((h) => h && ({
        ...h,
        state: machine.state,
        feedback: { kind: 'ok', big: 'Richtig – Uhr läuft', small: 'Der Takt folgt deinem Anschlag.', offsetMs: null },
        streak: streakRef.current,
        banner,
      }));
      if (banner) armBannerTimeout();
      metro.signal(true);
    } else {
      // Weiter pausiert: genau ein Hinweis als Korrekturhilfe (R2, R3)
      let feedback: Feedback;
      let direction: 1 | -1 | 0;
      if (allHit && noExtra) {
        // Alle Töne liegen, nur die Zone nicht (Übung 2). Das Tribunal urteilt über
        // Tonhöhenklassen; „Akkord nicht gefunden" wäre hier nach R23 falsch.
        direction = registerDelta > 0 ? 1 : -1;
        feedback = {
          kind: 'wrong',
          big: registerDelta > 0 ? 'Hand: eine Oktave tiefer' : 'Hand: eine Oktave höher',
          small: 'Richtiger Block, falsche Zone.',
          offsetMs: null,
        };
      } else {
        const vec = tribunal(cur.chord, playedPcs, key);
        direction = vec.direction;
        feedback = { kind: 'wrong', big: vec.big, small: vec.small, offsetMs: null };
      }
      statsRef.current = recordAttempt(statsRef.current, config.keyId, cur.chord.name, false, direction, null);
      setHud((h) => h && ({ ...h, feedback, streak: 0 }));
      streakRef.current = 0;
      metro.signal(false);
    }
  }, [config.exercise, config.keyId, key, subs, segDurSec, getMachine, onEvent, registerSuccess, armBannerTimeout]);

  // ── Start: Sequenz aufbauen, erster Akkord wartet auf den Anschlag ───────
  const start = useCallback((initialTempo: number) => {
    // Zurück auf Anfang: der Übergang räumt auf, was von einer vorherigen Einheit
    // im selben Hook noch stehen könnte (StrictMode-Doppelstart).
    const machine = getMachine();
    machine.to('IDLE');
    // Kein eigener Kontext (R18): `audio` ist in der Nutzergeste entstanden. Ein
    // zweiter start() – etwa der Doppelstart unter StrictMode – hängt sich an
    // denselben Kontext, statt einen weiteren zu öffnen.
    const metro = new Metronome(audio);
    metroRef.current = metro;
    tempoRef.current = initialTempo;

    if (config.source === 'progression') {
      const prog = PROGRESSIONS.find((p) => p.id === config.progressionId);
      const all = diatonicChords(key);
      const degrees = prog ? prog.degrees[key.mode] : [];
      chordsRef.current = degrees.map((d) => all.find((c) => c.degree === d)).filter((c): c is ChordDef => !!c);
    } else {
      chordsRef.current = diatonicChords(key);
    }
    weightsRef.current = weaknessWeights(statsRef.current, config.keyId, chordsRef.current.map((c) => c.name));
    seqIdxRef.current = 0;
    upDownRef.current = 0;
    streakRef.current = 0;
    offsetsRef.current = [];
    beatBaseRef.current = 0;
    skipEvalBeatRef.current = -1;

    // Erster Ziel-Akkord (Beat 0), Übung wartet auf den ersten korrekten Anschlag
    const first = nextChord();
    currentRef.current = { chord: first, shift: 0 };
    upcomingRef.current = nextChord(); // Vorschau ab dem ersten Beat
    currentBeatRef.current = 0;
    machine.to('ARMED');

    const spelled = spellTriad(first, key, 0);
    setHud({
      chordName: first.name,
      degree: first.degree,
      spelled,
      zone: zoneOf(spelled[1].diatonic),
      zoneGlow: config.exercise === 2 ? 'zenit' : null,
      nextName: upcomingRef.current.name,
      nextDegree: upcomingRef.current.degree,
      nextZone: config.exercise === 2 ? 'nadir' : null,
      feedback: {
        kind: 'info',
        big: `Starte mit ${first.name}`,
        small: 'Die Übung beginnt mit deinem ersten korrekten Anschlag – das Metronom folgt dir.',
        offsetMs: null,
      },
      streak: 0,
      tempo: initialTempo,
      offsets: [],
      banner: null,
      chordIndex: 0,
      beatsPerBar: config.exercise === 2 ? 2 : 1,
      state: machine.state,
    });

    void requestWakeLock();
  }, [config, key, nextChord, audio, getMachine]);

  const stop = useCallback(() => {
    getMachine().to('ENDED'); // R17: räumt Scheduler, Timer, Puffer und Uhr auf
    metroRef.current = null; // R18/AK 4: kein Metronom überlebt einen Stopp
  }, [getMachine]);

  useEffect(() => stop, [stop]);

  // ── Sammelfenster bei stehender Uhr (ARMED/PAUSED) ────────────────────────
  // Der Versuch endet, wenn ATTEMPT_GAP_MS lang kein Ton folgt – gedeckelt nach R20.
  // Erst dann wird bewertet, damit ein gerollter Akkord oder ein schneller
  // Zweitversuch nicht in einen falschen Versuch gepresst wird.
  const closeAttempt = useCallback(() => {
    const machine = getMachine();
    if (machine.state !== 'ARMED' && machine.state !== 'PAUSED') return;
    const [first] = groupAttempts(notesRef.current, attemptCapMs(beatDurMs()));
    if (!first) return;
    notesRef.current = notesRef.current.filter((n) => n.time > first.end); // Versuch verbraucht
    tryResume(first);
  }, [getMachine, beatDurMs, tryResume]);

  const handleNote = useCallback((ev: NoteEvent) => {
    // In IDLE und ENDED nimmt die Session keine Eingabe an (R17-Tabelle).
    const machine = getMachine();
    if (machine.state === 'IDLE' || machine.state === 'ENDED') return;
    clearBanner(); // R22: der nächste Anschlag räumt den Banner ab
    notesRef.current.push(ev);
    if (notesRef.current.length > 64) notesRef.current = notesRef.current.slice(-64);
    if (machine.state === 'RUNNING') return; // im Takt bewertet der Beat, nicht die Stille

    // Fenster nachziehen: jeder weitere Ton verlängert es um die Stille-Grenze,
    // die Obergrenze schließt es in jedem Fall.
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    const openSince = ev.time - (notesRef.current[0]?.time ?? ev.time);
    const wait = Math.max(0, Math.min(ATTEMPT_GAP_MS, attemptCapMs(beatDurMs()) - openSince));
    resumeTimerRef.current = window.setTimeout(() => {
      resumeTimerRef.current = null;
      closeAttempt();
    }, wait);
  }, [getMachine, beatDurMs, closeAttempt, clearBanner]);

  return { hud, start, stop, handleNote, clockRef, clearBanner };
}
