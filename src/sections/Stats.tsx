// ── Statistik: Die Akte des Tribunals ────────────────────────────────────────

import { useState } from 'react';
import { loadStats, resetAll } from '@/lib/store';
import { COLORS } from '@/components/Visuals';

export function Stats({ onReset }: { onReset: () => void }) {
  const [stats, setStats] = useState(loadStats());
  const [confirm, setConfirm] = useState(false);

  const accuracy = stats.attempts > 0 ? Math.round((stats.hits / stats.attempts) * 100) : 0;

  const errors = Object.entries(stats.errors)
    .map(([k, v]) => {
      const [keyId, chord] = k.split('|');
      return { keyId, chord, ...v };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 14);

  const maxErr = Math.max(1, ...errors.map((e) => e.total));

  const timings = Object.entries(stats.timing).map(([keyId, arr]) => {
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const spread = arr.length ? Math.sqrt(arr.reduce((a, b) => a + (b - avg) ** 2, 0) / arr.length) : 0;
    return { keyId, avg: Math.round(avg), spread: Math.round(spread), n: arr.length };
  });

  return (
    <div className="stats">
      <h2>Statistik</h2>
      <p className="stats-note">Alle Daten bleiben lokal auf diesem Gerät (Browser-Speicher). Kein Konto, kein Server.</p>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-num">{stats.attempts}</div>
          <div className="stat-label">Gemessene Anschläge</div>
        </div>
        <div className="stat-card">
          <div className="stat-num" style={{ color: accuracy >= 80 ? COLORS.green : accuracy >= 50 ? COLORS.amber : COLORS.red }}>
            {accuracy}%
          </div>
          <div className="stat-label">Trefferquote (Ton + Zeit)</div>
        </div>
      </div>

      <h3>Fehler-Heatmap (Akkorde)</h3>
      {errors.length === 0 && <p className="stats-note">Noch keine Fehler gemessen – das Tribunal führt noch keine Akte.</p>}
      <div className="err-list">
        {errors.map((e) => (
          <div key={`${e.keyId}|${e.chord}`} className="err-row">
            <span className="err-name">{e.chord} <em>({e.keyId})</em></span>
            <div className="err-bar-wrap">
              <div className="err-bar" style={{ width: `${(e.total / maxErr) * 100}%`, background: COLORS.red }} />
            </div>
            <span className="err-count">{e.total}× · ↑{e.high} ↓{e.low}</span>
          </div>
        ))}
      </div>

      <h3>Timing-Drift (pro Tonart)</h3>
      {timings.length === 0 && <p className="stats-note">Noch keine Timing-Daten.</p>}
      <div className="err-list">
        {timings.map((t) => (
          <div key={t.keyId} className="err-row">
            <span className="err-name">{t.keyId}</span>
            <span className="err-count" style={{ color: Math.abs(t.avg) <= 30 ? COLORS.green : COLORS.amber }}>
              Ø {t.avg > 0 ? '+' : ''}{t.avg} ms {t.avg > 0 ? '(zu spät)' : t.avg < 0 ? '(zu früh)' : ''} · Streuung ±{t.spread} ms · {t.n} Schläge
            </span>
          </div>
        ))}
      </div>

      <div className="stats-danger">
        {!confirm ? (
          <button className="danger-btn" onClick={() => setConfirm(true)}>Fortschritt & Statistik zurücksetzen</button>
        ) : (
          <span>
            Wirklich alles löschen?{' '}
            <button className="danger-btn" onClick={() => { resetAll(); setStats(loadStats()); setConfirm(false); onReset(); }}>Ja, löschen</button>
            <button className="demo-btn" onClick={() => setConfirm(false)}>Abbrechen</button>
          </span>
        )}
      </div>
    </div>
  );
}
