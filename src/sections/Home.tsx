// ── Stufenplan & Session-Setup ───────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { KEYS, PROGRESSIONS, MODE_LABELS, type KeyDef, type DictateMode } from '@/lib/music';
import {
  getKeyProgress, isStageUnlocked, isStageComplete, TARGET_TEMPO, type ProgressMap,
} from '@/lib/store';
import type { SessionConfig, ErrorMode } from '@/lib/engine';
import { COLORS } from '@/components/Visuals';
import { BriefOverlay, KeyBrief, ProgressionBrief, TimingBrief } from '@/components/Steckbrief';

export interface SessionSetup extends SessionConfig {
  initialTempo: number;
}

export function Home({ progress, onStart, openAudio }: {
  progress: ProgressMap;
  onStart: (s: SessionSetup, audio: AudioContext) => void;
  openAudio: () => AudioContext;
}) {
  const [selected, setSelected] = useState<KeyDef | null>(null);
  const [brief, setBrief] = useState<{ kind: 'key' | 'prog' | 'timing'; key?: KeyDef; progId?: string; ex?: 1 | 2 } | null>(null);

  // Setup-Zustand
  const [exercise, setExercise] = useState<1 | 2>(1);
  const [source, setSource] = useState<'stufen' | 'progression'>('stufen');
  const [mode, setMode] = useState<DictateMode>('A');
  const [progId, setProgId] = useState(PROGRESSIONS[0].id);
  const [tolerance, setTolerance] = useState(50);
  const [errorMode, setErrorMode] = useState<ErrorMode>('stop');
  const [tempoOverride, setTempoOverride] = useState<number | null>(null);

  const stages = [1, 2, 3, 4, 5];

  const selProgress = selected ? getKeyProgress(progress, selected.id) : null;
  const modeBLocked = selProgress ? !selProgress.doneA : true;

  // Tempo-Level aus dem Fortschritt; Slider kann darüber/darunter (freies Tempo)
  const levelTempo = selected
    ? source === 'stufen'
      ? mode === 'A'
        ? selProgress!.tempoA
        : mode === 'B'
          ? selProgress!.tempoB
          : 60
      : 60
    : 60;
  const effectiveTempo = tempoOverride ?? levelTempo;

  useEffect(() => {
    setTempoOverride(null);
  }, [selected?.id, source, mode]);

  const start = () => {
    if (!selected) return;
    // R18: Der AudioContext entsteht genau hier – im Klick-Handler von
    // „Einheit starten" – und wird an die Session durchgereicht. Später ist die
    // Nutzergeste vorbei und der Kontext bliebe auf Tablets `suspended`.
    const audio = openAudio();
    onStart({
      exercise, keyId: selected.id, source, mode, progressionId: progId,
      tolerance, errorMode, levelTempo, initialTempo: effectiveTempo,
    }, audio);
  };

  return (
    <div className="home">
      <section className="home-intro">
        <h2>Stufenplan</h2>
        <p>
          Fünf Stufen entlang des Quintenzirkels – jede bringt genau ein neues Vorzeichen.
          Eine Stufe gilt als geschafft, wenn beide Tonarten in <em>Modus A</em> und <em>Modus B</em>
          bei {TARGET_TEMPO} bpm je 8 fehlerfreie Wiederholungen in Folge stehen.
        </p>
      </section>

      <div className="stage-grid">
        {stages.map((s) => {
          const unlocked = isStageUnlocked(progress, s);
          const complete = isStageComplete(progress, s);
          return (
            <div key={s} className={`stage ${unlocked ? '' : 'locked'} ${complete ? 'complete' : ''}`}>
              <div className="stage-head">
                <span className="stage-num" style={{ color: complete ? COLORS.green : unlocked ? COLORS.amber : COLORS.dim }}>
                  Stufe {s}
                </span>
                {!unlocked && <span className="stage-lock">🔒</span>}
                {complete && <span className="stage-lock">✓</span>}
              </div>
              <div className="stage-keys">
                {KEYS.filter((k) => k.stage === s).map((k) => {
                  const p = getKeyProgress(progress, k.id);
                  return (
                    <button
                      key={k.id}
                      disabled={!unlocked}
                      className={`key-card ${selected?.id === k.id ? 'selected' : ''}`}
                      onClick={() => setSelected(k)}
                    >
                      <span className="key-name">{k.label}</span>
                      <span className="key-acc">{k.accidentals}</span>
                      <span className="key-badges">
                        <em className={p.doneA ? 'done' : ''}>A {p.doneA ? '✓' : `${p.tempoA}`}</em>
                        <em className={p.doneB ? 'done' : ''}>B {p.doneB ? '✓' : `${p.tempoB}`}</em>
                      </span>
                      <span
                        className="key-brief"
                        onClick={(e) => { e.stopPropagation(); setBrief({ kind: 'key', key: k }); }}
                      >
                        Steckbrief ⓘ
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <section className="setup">
          <h2>Einheit: {selected.label}</h2>

          <div className="setup-row">
            <span className="setup-label">Übung</span>
            <div className="setup-opts">
              <button className={exercise === 1 ? 'active' : ''} onClick={() => setExercise(1)}>1 · Blind-Griff (16tel)</button>
              <button className={exercise === 2 ? 'active' : ''} onClick={() => setExercise(2)}>2 · Systemsprung (6/8)</button>
              <button className="brief-btn" onClick={() => setBrief({ kind: 'timing', ex: exercise })}>Steckbrief ⓘ</button>
            </div>
          </div>

          <div className="setup-row">
            <span className="setup-label">Quelle</span>
            <div className="setup-opts">
              <button className={source === 'stufen' ? 'active' : ''} onClick={() => setSource('stufen')}>Stufen</button>
              <button className={source === 'progression' ? 'active' : ''} onClick={() => setSource('progression')}>Akkordfolge</button>
            </div>
          </div>

          {source === 'stufen' ? (
            <div className="setup-row">
              <span className="setup-label">Modus</span>
              <div className="setup-opts">
                {(['A', 'B', 'C'] as DictateMode[]).map((m) => (
                  <button
                    key={m}
                    disabled={m === 'B' && modeBLocked}
                    className={mode === m ? 'active' : ''}
                    onClick={() => setMode(m)}
                    title={m === 'B' && modeBLocked ? 'Erst Modus A abschließen' : ''}
                  >
                    {m}{m === 'B' && modeBLocked ? ' 🔒' : ''} · {MODE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="setup-row">
              <span className="setup-label">Folge</span>
              <div className="setup-opts wrap">
                {PROGRESSIONS.map((p) => (
                  <span key={p.id} className="prog-chip">
                    <button className={progId === p.id ? 'active' : ''} onClick={() => setProgId(p.id)}>{p.name}</button>
                    <button className="brief-btn" onClick={() => setBrief({ kind: 'prog', progId: p.id })}>ⓘ</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="setup-row">
            <span className="setup-label">Tempo</span>
            <div className="setup-opts tempo-opts">
              <input
                type="range"
                min={30}
                max={100}
                step={2}
                value={effectiveTempo}
                onChange={(e) => setTempoOverride(Number(e.target.value))}
                className="tempo-slider"
              />
              <span className="tempo-value">{effectiveTempo} bpm</span>
              {effectiveTempo !== levelTempo && source === 'stufen' && mode !== 'C' && (
                <span className="tempo-hint">freies Tempo · Fortschritt zählt auf Level {levelTempo} bpm</span>
              )}
            </div>
          </div>

          <div className="setup-row">
            <span className="setup-label">Toleranz</span>
            <div className="setup-opts">
              {[50, 35, 20].map((t) => (
                <button key={t} className={tolerance === t ? 'active' : ''} onClick={() => setTolerance(t)}>±{t} ms</button>
              ))}
            </div>
          </div>

          <div className="setup-row">
            <span className="setup-label">Bei Fehler</span>
            <div className="setup-opts">
              <button className={errorMode === 'stop' ? 'active' : ''} onClick={() => setErrorMode('stop')}>
                Stoppen – bei Fehlgriff oder Auslassen
              </button>
              <button className={errorMode === 'continue' ? 'active' : ''} onClick={() => setErrorMode('continue')}>
                Fortfahren – Takt läuft durch
              </button>
            </div>
          </div>

          <button className="start-btn" onClick={start}>
            Einheit starten · {effectiveTempo} bpm
          </button>
        </section>
      )}

      {brief?.kind === 'key' && brief.key && (
        <BriefOverlay title={`Steckbrief: ${brief.key.label}`} onClose={() => setBrief(null)}>
          <KeyBrief k={brief.key} />
        </BriefOverlay>
      )}
      {brief?.kind === 'prog' && (
        <BriefOverlay title="Steckbrief: Akkordfolge" onClose={() => setBrief(null)}>
          <ProgressionBrief p={PROGRESSIONS.find((p) => p.id === brief.progId)!} mode={selected?.mode ?? 'dur'} />
        </BriefOverlay>
      )}
      {brief?.kind === 'timing' && (
        <BriefOverlay title={brief.ex === 1 ? 'Steckbrief: Blind-Griff' : 'Steckbrief: Systemsprung'} onClose={() => setBrief(null)}>
          <TimingBrief exercise={brief.ex ?? 1} />
        </BriefOverlay>
      )}
    </div>
  );
}
