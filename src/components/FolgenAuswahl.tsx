// ── Auswahl der 32 Akkordfolgen (B-22) ──────────────────────────────────────
// Die Auswahl öffnet sich als eigene Fläche, statt die Setup-Karte zu fluten:
// 32 Einträge als flache Chip-Reihe wären eine Bleiwüste, und das Querformat –
// der einzige gestaltete Zustand (R6) – scrollte weg. Innerhalb der Liste darf
// gescrollt werden, die Seite nicht (AK 4, `useScrollLock`).

import { useState } from 'react';
import { unavailableReason, type KeyDef, type ProgressionDef } from '@/lib/music';
import { TARGET_TEMPO, folgenUnit, getStand, type Progress } from '@/lib/store';
import { FILTER, auswahlGruppen, filterLabel, stufenketteText, type Filter } from '@/lib/progression-view';
import { useScrollLock } from './scroll-lock';

function Eintrag({ p, keyDef, exercise, progress, aktiv, onPick, onBrief }: {
  p: ProgressionDef;
  keyDef: KeyDef;
  exercise: 1 | 2;
  progress: Progress;
  aktiv: boolean;
  onPick: (id: string) => void;
  onBrief: (id: string) => void;
}) {
  // B-20/B-21: Nicht jede Folge passt zu jeder Einheit. Kein Verstecken und keine
  // Sperre nach R11 – der Eintrag bleibt sichtbar, ausgegraut und mit Grund (R16).
  const grund = unavailableReason(keyDef, p, exercise);
  const stand = getStand(progress, folgenUnit(keyDef.id, p.id));
  return (
    <div
      className={`prog-entry ${aktiv ? 'selected' : ''} ${grund ? 'unavailable' : ''}`}
      data-prog-id={p.id}
    >
      <button className="prog-entry-main" onClick={() => onPick(p.id)} disabled={grund !== null} title={grund ?? ''}>
        <span className="prog-name">{p.name}</span>
        {/* AK 3: die Stufenkette im aktiven Tongeschlecht. */}
        <span className="prog-degrees">{stufenketteText(p, keyDef.mode)}</span>
        <span className="prog-flags">
          {/* AK 3: Ü2-Kennzeichen – Struktur, also grau (R8). */}
          <em
            className={`prog-ue2 ${p.uebung2 ? '' : 'off'}`}
            title={p.uebung2 ? 'Für Übung 2 (Systemsprung) freigegeben' : 'Zu lang für Übung 2 – nur Übung 1'}
          >
            {p.uebung2 ? 'Ü2' : 'Ü2 –'}
          </em>
          {/* AK 3: Stand aus B-16 – Messwert, kein Abzeichen (R5). */}
          <em className={`prog-stand ${stand.done ? 'done' : ''}`}>
            {stand.done ? `✓ ${TARGET_TEMPO} bpm` : `${stand.tempo} bpm`}
          </em>
          {grund && <em className="prog-unavailable">{grund}</em>}
        </span>
      </button>
      {/* AK 3: Steckbrief-Symbol – auch für nicht verfügbare Folgen lesbar. */}
      <button className="brief-btn prog-brief" onClick={() => onBrief(p.id)} aria-label={`Steckbrief: ${p.name}`}>
        ⓘ
      </button>
    </div>
  );
}

export function FolgenAuswahl({ keyDef, exercise, progress, aktiv, onPick, onBrief, onClose }: {
  keyDef: KeyDef;
  exercise: 1 | 2;
  progress: Progress;
  aktiv: string;
  onPick: (id: string) => void;
  onBrief: (id: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('alle');
  useScrollLock();
  const gruppen = auswahlGruppen(filter);

  return (
    <div className="auswahl-backdrop" onClick={onClose}>
      <div className="auswahl-panel" onClick={(e) => e.stopPropagation()}>
        <div className="auswahl-head">
          <h2>Akkordfolge · {keyDef.label} · Übung {exercise}</h2>
          <button onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        {/* AK 1: Der Filter ist eine Auswahl über die fünf Kategorien plus „alle" –
            kein Freitextfeld. Tippen ist im Setup erlaubt (R6). */}
        <div className="auswahl-filter">
          {FILTER.map((f) => (
            <button
              key={f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
              data-filter={f}
            >
              {filterLabel(f)}
            </button>
          ))}
        </div>

        <div className="auswahl-list">
          {gruppen.map((g) => (
            <section key={g.id} className="auswahl-gruppe" data-gruppe={g.id}>
              <h3>{g.label}</h3>
              <div className="auswahl-eintraege">
                {g.eintraege.map((p) => (
                  <Eintrag
                    key={p.id}
                    p={p}
                    keyDef={keyDef}
                    exercise={exercise}
                    progress={progress}
                    aktiv={aktiv === p.id}
                    onPick={onPick}
                    onBrief={onBrief}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
