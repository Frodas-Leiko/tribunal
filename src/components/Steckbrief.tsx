// ── Steckbrief-Dialoge: Tonarten, Akkordfolgen, Timing-Trainings ────────────

import type { ReactNode } from 'react';
import { COLORS } from './Visuals';
import { midiName, pcName, type KeyDef, type ProgressionDef, TIMING_BRIEFS } from '@/lib/music';
import { anchorLabel } from '@/lib/staff';

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

export function KeyBrief({ k, anchor }: { k: KeyDef; anchor: number }) {
  return (
    <>
      <Row k="Tonart" v={`${k.label} · Vorzeichen: ${k.accidentals}`} />
      {/* R12.5: Die Lage gehört zur Einheit und steht im Steckbrief – zusammen mit
          dem Ton, den die Hand tatsächlich als Tonika greift. */}
      <Row k="Lage" v={`${anchorLabel(anchor)} · Tonika ${midiName(anchor + k.tonic)} · alle Stufen aufwärts von dort`} />
      <Row k="Tonleiter" v={[...k.scale, k.tonic].map(pcName).join(' – ')} />
      <Row k="Fingersatz Tonleiter" v={k.fingeringScale} />
      <Row k="Fingersatz Dreiklänge" v="Rechte Hand: 1–3–5 (Daumen–Mittelfinger–kleiner Finger), Grundstellung. Die Mulde wird als Ganzes geformt – nie Finger für Finger suchen." />
      <Row k="Stolperstelle" v={k.pitfalls} />
      <Row k="Einordnung" v={k.description} />
    </>
  );
}

export function ProgressionBrief({ p, mode }: { p: ProgressionDef; mode: 'dur' | 'moll' }) {
  // B-20: `null` heißt „in diesem Tongeschlecht bewusst nicht angeboten". Der
  // Steckbrief sagt das, statt die Zeile leer zu lassen.
  const degrees = p.degrees[mode];
  const andere = mode === 'dur' ? 'Moll' : 'Dur';
  return (
    <>
      <Row k="Stufen" v={degrees ? degrees.join(' → ') : `In ${mode === 'dur' ? 'Dur' : 'Moll'} nicht angeboten – diese Folge gibt es nur in ${andere}.`} />
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
