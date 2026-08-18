// ── Stufenplan & Session-Setup ───────────────────────────────────────────────

import { useState } from 'react';
import { KEYS, PROGRESSIONS, MODE_LABELS, unavailableReason, type KeyDef, type DictateMode } from '@/lib/music';
import {
  getStand, isStageComplete, recommendedNext, stufenUnit, folgenUnit,
  PASS_STREAK, START_TEMPO, TARGET_TEMPO, type Progress, type UnitRef,
} from '@/lib/store';
import type { SessionConfig, ErrorMode } from '@/lib/engine';
import { ANCHORS, ANCHOR_DEFAULT, anchorLabel } from '@/lib/staff';
import { stufenketteText } from '@/lib/progression-view';
import { COLORS } from '@/components/Visuals';
import { FolgenAuswahl } from '@/components/FolgenAuswahl';
import { BriefOverlay, KeyBrief, ProgressionBrief, TimingBrief } from '@/components/Steckbrief';

export interface SessionSetup extends SessionConfig {
  initialTempo: number;
}

export function Home({ progress, onStart, openAudio }: {
  progress: Progress;
  onStart: (s: SessionSetup, audio: AudioContext) => void;
  openAudio: () => AudioContext;
}) {
  const [selected, setSelected] = useState<KeyDef | null>(null);
  const [brief, setBrief] = useState<{ kind: 'key' | 'prog' | 'timing'; key?: KeyDef; progId?: string; ex?: 1 | 2 } | null>(null);
  const [auswahlOffen, setAuswahlOffen] = useState(false);

  // Setup-Zustand
  const [exercise, setExercise] = useState<1 | 2>(1);
  const [source, setSource] = useState<'stufen' | 'progression'>('stufen');
  const [mode, setMode] = useState<DictateMode>('A');
  const [progId, setProgId] = useState(PROGRESSIONS[0].id);
  const [tolerance, setTolerance] = useState(50);
  const [anchor, setAnchor] = useState<number>(ANCHOR_DEFAULT);
  const [errorMode, setErrorMode] = useState<ErrorMode>('stop');
  // B-15 AK 3: Der Regler gehört zu genau einer Einheit. Wechselt Tonart, Quelle
  // oder Modus, gilt wieder das Level-Tempo – zurückgesetzt im selben Klick, nicht
  // in einem Effekt hinterher: die alte Fassung zeigte dazwischen einen Rahmen
  // lang „freies Tempo", obwohl niemand den Regler angefasst hatte.
  const [tempoOverride, setTempoOverride] = useState<number | null>(null);

  const stages = [1, 2, 3, 4, 5];

  // Die gewählte Folge und ihr Hindernis. B-20/B-21: Nicht jede Folge passt zu
  // jeder Einheit – weil das Tongeschlecht im Datensatz nicht angeboten ist, weil
  // eine Stufe in dieser Tonart nicht existiert (R16) oder weil die Folge für
  // Übung 2 zu lang ist. Keine Sperre nach R11: Alle drei Fälle sind
  // Unmöglichkeiten, und jeder nennt seinen Grund. Für die übrigen 31 Einträge
  // rechnet die Auswahl selbst – sie zeigt sie ohnehin nur, wenn sie offen ist.
  const gewaehlt = PROGRESSIONS.find((p) => p.id === progId)!;
  const progGrund = selected && source === 'progression'
    ? unavailableReason(selected, gewaehlt, exercise)
    : null;

  // R11: Es gibt keine Sperre mehr – nur noch diesen Hinweis auf die nächste
  // Einheit. Er markiert, er verhindert nichts.
  const recommended = recommendedNext(progress);
  const recMode = selected && recommended?.keyId === selected.id ? recommended.mode : null;

  // B-16: Die gewählte Einheit – Stufen-Modus oder Akkordfolge in dieser Tonart.
  const unit: UnitRef | null = selected
    ? (source === 'stufen' ? stufenUnit(selected.id, mode) : folgenUnit(selected.id, progId))
    : null;
  // Tempo-Level aus dem Fortschritt; Slider kann darüber/darunter (freies Tempo).
  // Es kommt für alle Quellen aus dem Speicher – auch für Modus C (AK 4).
  const stand = unit ? getStand(progress, unit) : { tempo: START_TEMPO, done: false };
  const levelTempo = stand.tempo;
  const effectiveTempo = tempoOverride ?? levelTempo;
  // „Freies Tempo" heißt: der Regler steht bewusst neben dem Level (B-15 AK 3).
  const freiesTempo = tempoOverride !== null && tempoOverride !== levelTempo;

  // Jede Wahl, die die Einheit wechselt, gibt den Regler frei.
  const chooseKey = (k: KeyDef) => { setSelected(k); setTempoOverride(null); };
  const chooseSource = (s: 'stufen' | 'progression') => { setSource(s); setTempoOverride(null); };
  const chooseMode = (m: DictateMode) => { setMode(m); setTempoOverride(null); };
  const chooseProg = (id: string) => { setProgId(id); setTempoOverride(null); };

  const start = () => {
    if (!selected || progGrund) return;
    // R18: Der AudioContext entsteht genau hier – im Klick-Handler von
    // „Einheit starten" – und wird an die Session durchgereicht. Später ist die
    // Nutzergeste vorbei und der Kontext bliebe auf Tablets `suspended`.
    const audio = openAudio();
    onStart({
      exercise, keyId: selected.id, source, mode, progressionId: progId,
      tolerance, errorMode, levelTempo, anchor, initialTempo: effectiveTempo,
    }, audio);
  };

  return (
    <div className="home">
      <section className="home-intro">
        <h2>Stufenplan</h2>
        <p>
          Fünf Stufen entlang des Quintenzirkels – jede bringt genau ein neues Vorzeichen.
          Eine Stufe gilt als geschafft, wenn beide Tonarten in <em>Modus A</em> und <em>Modus B</em>{' '}
          bei {TARGET_TEMPO} bpm je {PASS_STREAK} fehlerfreie Wiederholungen in Folge stehen.
          Spielbar ist jede Tonart jederzeit; der Plan empfiehlt die nächste Einheit, er sperrt nichts.
        </p>
      </section>

      <div className="stage-grid">
        {stages.map((s) => {
          const complete = isStageComplete(progress, s);
          const recStage = recommended?.stage === s;
          return (
            <div key={s} className={`stage ${complete ? 'complete' : ''} ${recStage ? 'recommended' : ''}`}>
              <div className="stage-head">
                <span className="stage-num" style={{ color: complete ? COLORS.green : recStage ? COLORS.amber : COLORS.dim }}>
                  Stufe {s}
                </span>
                {complete && <span className="stage-lock">✓</span>}
              </div>
              <div className="stage-keys">
                {KEYS.filter((k) => k.stage === s).map((k) => {
                  const recKey = recommended?.keyId === k.id;
                  return (
                    <button
                      key={k.id}
                      className={`key-card ${selected?.id === k.id ? 'selected' : ''} ${recKey ? 'recommended' : ''}`}
                      onClick={() => chooseKey(k)}
                    >
                      <span className="key-name">{k.label}</span>
                      <span className="key-acc">{k.accidentals}</span>
                      <span className="key-badges">
                        {(['A', 'B', 'C'] as DictateMode[]).map((m) => {
                          const st = getStand(progress, stufenUnit(k.id, m));
                          return <em key={m} className={st.done ? 'done' : ''}>{m} {st.done ? '✓' : st.tempo}</em>;
                        })}
                      </span>
                      {recKey && <span className="key-rec">empfohlen · Modus {recommended.mode}</span>}
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
              <button className={source === 'stufen' ? 'active' : ''} onClick={() => chooseSource('stufen')}>Stufen</button>
              <button className={source === 'progression' ? 'active' : ''} onClick={() => chooseSource('progression')}>Akkordfolge</button>
            </div>
          </div>

          {source === 'stufen' ? (
            <div className="setup-row">
              <span className="setup-label">Modus</span>
              <div className="setup-opts">
                {(['A', 'B', 'C'] as DictateMode[]).map((m) => (
                  <button
                    key={m}
                    className={`${mode === m ? 'active' : ''} ${recMode === m ? 'recommended' : ''}`}
                    onClick={() => chooseMode(m)}
                    title={recMode === m ? 'Empfohlene nächste Einheit' : ''}
                  >
                    {m} · {MODE_LABELS[m]}
                  </button>
                ))}
                {recMode && <span className="setup-hint">empfohlen: Modus {recMode}</span>}
              </div>
            </div>
          ) : (
            <div className="setup-row">
              <span className="setup-label">Folge</span>
              {/* B-22: Die gewählte Folge steht hier mit allen fünf Angaben; die
                  übrigen 31 liegen in der Auswahl – ein Tippen entfernt. */}
              <div className="setup-opts">
                <button className="prog-current active" onClick={() => setAuswahlOffen(true)}>
                  <span className="prog-name">{gewaehlt.name}</span>
                  <span className="prog-degrees">{stufenketteText(gewaehlt, selected.mode)}</span>
                </button>
                <span className="prog-flags">
                  <em className={`prog-ue2 ${gewaehlt.uebung2 ? '' : 'off'}`}>{gewaehlt.uebung2 ? 'Ü2' : 'Ü2 –'}</em>
                  <em className={`prog-stand ${stand.done ? 'done' : ''}`}>
                    {stand.done ? `✓ ${TARGET_TEMPO} bpm` : `${stand.tempo} bpm`}
                  </em>
                </span>
                <button className="brief-btn" onClick={() => setBrief({ kind: 'prog', progId: gewaehlt.id })}>ⓘ</button>
                <button onClick={() => setAuswahlOffen(true)}>Auswahl · {PROGRESSIONS.length} Folgen</button>
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
              {freiesTempo && (
                <span className="tempo-hint">freies Tempo · Fortschritt zählt auf Level {levelTempo} bpm</span>
              )}
            </div>
          </div>

          {/* R12.2: Die Lage ist die Anker-Oktave der Einheit – Ausgangspunkt ist die
              Tonika in dieser Oktave, alle Stufen werden von dort aufwärts gebaut. */}
          <div className="setup-row">
            <span className="setup-label">Lage</span>
            <div className="setup-opts">
              {ANCHORS.map((a) => (
                <button key={a} className={anchor === a ? 'active' : ''} onClick={() => setAnchor(a)}>
                  {anchorLabel(a)}
                </button>
              ))}
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

          {progGrund && (
            <p className="setup-hint">Diese Folge ist hier nicht verfügbar: {progGrund}</p>
          )}

          <button className="start-btn" onClick={start} disabled={progGrund !== null}>
            Einheit starten · {effectiveTempo} bpm
          </button>
        </section>
      )}

      {auswahlOffen && selected && (
        <FolgenAuswahl
          keyDef={selected}
          exercise={exercise}
          progress={progress}
          aktiv={progId}
          onPick={(id) => { chooseProg(id); setAuswahlOffen(false); }}
          onBrief={(id) => setBrief({ kind: 'prog', progId: id })}
          onClose={() => setAuswahlOffen(false)}
        />
      )}

      {brief?.kind === 'key' && brief.key && (
        <BriefOverlay title={`Steckbrief: ${brief.key.label}`} onClose={() => setBrief(null)}>
          <KeyBrief k={brief.key} anchor={anchor} />
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
