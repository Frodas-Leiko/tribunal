// ── Cockpit: Die laufende Übungseinheit ──────────────────────────────────────

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSession } from '@/lib/engine';
import type { SessionSetup } from './Home';
import { useNoteInput, DEMO_HINT } from '@/lib/midi';
import { getKey, PROGRESSIONS } from '@/lib/music';
import { unitFrame } from '@/lib/staff';
import { PASS_STREAK } from '@/lib/store';
import { Staff, Topography, SubdivisionBar, Tribunal, COLORS } from '@/components/Visuals';
import { BriefOverlay, KeyBrief, ProgressionBrief } from '@/components/Steckbrief';

export function Session({ setup, audio, onExit, onProgressChanged }: {
  setup: SessionSetup;
  audio: AudioContext;
  onExit: () => void;
  onProgressChanged: () => void;
}) {
  const { hud, start, stop, handleNote, clockRef, clearBanner } = useSession(setup, onProgressChanged, audio);
  const input = useNoteInput(useCallback((ev) => handleNote(ev), [handleNote]));

  const [audioState, setAudioState] = useState<AudioContextState>(audio.state);
  // B-23 AK 2: Der Steckbrief in der laufenden Einheit ist reine Anzeige. Er liegt
  // bewusst im lokalen Zustand dieser Ansicht und nicht im Zustandsautomaten: kein
  // `PAUSED`, kein gestoppter Timer, der Takt läuft weiter (R17, R22).
  const [briefOffen, setBriefOffen] = useState(false);
  const startedRef = useRef(false);

  // Die Einheit startet erst, wenn der Kontext wirklich läuft (R18/AK 2). Steht er
  // noch auf `suspended`, wartet sie am sichtbaren Hinweis unten – nie stumm.
  const armIfReady = useCallback(() => {
    if (startedRef.current || audio.state !== 'running') return;
    startedRef.current = true;
    start(setup.initialTempo);
  }, [audio, start, setup.initialTempo]);

  useEffect(() => {
    const sync = () => {
      setAudioState(audio.state);
      armIfReady();
    };
    const onVisible = () => {
      // R18: Rückkehr auf sichtbar – Kontext prüfen und fortsetzen, statt stehenzubleiben.
      if (document.visibilityState === 'visible' && audio.state !== 'running') void audio.resume();
      sync();
    };
    audio.addEventListener('statechange', sync);
    document.addEventListener('visibilitychange', onVisible);
    armIfReady(); // falls resume() schon vor dem Mount durchgelaufen ist
    return () => {
      audio.removeEventListener('statechange', sync);
      document.removeEventListener('visibilitychange', onVisible);
      stop();
      startedRef.current = false; // StrictMode montiert doppelt: der zweite Lauf startet erneut
    };
  }, [audio, armIfReady, stop]);

  const key = getKey(setup.keyId);
  const prog = setup.source === 'progression'
    ? PROGRESSIONS.find((p) => p.id === setup.progressionId) ?? null
    : null;

  const griffMulde = hud?.spelled?.map((n) => n.midi) ?? [];
  // B-09: Der Rahmen steht für die ganze Einheit fest – die Notenköpfe wandern,
  // die Systemlinien nicht.
  const rahmen = unitFrame(key, setup.anchor);

  return (
    <div className="session">
      <header className="session-head">
        <button className="back-btn" onClick={() => { stop(); onExit(); }}>← Ende</button>
        <div className="session-meta">
          <strong>{key.label}</strong>
          <span>{setup.exercise === 1 ? 'Blind-Griff' : 'Systemsprung'}</span>
          <span>{prog?.name ?? `Modus ${setup.mode}`}</span>
          <span style={{ color: COLORS.amber }}>{hud?.tempo ?? setup.initialTempo} bpm</span>
          <span>Serie: <strong style={{ color: COLORS.green }}>{hud?.streak ?? 0}</strong>/{PASS_STREAK}</span>
          <span>±{setup.tolerance} ms</span>
          {/* Konzept §10.4: höchstens ein Tippen. Für Stufen-Einheiten öffnet
              derselbe Knopf den Steckbrief der Tonart – er ist nie tot. */}
          <button className="brief-btn" onClick={() => setBriefOffen(true)} aria-label="Steckbrief">ⓘ</button>
        </div>
        <div className="session-input">
          {input.source === 'midi' ? (
            <span style={{ color: COLORS.green }}>● MIDI: {input.midiName}</span>
          ) : input.demoActive ? (
            <span style={{ color: COLORS.amber }}>● Demo-Modus</span>
          ) : (
            <button className="demo-btn" onClick={input.enableDemo}>Demo-Modus (Tastatur)</button>
          )}
        </div>
      </header>

      {audioState !== 'running' && (
        <button className="audio-blocked" onClick={() => { void audio.resume(); armIfReady(); }}>
          Audio blockiert – zum Aktivieren tippen
        </button>
      )}

      {input.demoActive && <div className="demo-hint">{DEMO_HINT}</div>}

      <main className="session-main">
        {/* Tribunal oben */}
        <Tribunal feedback={hud?.feedback ?? null} />

        {hud?.state === 'PAUSED' && (
          <div className="paused-chip">
            ⏸ Pausiert – spiele <strong>{hud.chordName}</strong> korrekt, um fortzufahren
          </div>
        )}

        {/* Zentrum: Ziel-Anzeige */}
        {setup.exercise === 1 ? (
          <div className="target-display">
            <div className="target-degree">{hud?.degree ?? '–'}</div>
            <div className="target-chord-line">
              <span className="target-chord">{hud?.chordName ?? '…'}</span>
              {hud?.nextName && (
                <span className="target-next" title="Nächster Akkord">
                  <span className="target-arrow">→</span>
                  <span className="target-next-name">{hud.nextName}</span>
                  <span className="target-next-degree">{hud.nextDegree}</span>
                </span>
              )}
            </div>
            <div className="target-hint">Forme die Mulde in der Luft – lande auf der 1.</div>
          </div>
        ) : (
          <div className="staff-wrap">
            <Staff spelled={hud?.spelled ?? []} zone={hud?.zone ?? 'zentrum'} frame={rahmen} />
            <div className="staff-caption">
              {hud
                ? `${hud.degree} · ${hud.chordName} · Zone: ${hud.zone.toUpperCase()}` +
                  (hud.nextName
                    ? `   →   ${hud.nextDegree} · ${hud.nextName}${hud.nextZone ? ` · ${hud.nextZone.toUpperCase()}` : ''}`
                    : '')
                : '…'}
            </div>
          </div>
        )}

        {/* Subdivisions-Balken */}
        <SubdivisionBar clockRef={clockRef} offsets={hud?.offsets ?? []} tolerance={setup.tolerance} exercise={setup.exercise} />

        {/* Topographie-Karte */}
        <div className="topo-wrap">
          <Topography notes={griffMulde} anchor={setup.anchor} tonic={key.tonic} />
        </div>
      </main>

      {hud?.banner && (
        <div className="banner">
          <span>{hud.banner}</span>
          <button onClick={clearBanner}>Weiter</button>
        </div>
      )}

      {/* B-23 AK 2: derselbe Steckbrief wie im Setup, mitten in der Einheit. Das
          Overlay ist eine Anzeige, keine Eingabeschicht – MIDI und Demo-Tastatur
          laufen unverändert in die Auswertung (R6: Touch ist im Steckbrief
          ausdrücklich erlaubt, die Übung selbst wird weiterhin nicht angetippt). */}
      {briefOffen && (
        <BriefOverlay
          title={prog ? `Steckbrief: ${prog.name}` : `Steckbrief: ${key.label}`}
          onClose={() => setBriefOffen(false)}
        >
          {prog
            ? <ProgressionBrief p={prog} mode={key.mode} anchor={setup.anchor} />
            : <KeyBrief k={key} anchor={setup.anchor} />}
        </BriefOverlay>
      )}
    </div>
  );
}
