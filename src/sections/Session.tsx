// ── Cockpit: Die laufende Übungseinheit ──────────────────────────────────────

import { useEffect, useCallback } from 'react';
import { useSession } from '@/lib/engine';
import type { SessionSetup } from './Home';
import { useNoteInput, DEMO_HINT } from '@/lib/midi';
import { getKey, PROGRESSIONS } from '@/lib/music';
import { Staff, Topography, SubdivisionBar, Tribunal, COLORS } from '@/components/Visuals';

export function Session({ setup, onExit, onProgressChanged }: {
  setup: SessionSetup;
  onExit: () => void;
  onProgressChanged: () => void;
}) {
  const { hud, start, stop, handleNote, clockRef, clearBanner } = useSession(setup, onProgressChanged);
  const input = useNoteInput(useCallback((ev) => handleNote(ev), [handleNote]));

  useEffect(() => {
    start(setup.initialTempo);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = getKey(setup.keyId);
  const progName = setup.source === 'progression'
    ? PROGRESSIONS.find((p) => p.id === setup.progressionId)?.name
    : null;

  const rootMidi = hud?.spelled?.[0]?.midi ?? null;

  return (
    <div className="session">
      <header className="session-head">
        <button className="back-btn" onClick={() => { stop(); onExit(); }}>← Ende</button>
        <div className="session-meta">
          <strong>{key.label}</strong>
          <span>{setup.exercise === 1 ? 'Blind-Griff' : 'Systemsprung'}</span>
          <span>{progName ?? `Modus ${setup.mode}`}</span>
          <span style={{ color: COLORS.amber }}>{hud?.tempo ?? setup.initialTempo} bpm</span>
          <span>Serie: <strong style={{ color: COLORS.green }}>{hud?.streak ?? 0}</strong>/8</span>
          <span>±{setup.tolerance} ms</span>
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

      {input.demoActive && <div className="demo-hint">{DEMO_HINT}</div>}

      <main className="session-main">
        {/* Tribunal oben */}
        <Tribunal feedback={hud?.feedback ?? null} />

        {hud?.paused && hud.feedback?.kind !== 'info' && (
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
            <Staff spelled={hud?.spelled ?? []} zoneGlow={hud?.zoneGlow ?? null} />
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
          <Topography rootMidi={rootMidi} />
        </div>
      </main>

      {hud?.banner && (
        <div className="banner">
          <span>{hud.banner}</span>
          <button onClick={clearBanner}>Weiter</button>
        </div>
      )}
    </div>
  );
}
