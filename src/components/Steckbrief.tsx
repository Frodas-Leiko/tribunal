// ── Steckbrief-Dialoge: Tonarten, Akkordfolgen, Timing-Trainings ────────────

import type { ReactNode } from 'react';
import { COLORS } from './Visuals';
import { pcName, type KeyDef, type ProgressionDef, TIMING_BRIEFS } from '@/lib/music';

export function BriefOverlay({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="brief-backdrop" onClick={onClose}>
      <div className="brief-panel" onClick={(e) => e.stopPropagation()}>
        <div className="brief-head">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="brief-body">{children}</div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="brief-row">
      <span style={{ color: COLORS.amber }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

export function KeyBrief({ k }: { k: KeyDef }) {
  return (
    <>
      <Row k="Tonart" v={`${k.label} · Vorzeichen: ${k.accidentals}`} />
      <Row k="Tonleiter" v={[...k.scale, k.tonic].map(pcName).join(' – ')} />
      <Row k="Fingersatz Tonleiter" v={k.fingeringScale} />
      <Row k="Fingersatz Dreiklänge" v="Rechte Hand: 1–3–5 (Daumen–Mittelfinger–kleiner Finger), Grundstellung. Die Mulde wird als Ganzes geformt – nie Finger für Finger suchen." />
      <Row k="Stolperstelle" v={k.pitfalls} />
      <Row k="Einordnung" v={k.description} />
    </>
  );
}

export function ProgressionBrief({ p, mode }: { p: ProgressionDef; mode: 'dur' | 'moll' }) {
  return (
    <>
      <Row k="Stufen" v={p.degrees[mode].join(' → ')} />
      <Row k="Funktion" v={p.logic} />
      <Row k="Fingersatz" v={p.fingeringHint} />
    </>
  );
}

export function TimingBrief({ exercise }: { exercise: 1 | 2 }) {
  const b = exercise === 1 ? TIMING_BRIEFS.uebung1 : TIMING_BRIEFS.uebung2;
  return (
    <>
      <Row k="Zählweise" v={b.counting} />
      <Row k="Messung" v={b.measured} />
      <Row k="Toleranz" v={b.tolerance} />
      <Row k="Übungstipp" v={b.tip} />
    </>
  );
}
