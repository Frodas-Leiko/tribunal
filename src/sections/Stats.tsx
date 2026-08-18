// ── Statistik: Die Akte des Tribunals ────────────────────────────────────────

import { useState } from 'react';
import {
  chordTotals, fingerKey, loadProgress, loadStats, resetAll, FINGER_KEYS, SCHEMA_VERSION,
  type ChordError, type FingerKey, type LoadStatus, type SplitCount, type StatsData,
} from '@/lib/store';
import { FINGER_NAMES, INTERVAL_NAMES } from '@/lib/music';
import { COLORS } from '@/components/Visuals';

/** Namen der Datensätze, die beim Laden in diesem Zustand landeten. */
function recordsWith(target: LoadStatus, progress: LoadStatus, stats: LoadStatus): string[] {
  const out: string[] = [];
  if (progress === target) out.push('Fortschritt');
  if (stats === target) out.push('Statistik');
  return out;
}

/**
 * R25: Ein Schema-Bruch bleibt nicht stumm. Diese Zeile ist der Ort, an dem der
 * Nutzer erfährt, dass Standardwerte gelten – und dass nichts gelöscht wurde.
 */
function schemaNote(progress: LoadStatus, stats: LoadStatus): string | null {
  const broken = recordsWith('zurückgefallen', progress, stats);
  if (broken.length > 0) {
    return `${broken.join(' und ')}: Der gespeicherte Datensatz passt nicht zu Schema-Version ${SCHEMA_VERSION}. `
      + 'Es gelten Standardwerte. Die Rohdaten im Browser-Speicher sind unverändert; '
      + 'erst das nächste Speichern ersetzt sie.';
  }
  const migrated = recordsWith('migriert', progress, stats);
  if (migrated.length > 0) {
    return `${migrated.join(' und ')}: Datensatz einer älteren Fassung übernommen, jetzt Schema-Version ${SCHEMA_VERSION}.`;
  }
  return null;
}

/**
 * R26: Die Trefferquote zerfällt in zwei Messungen – der Griff und die Zeit.
 * Beide bekommen ihren Nenner dazu: Anschläge älterer Fassungen zählten beides
 * in einer Zahl und stehen deshalb in keinem der beiden Anteile (R4).
 */
function splitLine(split: SplitCount): string {
  const griff = split.attempts > 0
    ? `Griff ${Math.round((split.griffOk / split.attempts) * 100)} % (${split.griffOk}/${split.attempts})`
    : 'Griff – noch nicht getrennt gezählt';
  const zeit = split.timingMeasured > 0
    ? `Zeit ${Math.round((split.timingOk / split.timingMeasured) * 100)} % (${split.timingOk}/${split.timingMeasured})`
    : 'Zeit – noch nicht gemessen';
  return `${griff} · ${zeit}`;
}

/** Der Fachbegriff des Fingers (R2 klein). `ohne` bleibt, was es ist. */
function fingerLabel(k: FingerKey): string {
  return k === 'ohne' ? 'ohne Finger' : INTERVAL_NAMES[Number(k)];
}

function schnitt(halbtoene: number, gerichtet: number): string {
  return gerichtet > 0 ? ` · Ø ${(halbtoene / gerichtet).toFixed(1).replace('.', ',')} Halbtöne` : '';
}

/** R27: Die Zeile unter einem Akkord – welcher Finger wie oft und wie weit. */
function fingerRow(err: ChordError): string {
  const teile: string[] = [];
  for (const k of FINGER_KEYS) {
    const f = err[k];
    if (!f || f.total === 0) continue;
    teile.push(`${fingerLabel(k)} ${f.total}×${schnitt(f.halbtoene, f.high + f.low)}`);
  }
  return teile.join(' · ');
}

const FINGER_IDX = [0, 1, 2] as const;

/**
 * AK 2: Welcher Finger greift am häufigsten daneben – über alle Tonarten und
 * Akkorde, nicht nur über die gezeigten Zeilen. Urteile ohne Finger belasten
 * keinen Finger; sie zählen nur in der Gesamtzahl mit (R4).
 */
function fingerRanking(stats: StatsData) {
  const summen = FINGER_IDX.map((i) => {
    let total = 0;
    let halbtoene = 0;
    let gerichtet = 0;
    for (const err of Object.values(stats.errors)) {
      const f = err[fingerKey(i)];
      if (!f) continue;
      total += f.total;
      halbtoene += f.halbtoene;
      gerichtet += f.high + f.low;
    }
    return { i, total, halbtoene, gerichtet };
  });
  const gesamt = Object.values(stats.errors).reduce((n, e) => n + chordTotals(e).total, 0);
  const top = [...summen].sort((a, b) => b.total - a.total)[0];
  return top.total > 0 ? { top, gesamt } : null;
}

export function Stats({ onReset }: { onReset: () => void }) {
  const [loaded, setLoaded] = useState(() => ({ progress: loadProgress(), stats: loadStats() }));
  const [confirm, setConfirm] = useState(false);

  const stats = loaded.stats.data;
  const note = schemaNote(loaded.progress.status, loaded.stats.status);

  const accuracy = stats.attempts > 0 ? Math.round((stats.hits / stats.attempts) * 100) : 0;

  const errors = Object.entries(stats.errors)
    .map(([k, v]) => {
      const [keyId, chord] = k.split('|');
      return { keyId, chord, summe: chordTotals(v), finger: v };
    })
    .sort((a, b) => b.summe.total - a.summe.total)
    .slice(0, 14);

  const maxErr = Math.max(1, ...errors.map((e) => e.summe.total));
  const ranking = fingerRanking(stats);

  const timings = Object.entries(stats.timing).map(([keyId, arr]) => {
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const spread = arr.length ? Math.sqrt(arr.reduce((a, b) => a + (b - avg) ** 2, 0) / arr.length) : 0;
    return { keyId, avg: Math.round(avg), spread: Math.round(spread), n: arr.length };
  });

  return (
    <div className="stats">
      <h2>Statistik</h2>
      <p className="stats-note">Alle Daten bleiben lokal auf diesem Gerät (Browser-Speicher). Kein Konto, kein Server.</p>
      {note && <p className="stats-warn">{note}</p>}

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
          <div className="stat-split">{splitLine(stats.split)}</div>
        </div>
      </div>

      <h3>Fehler-Heatmap (Akkorde)</h3>
      {errors.length === 0 && <p className="stats-note">Noch keine Fehler gemessen – das Tribunal führt noch keine Akte.</p>}
      {ranking && (
        <p className="stats-note">
          Häufigster Fehlgriff: <strong>{FINGER_NAMES[ranking.top.i]}</strong> – {ranking.top.total} von{' '}
          {ranking.gesamt} Griff-Fehlern{schnitt(ranking.top.halbtoene, ranking.top.gerichtet)}
        </p>
      )}
      <div className="err-list">
        {errors.map((e) => (
          <div key={`${e.keyId}|${e.chord}`}>
            <div className="err-row">
              <span className="err-name">{e.chord} <em>({e.keyId})</em></span>
              <div className="err-bar-wrap">
                <div className="err-bar" style={{ width: `${(e.summe.total / maxErr) * 100}%`, background: COLORS.red }} />
              </div>
              <span className="err-count">{e.summe.total}× · ↑{e.summe.high} ↓{e.summe.low}</span>
            </div>
            {/* R27: Die Akte weiß, welcher Finger es war – hier steht sie. */}
            <div className="err-fingers">{fingerRow(e.finger)}</div>
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
            <button
              className="danger-btn"
              onClick={() => {
                resetAll();
                setLoaded({ progress: loadProgress(), stats: loadStats() });
                setConfirm(false);
                onReset();
              }}
            >
              Ja, löschen
            </button>
            <button className="demo-btn" onClick={() => setConfirm(false)}>Abbrechen</button>
          </span>
        )}
      </div>
    </div>
  );
}
