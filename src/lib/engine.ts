// ── Übungs-Engine: Scheduler, Diktat, Tribunal, Messung ─────────────────────
// Start erst mit dem ersten korrekten Anschlag; optionaler Stopp bei Fehlern.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Metronome, Scheduler, requestWakeLock } from './audio';
import type { NoteEvent } from './midi';
import {
  diatonicChords, getKey, tribunal,
  type ChordDef, type DictateMode, PROGRESSIONS,
} from './music';
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
  paused: boolean;
}

export interface ClockRef {
  segStartPerf: number;
  segDur: number;
  segInBeat: number;
  subs: number;
  active: boolean;
  beatStartPerf: number;
  beatDur: number;
}

const EVAL_DELAY = 170;
const WINDOW = 170;
const RESUME_WINDOW = 260; // ms Fenster um den Wiedereinstiegs-Anschlag

export function useSession(config: SessionConfig, onPass: () => void) {
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
  const pausedRef = useRef(true);
  const resumeTimerRef = useRef<number | null>(null);
  const skipEvalBeatRef = useRef(-1); // Beat, der bereits per Anschlag bewertet wurde
  const streakRef = useRef(0);
  const offsetsRef = useRef<number[]>([]);
  const statsRef = useRef<StatsData>(loadStats());
  const upDownRef = useRef(0);
  const clockRef = useRef<ClockRef>({ segStartPerf: 0, segDur: 0.2, segInBeat: 0, subs: 4, active: false, beatStartPerf: 0, beatDur: 0.5 });
  const evalTimersRef = useRef<number[]>([]);
  const onPassRef = useRef(onPass);
  onPassRef.current = onPass;

  const key = getKey(config.keyId);
  const subs = config.exercise === 1 ? 4 : 3;

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

  // ── Pausieren (bei Fehler im Stopp-Modus) ─────────────────────────────────
  const pauseSession = useCallback(() => {
    schedRef.current?.stop();
    schedRef.current = null;
    evalTimersRef.current.forEach((t) => window.clearTimeout(t));
    evalTimersRef.current = [];
    clockRef.current.active = false;
    pausedRef.current = true;
    setHud((h) => h && ({ ...h, paused: true }));
  }, []);

  // ── Auswertung eines Beats (laufende Übung) ───────────────────────────────
  const evaluate = useCallback((beatPerf: number, beatIndex: number) => {
    const cur = currentRef.current;
    if (!cur || pausedRef.current) return;
    const notes = notesRef.current.filter((n) => n.time >= beatPerf - WINDOW && n.time <= beatPerf + WINDOW);
    notesRef.current = notesRef.current.filter((n) => n.time > beatPerf + WINDOW);

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
      const earliest = Math.min(...notes.map((n) => n.time));
      offset = earliest - beatPerf;
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

    metroRef.current?.signal(success);

    // Stopp-Modus: nur Fehlgriff (wrong) oder Auslassen (miss) halten an.
    // Timing-Fehler (zu früh/spät, Töne korrekt) werden nur angezeigt – der Takt läuft weiter.
    const halts = feedback.kind === 'wrong' || feedback.kind === 'miss';
    if (halts && config.errorMode === 'stop') pauseSession();
  }, [config.exercise, config.keyId, config.tolerance, config.errorMode, key, registerSuccess, pauseSession]);

  // ── Beat-Scheduling ───────────────────────────────────────────────────────
  const onEvent = useCallback((ev: { time: number; index: number }) => {
    const metro = metroRef.current;
    if (!metro) return;
    const isBeat = ev.index % subs === 0;
    const beatIndex = beatBaseRef.current + Math.floor(ev.index / subs);
    metro.click(ev.time, isBeat ? 'beat' : 'sub', ev.index === 0 && beatBaseRef.current === 0);

    const segDur = config.exercise === 1 ? (60 / tempoRef.current) / 4 : (60 / tempoRef.current) / 2;
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
      paused: false,
    }));

    // Der Wiedereinstiegs-Anschlag wurde bereits bewertet – diesen Beat nicht doppelt auswerten
    if (beatIndex === skipEvalBeatRef.current) {
      skipEvalBeatRef.current = -1;
      return;
    }
    const beatPerf = ev.time * 1000 + perfOffsetRef.current;
    const delay = Math.max(0, beatPerf + EVAL_DELAY - performance.now());
    const t = window.setTimeout(() => evaluate(beatPerf, beatIndex), delay);
    evalTimersRef.current.push(t);
  }, [config.exercise, subs, nextChord, key, evaluate]);

  // ── Wiedereinstieg / erster Anschlag ──────────────────────────────────────
  // Läuft nur im pausierten Zustand: prüft, ob der aktuelle Ziel-Akkord korrekt
  // gespielt wurde. Wenn ja: Uhr wird auf diesen Anschlag kalibriert, weiter geht's.
  const tryResume = useCallback((t0: number) => {
    const cur = currentRef.current;
    const metro = metroRef.current;
    if (!cur || !metro || !pausedRef.current) return;

    const notes = notesRef.current.filter((n) => n.time >= t0 - 30 && n.time <= t0 + RESUME_WINDOW);
    if (notes.length === 0) return;
    notesRef.current = notesRef.current.filter((n) => n.time > t0 + RESUME_WINDOW);

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
      const ctx = (metro as unknown as { ensure: () => AudioContext }).ensure();
      perfOffsetRef.current = performance.now() - ctx.currentTime * 1000;
      const noteAudio = (t0 - perfOffsetRef.current) / 1000;
      beatBaseRef.current = currentBeatRef.current;

      pausedRef.current = false;
      skipEvalBeatRef.current = currentBeatRef.current; // dieser Beat ist durch den Anschlag bereits bewertet
      const sched = new Scheduler(() => ctx, () => config.exercise === 1 ? (60 / tempoRef.current) / 4 : (60 / tempoRef.current) / 2, onEvent);
      schedRef.current = sched;
      sched.start(noteAudio);

      setHud((h) => h && ({
        ...h,
        paused: false,
        feedback: { kind: 'ok', big: 'Richtig – Uhr läuft', small: 'Der Takt folgt deinem Anschlag.', offsetMs: null },
        streak: streakRef.current,
        banner: banner ?? h.banner,
      }));
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
  }, [config.exercise, config.keyId, key, onEvent, registerSuccess]);

  // ── Start: Sequenz aufbauen, erster Akkord wartet auf den Anschlag ───────
  const start = useCallback((initialTempo: number) => {
    const metro = new Metronome();
    metroRef.current = metro;
    (metro as unknown as { ensure: () => AudioContext }).ensure(); // Nutzer-Geste: AudioContext entsperren
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
    notesRef.current = [];
    beatBaseRef.current = 0;
    skipEvalBeatRef.current = -1;

    // Erster Ziel-Akkord (Beat 0), Übung wartet auf den ersten korrekten Anschlag
    const first = nextChord();
    currentRef.current = { chord: first, shift: 0 };
    upcomingRef.current = nextChord(); // Vorschau ab dem ersten Beat
    currentBeatRef.current = 0;
    pausedRef.current = true;

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
      paused: true,
    });

    void requestWakeLock();
  }, [config, key, nextChord]);

  const stop = useCallback(() => {
    schedRef.current?.stop();
    schedRef.current = null;
    evalTimersRef.current.forEach((t) => window.clearTimeout(t));
    evalTimersRef.current = [];
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    clockRef.current.active = false;
    pausedRef.current = true;
  }, []);

  useEffect(() => stop, [stop]);

  const handleNote = useCallback((ev: NoteEvent) => {
    notesRef.current.push(ev);
    if (notesRef.current.length > 64) notesRef.current = notesRef.current.slice(-64);
    // Pausiert (Start oder Fehler-Stopp)? → Wiedereinstiegs-Versuch einleiten
    if (pausedRef.current && resumeTimerRef.current === null) {
      const t0 = ev.time;
      resumeTimerRef.current = window.setTimeout(() => {
        resumeTimerRef.current = null;
        tryResume(t0);
      }, RESUME_WINDOW);
    }
  }, [tryResume]);

  const clearBanner = useCallback(() => setHud((h) => h && ({ ...h, banner: null })), []);

  return { hud, start, stop, handleNote, clockRef, clearBanner };
}
