// ── Visuelle Kernmodule: Zonen-System, Topographie, Subdivisions, Tribunal ──

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SpelledNote, Zone } from '@/lib/staff';
import { staffY, TOP_LINE, BOTTOM_LINE } from '@/lib/staff';
import type { Feedback } from '@/lib/engine';
import type { ClockRef } from '@/lib/engine';

export const COLORS = {
  bg: '#1c1f24',
  panel: '#23272e',
  line: '#3a4048',
  text: '#e8e6e1',
  dim: '#9aa0a8',
  amber: '#e8a33d',
  green: '#3fce7a',
  red: '#e5484d',
};

// ── Notensystem mit Zonen (Übung 2) ─────────────────────────────────────────

export function Staff({ spelled, zoneGlow }: { spelled: SpelledNote[]; zoneGlow: Zone | null }) {
  const W = 640, H = 240;
  const lineGap = 18;
  const topLineY = 100;
  const zoneY = {
    zenit: { y: topLineY - 4.5 * lineGap, h: 4 * lineGap },
    zentrum: { y: topLineY - 0.5 * lineGap, h: 5 * lineGap },
    nadir: { y: topLineY + 4.5 * lineGap, h: 4 * lineGap },
  };
  const zoneLabel: Record<Zone, string> = { zenit: 'ZENIT', zentrum: 'ZENTRUM', nadir: 'NADIR' };

  // Hilfslinien durch Notenköpfe außerhalb des Systems
  const ledger: number[] = [];
  spelled.forEach((n) => {
    const d = n.diatonic;
    for (let l = TOP_LINE + 2; l <= d; l += 2) ledger.push(l);
    for (let l = BOTTOM_LINE - 2; l >= d; l -= 2) ledger.push(l);
  });

  const x0 = 300; // Block-Position
  const noteX = (i: number) => x0 + i * 2 - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
      {/* Zonen */}
      {(Object.keys(zoneY) as Zone[]).map((z) => (
        <g key={z}>
          <rect
            x={60} y={zoneY[z].y} width={W - 120} height={zoneY[z].h}
            fill={zoneGlow === z ? COLORS.amber : '#ffffff'}
            opacity={zoneGlow === z ? 0.14 : z === 'zentrum' ? 0.045 : 0.025}
            rx={4}
            style={{ transition: 'opacity 200ms, fill 200ms' }}
          />
          <text x={70} y={zoneY[z].y + 14} fontSize={10} fill={zoneGlow === z ? COLORS.amber : COLORS.dim}
            opacity={0.9} fontFamily="Oswald, sans-serif" letterSpacing={3}>
            {zoneLabel[z]}
          </text>
        </g>
      ))}
      {/* 5 Linien */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={60} x2={W - 60} y1={topLineY + i * lineGap} y2={topLineY + i * lineGap}
          stroke={COLORS.line} strokeWidth={1.5} />
      ))}
      {/* Hilfslinien */}
      {[...new Set(ledger)].map((d) => (
        <line key={d} x1={x0 - 26} x2={x0 + 30} y1={staffY(d, topLineY, lineGap)} y2={staffY(d, topLineY, lineGap)}
          stroke={COLORS.line} strokeWidth={1.5} />
      ))}
      {/* Akkord-Block: Klammer + Notenköpfe */}
      {spelled.length > 0 && (
        <g>
          {(() => {
            const ys = spelled.map((n) => staffY(n.diatonic, topLineY, lineGap));
            const top = Math.min(...ys) - 16, bot = Math.max(...ys) + 16;
            return (
              <path d={`M ${x0 - 34} ${top} h 8 M ${x0 - 34} ${top} v ${bot - top} M ${x0 - 34} ${bot} h 8`}
                stroke={COLORS.amber} strokeWidth={2.5} fill="none" />
            );
          })()}
          {spelled.map((n, i) => {
            const y = staffY(n.diatonic, topLineY, lineGap);
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

export function Topography({ rootMidi }: { rootMidi: number | null }) {
  const W = 640, H = 64;
  const octaves = 2;
  const startMidi = 60; // C4
  // Schwarze Tasten: Halbtöne 1,3 (2er) und 6,8,10 (3er)
  const blackPc = [1, 3, 6, 8, 10];
  const ridges: { x: number; group: number }[] = [];
  for (let o = 0; o < octaves; o++) {
    blackPc.forEach((pc, i) => {
      const pos = o * 12 + pc + 0.5;
      ridges.push({ x: (pos / (12 * octaves)) * W, group: i < 2 ? 2 : 3 });
    });
  }
  const markerX = rootMidi !== null ? ((rootMidi - startMidi + 0.5) / (12 * octaves)) * W : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 64 }}>
      <line x1={0} x2={W} y1={H - 10} y2={H - 10} stroke={COLORS.line} strokeWidth={1.5} />
      {ridges.map((r, i) => {
        // Gruppen-Anfang markieren (2er/3er-Insel als Relief)
        const isGroupStart = i % 5 === 0 || i % 5 === 2;
        return (
          <g key={i}>
            <rect x={r.x - 7} y={14} width={14} height={H - 24} rx={4}
              fill={isGroupStart ? '#2e343d' : '#272c33'} stroke={COLORS.line} strokeWidth={1} />
          </g>
        );
      })}
      {markerX !== null && markerX >= 0 && markerX <= W && (
        <g className="topo-marker">
          <circle cx={markerX} cy={H - 18} r={7} fill={COLORS.amber} opacity={0.35}>
            <animate attributeName="r" values="7;13;7" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0.08;0.35" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={markerX} cy={H - 18} r={4} fill={COLORS.amber} />
        </g>
      )}
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
  const [, force] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const loop = () => {
      force((n) => n + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const c = clockRef.current;
  const labels = exercise === 1 ? ['1', 'e', 'und', 'a'] : ['1', '·', '2'];
  const subs = exercise === 1 ? 4 : 3;

  // Cursor läuft in der performance.now-Domäne (ClockRef ist bereits kalibriert).
  const nowApprox = performance.now() / 1000;
  const segPos = c.active && c.segDur > 0 ? Math.min(1.2, Math.max(0, (nowApprox - c.segStartPerf) / c.segDur)) : 0;

  const W = 640, H = 88;
  const segW = W / subs;
  const beatProgress = (c.segInBeat + Math.min(1, segPos)) / subs;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 88 }}>
      {/* Segmente */}
      {Array.from({ length: subs }).map((_, i) => {
        const isBeat = i === 0;
        return (
          <g key={i}>
            <rect x={i * segW + 2} y={10} width={segW - 4} height={isBeat ? 34 : 34} rx={4}
              fill={isBeat ? COLORS.amber : '#272c33'}
              opacity={isBeat ? (c.segInBeat === 0 ? 0.95 : 0.55) : 1}
              stroke={COLORS.line} strokeWidth={1} />
            {!isBeat && c.segInBeat === i && (
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
      {c.active && (
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

export const tribunalStyle: CSSProperties = {};
