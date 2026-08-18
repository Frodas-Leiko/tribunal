// ── Visuelle Kernmodule: Zonen-System, Topographie, Subdivisions, Tribunal ──

import { useEffect, useRef, useState } from 'react';
import type { SpelledNote, Zone } from '@/lib/staff';
import {
  BOTTOM_LINE, TOP_LINE, ZONE_SHIFT, staffLayout, topographyRange, zoneOf,
} from '@/lib/staff';
import type { Feedback } from '@/lib/engine';
import type { ClockRef } from '@/lib/engine';
import { COLORS } from './colors';

// ── Notensystem mit Zonen (Übung 2) ─────────────────────────────────────────

export function Staff({ spelled, zone, frame }: {
  spelled: SpelledNote[];
  zone: Zone;
  frame: { lo: number; hi: number };
}) {
  // Die Zonenbänder folgen dem unverschobenen Block: dieselbe Griffmulde, dreimal
  // um je eine Oktave versetzt (R12.4). `zone` sagt, wo der gezeichnete Block steht.
  const shift = ZONE_SHIFT[zone];
  const base = spelled.length > 0
    ? { lo: Math.min(...spelled.map((n) => n.diatonic)) - 7 * shift,
        hi: Math.max(...spelled.map((n) => n.diatonic)) - 7 * shift }
    : { lo: frame.lo, hi: frame.lo + 4 }; // solange kein Ziel steht: Tonika-Dreiklang
  const L = staffLayout(base, frame);
  const zoneLabel: Record<Zone, string> = { zenit: 'ZENIT', zentrum: 'ZENTRUM', nadir: 'NADIR' };

  // Hilfslinien durch Notenköpfe außerhalb des Systems – `zoneOf` beschreibt hier
  // die einzelne Note, nicht den Block (B-10 AK 3).
  const ledger: number[] = [];
  spelled.forEach((n) => {
    if (zoneOf(n.diatonic) === 'zentrum') return;
    for (let l = TOP_LINE + 2; l <= n.diatonic; l += 2) ledger.push(l);
    for (let l = BOTTOM_LINE - 2; l >= n.diatonic; l -= 2) ledger.push(l);
  });

  const x0 = 300; // Block-Position
  const noteX = (i: number) => x0 + i * 2 - 2;

  return (
    <svg viewBox={`0 0 ${L.width} ${L.height}`} className="w-full" style={{ maxHeight: 240 }}>
      {/* Zonen – die Zielzone leuchtet, und genau dort steht der Block (B-10) */}
      {(Object.keys(L.zones) as Zone[]).map((z) => (
        <g key={z}>
          <rect
            x={60} y={L.zones[z].y} width={L.width - 120} height={L.zones[z].h}
            fill={zone === z ? COLORS.amber : '#ffffff'}
            opacity={zone === z ? 0.14 : 0.03}
            rx={4}
            style={{ transition: 'opacity 200ms, fill 200ms' }}
          />
          <text x={70} y={L.zones[z].y + 14} fontSize={10} fill={zone === z ? COLORS.amber : COLORS.dim}
            opacity={0.9} fontFamily="Oswald, sans-serif" letterSpacing={3}>
            {zoneLabel[z]}
          </text>
        </g>
      ))}
      {/* 5 Linien */}
      {L.lines.map((y, i) => (
        <line key={i} x1={60} x2={L.width - 60} y1={y} y2={y} stroke={COLORS.line} strokeWidth={1.5} />
      ))}
      {/* Hilfslinien */}
      {[...new Set(ledger)].map((d) => (
        <line key={d} x1={x0 - 26} x2={x0 + 30} y1={L.y(d)} y2={L.y(d)}
          stroke={COLORS.line} strokeWidth={1.5} />
      ))}
      {/* Akkord-Block: Klammer + Notenköpfe */}
      {spelled.length > 0 && (
        <g>
          {(() => {
            const ys = spelled.map((n) => L.y(n.diatonic));
            const top = Math.min(...ys) - 12, bot = Math.max(...ys) + 12;
            return (
              <path d={`M ${x0 - 34} ${top} h 8 M ${x0 - 34} ${top} v ${bot - top} M ${x0 - 34} ${bot} h 8`}
                stroke={COLORS.amber} strokeWidth={2.5} fill="none" />
            );
          })()}
          {spelled.map((n, i) => {
            const y = L.y(n.diatonic);
            // Sekunden seitlich versetzen (hier Terzen → keine Verschiebung nötig, aber robust)
            const x = noteX(i);
            return (
              <g key={i}>
                {n.accidental !== 0 && (
                  <text x={x - 24} y={y + 5} fontSize={18} fill={COLORS.text} textAnchor="middle">
                    {n.accidental === 1 ? '♯' : '♭'}
                  </text>
                )}
                <ellipse cx={x} cy={y} rx={9} ry={6.5} fill={COLORS.text}
                  transform={`rotate(-12 ${x} ${y})`} />
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

// ── Topographie-Karte: Inseln der schwarzen Tasten ──────────────────────────

export function Topography({ notes, anchor, tonic }: { notes: number[]; anchor: number; tonic: number }) {
  const W = 640, H = 74;
  const { start, end } = topographyRange(anchor, tonic);
  const span = end - start;
  const x = (midi: number) => ((midi - start + 0.5) / span) * W;
  const step = W / span;

  // Inselgruppen: 2er (Cis–Dis) und 3er (Fis–Gis–Ais) je Oktave. Sie sind der
  // eigentliche Inhalt der Karte – die Hand ertastet Gruppen, keine Einzeltasten (R1).
  const islands: { from: number; to: number; keys: number[] }[] = [];
  for (let c = start; c < end; c += 12) {
    for (const keys of [[c + 1, c + 3], [c + 6, c + 8, c + 10]]) {
      const drin = keys.filter((k) => k <= end);
      if (drin.length > 0) islands.push({ from: drin[0], to: drin[drin.length - 1], keys: drin });
    }
  }
  const ridgeW = Math.max(5, step * 0.6);
  const baseY = H - 12;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 74 }}>
      <line x1={0} x2={W} y1={baseY} y2={baseY} stroke={COLORS.line} strokeWidth={1.5} />
      {islands.map((isle) => (
        <g key={isle.from}>
          {/* Sockel der Insel: macht 2er und 3er als Gruppen unterscheidbar */}
          <rect
            x={x(isle.from) - ridgeW / 2 - 3} y={8}
            width={x(isle.to) - x(isle.from) + ridgeW + 6} height={baseY - 12}
            rx={6} fill="#2b313a" stroke={COLORS.line} strokeWidth={1}
          />
          {isle.keys.map((k) => (
            <rect key={k} x={x(k) - ridgeW / 2} y={12} width={ridgeW} height={baseY - 20}
              rx={3} fill="#1c1f24" opacity={0.85} />
          ))}
        </g>
      ))}
      {/* Oktav-Orientierung: nur Text, keine Klaviatur (R1) */}
      {Array.from({ length: Math.floor(span / 12) + 1 }, (_, i) => start + i * 12)
        .filter((c) => c <= end)
        .map((c) => (
          <text key={c} x={x(c)} y={H - 1} fontSize={9} fill={COLORS.dim} textAnchor="middle"
            fontFamily="Oswald, sans-serif">
            {`C${c / 12 - 1}`}
          </text>
        ))}
      {/* Die ganze Griffmulde, der Grundton hervorgehoben (Konzept §4.3) */}
      {notes.map((midi, i) => {
        if (midi < start || midi > end) return null;
        const cx = x(midi);
        const istGrundton = i === 0;
        return istGrundton ? (
          <g key={midi} className="topo-marker">
            <circle cx={cx} cy={baseY - 8} r={7} fill={COLORS.amber} opacity={0.35}>
              <animate attributeName="r" values="7;13;7" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0.08;0.35" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={cx} cy={baseY - 8} r={5} fill={COLORS.amber} />
          </g>
        ) : (
          <circle key={midi} cx={cx} cy={baseY - 8} r={3.5} fill={COLORS.amber} opacity={0.55} />
        );
      })}
    </svg>
  );
}

// ── Subdivisions-Balken mit Cursor + Timing-Drift ───────────────────────────

export function SubdivisionBar({ clockRef, offsets, tolerance, exercise }: {
  clockRef: React.RefObject<ClockRef>;
  offsets: number[];
  tolerance: number;
  exercise: 1 | 2;
}) {
  // Uhr und Cursorstand werden in der Bildschirmschleife gelesen und als Zustand
  // gehalten; der Rumpf bleibt rein. Vorher standen `performance.now()` und
  // `clockRef.current` mitten im Rendern – beides macht das Ergebnis vom Zeitpunkt
  // des Renderns abhängig. Die Schleife erzwang ohnehin jeden Bildschirmrahmen ein
  // neues Rendern; sie trägt den Messwert jetzt mit, statt einen Zähler hochzuzählen.
  // Die Zeitdomäne bleibt dieselbe: die kalibrierte `performance.now`-Domäne aus R19,
  // in Sekunden wie `ClockRef`.
  const [cursor, setCursor] = useState({ active: false, segPos: 0, segInBeat: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    const loop = () => {
      const c = clockRef.current;
      const nowSec = performance.now() / 1000;
      setCursor({
        active: c.active,
        segPos: c.active && c.segDur > 0
          ? Math.min(1.2, Math.max(0, (nowSec - c.segStartPerf) / c.segDur))
          : 0,
        segInBeat: c.segInBeat,
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [clockRef]);

  const labels = exercise === 1 ? ['1', 'e', 'und', 'a'] : ['1', '·', '2'];
  const subs = exercise === 1 ? 4 : 3;
  const { active, segPos, segInBeat } = cursor;

  const W = 640, H = 88;
  const segW = W / subs;
  const beatProgress = (segInBeat + Math.min(1, segPos)) / subs;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 88 }}>
      {/* Segmente */}
      {Array.from({ length: subs }).map((_, i) => {
        const isBeat = i === 0;
        return (
          <g key={i}>
            <rect x={i * segW + 2} y={10} width={segW - 4} height={isBeat ? 34 : 34} rx={4}
              fill={isBeat ? COLORS.amber : '#272c33'}
              opacity={isBeat ? (segInBeat === 0 ? 0.95 : 0.55) : 1}
              stroke={COLORS.line} strokeWidth={1} />
            {!isBeat && segInBeat === i && (
              <rect x={i * segW + 2} y={10} width={(segW - 4) * Math.min(1, segPos)} height={34} rx={4}
                fill={COLORS.amber} opacity={0.25} />
            )}
            <text x={i * segW + segW / 2} y={32} textAnchor="middle" fontSize={isBeat ? 17 : 13}
              fontFamily="Oswald, sans-serif"
              fill={isBeat ? '#1c1f24' : COLORS.dim} fontWeight={600}>
              {labels[i]}
            </text>
          </g>
        );
      })}
      {/* Cursor */}
      {active && (
        <line x1={beatProgress * W} x2={beatProgress * W} y1={4} y2={50}
          stroke={COLORS.amber} strokeWidth={2.5} />
      )}
      {/* Drift-Linie: letzte Offsets als Punkte (Mitte = perfekt) */}
      <line x1={0} x2={W} y1={66} y2={66} stroke={COLORS.line} strokeWidth={1} />
      <line x1={W / 2} x2={W / 2} y1={58} y2={74} stroke={COLORS.dim} strokeWidth={1} />
      {offsets.map((o, i) => {
        const clamped = Math.max(-120, Math.min(120, o));
        const x = W / 2 + (clamped / 120) * (W / 2 - 20);
        const inTol = Math.abs(o) <= tolerance;
        return <circle key={i} cx={x} cy={66} r={4} fill={inTol ? COLORS.green : COLORS.red} opacity={0.4 + (i / offsets.length) * 0.6} />;
      })}
      <text x={4} y={70} fontSize={9} fill={COLORS.dim} fontFamily="Oswald, sans-serif">ZU FRÜH</text>
      <text x={W - 4} y={70} fontSize={9} fill={COLORS.dim} textAnchor="end" fontFamily="Oswald, sans-serif">ZU SPÄT</text>
    </svg>
  );
}

// ── Tribunal-Anzeige ────────────────────────────────────────────────────────

export function Tribunal({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) {
    return (
      <div className="tribunal" style={{ borderColor: COLORS.line }}>
        <div className="tribunal-big" style={{ color: COLORS.dim }}>Bereit</div>
        <div className="tribunal-small">Warte auf den ersten Anschlag …</div>
      </div>
    );
  }
  const color = feedback.kind === 'ok' ? COLORS.green
    : feedback.kind === 'timing' || feedback.kind === 'info' ? COLORS.amber
    : COLORS.red;
  return (
    <div className="tribunal" style={{ borderColor: color }}>
      <div className="tribunal-big" style={{ color }}>{feedback.big}</div>
      <div className="tribunal-small">{feedback.small}</div>
    </div>
  );
}
