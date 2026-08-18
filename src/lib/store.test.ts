// Tests der Stufenplan-Empfehlung (B-14, R11), des Migrationspfads (B-17, R25),
// der Stände je Einheit (B-16, R10), der getrennten Messung von Griff und Zeit
// (B-24, R26) und der finger-aufgelösten Fehlerhistorie (B-25, R27). Ohne DOM:
// alles reine Funktionen über gespeicherten Daten.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { diatonicChords, getKey, tribunal, KEYS } from '@/lib/music';
import {
  chordTotals, emptyProgress, folgenUnit, getStand, loadProgress, loadStats, migrateProgress,
  migrateStats, passTempo, recommendedNext, recordAttempt, stufenUnit, weaknessWeights,
  SCHEMA_VERSION, START_TEMPO, TARGET_TEMPO, TEMPO_STEP,
  type AttemptRecord, type Progress,
} from '@/lib/store';

const stage1 = KEYS.filter((k) => k.stage === 1);
const stage2 = KEYS.filter((k) => k.stage === 2);

/** Setzt eine Tonart auf einen abgeschlossenen Stand in A und/oder B. */
function done(p: Progress, keyId: string, doneA: boolean, doneB: boolean): Progress {
  return {
    ...p,
    stufen: {
      ...p.stufen,
      [`${keyId}|A`]: { tempo: TARGET_TEMPO, done: doneA },
      [`${keyId}|B`]: { tempo: TARGET_TEMPO, done: doneB },
    },
  };
}

describe('recommendedNext (R11)', () => {
  it('empfiehlt bei leerem Fortschritt Stufe 1, erste Tonart, Modus A', () => {
    expect(recommendedNext(emptyProgress())).toEqual({ stage: 1, keyId: stage1[0].id, mode: 'A' });
  });

  it('rückt innerhalb der Tonart von Modus A auf Modus B', () => {
    const p = done(emptyProgress(), stage1[0].id, true, false);
    expect(recommendedNext(p)).toEqual({ stage: 1, keyId: stage1[0].id, mode: 'B' });
  });

  it('rückt nach kompletter Tonart auf die nächste Tonart derselben Stufe', () => {
    const p = done(emptyProgress(), stage1[0].id, true, true);
    expect(recommendedNext(p)).toEqual({ stage: 1, keyId: stage1[1].id, mode: 'A' });
  });

  it('wandert erst nach kompletter Stufe auf die nächste Stufe', () => {
    let p = emptyProgress();
    for (const k of stage1) p = done(p, k.id, true, true);
    expect(recommendedNext(p)).toEqual({ stage: 2, keyId: stage2[0].id, mode: 'A' });
  });

  it('überspringt keine offene frühere Stufe, auch wenn eine spätere steht', () => {
    let p = emptyProgress();
    for (const k of stage2) p = done(p, k.id, true, true);
    expect(recommendedNext(p)).toEqual({ stage: 1, keyId: stage1[0].id, mode: 'A' });
  });

  it('empfiehlt nichts mehr, wenn jede Tonart in A und B steht', () => {
    let p = emptyProgress();
    for (const k of KEYS) p = done(p, k.id, true, true);
    expect(recommendedNext(p)).toBeNull();
  });

  it('bleibt von Modus C und von Folgen unberührt – die sind keine Empfehlung', () => {
    let p = emptyProgress();
    for (const k of KEYS) p = done(p, k.id, true, true);
    p = {
      stufen: { ...p.stufen, [`${stage1[0].id}|C`]: { tempo: START_TEMPO, done: false } },
      folgen: { [`${stage1[0].id}|vollkadenz`]: { tempo: START_TEMPO, done: false } },
    };
    expect(recommendedNext(p)).toBeNull();
  });
});

// ── Migration und Schema-Version (B-17/B-16, R25) ────────────────────────────

const altFassung1 = { 'C-dur': { tempoA: 72, tempoB: 60, doneA: false, doneB: true } };
const erwartetNachMigration: Progress = {
  stufen: { 'C-dur|A': { tempo: 72, done: false }, 'C-dur|B': { tempo: 60, done: true } },
  folgen: {},
};
const leereAufschlüsselung = { attempts: 0, griffOk: 0, timingOk: 0, timingMeasured: 0 };
const leereStatistik = { errors: {}, timing: {}, attempts: 0, hits: 0, split: leereAufschlüsselung };
/** Fassung 1–3: dieselben Zahlen, aber ohne Aufschlüsselung (R26) und ohne Finger (R27). */
const alteStatistik = {
  errors: { 'C-dur|C': { high: 2, low: 1, total: 3 } },
  timing: { 'C-dur': [-12, 4] },
  attempts: 9,
  hits: 6,
};
/** Dieselben drei Fehler nach der Migration: ein Eintrag, dem Finger `ohne` zugeordnet. */
const alteFehlerOhneFinger = { 'C-dur|C': { ohne: { high: 2, low: 1, total: 3, halbtoene: 0 } } };

describe('migrateProgress (R25)', () => {
  it('kein Eintrag ist kein Bruch: Standardwerte, Status ok', () => {
    expect(migrateProgress(null)).toEqual({ data: emptyProgress(), status: 'ok' });
  });

  it('liest die Hülle der aktuellen Version', () => {
    const raw = JSON.stringify({ version: SCHEMA_VERSION, data: erwartetNachMigration });
    expect(migrateProgress(raw)).toEqual({ data: erwartetNachMigration, status: 'ok' });
  });

  it('übernimmt Fassung 1 – nackte Tonart-Tabelle – verlustfrei in alle vier Felder', () => {
    expect(migrateProgress(JSON.stringify(altFassung1)))
      .toEqual({ data: erwartetNachMigration, status: 'migriert' });
  });

  it('übernimmt Fassung 2 – dieselbe Tabelle in der Hülle – verlustfrei', () => {
    const raw = JSON.stringify({ version: 2, data: altFassung1 });
    expect(migrateProgress(raw)).toEqual({ data: erwartetNachMigration, status: 'migriert' });
  });

  // B-24: Die Nummer gilt für beide Fächer. Zog sie wegen der Statistik weiter,
  // sind die Stände deshalb nicht kaputt – sie sind nur älter.
  it('übernimmt die Stände der Vorgängerversion unverändert', () => {
    const raw = JSON.stringify({ version: 3, data: erwartetNachMigration });
    expect(migrateProgress(raw)).toEqual({ data: erwartetNachMigration, status: 'migriert' });
  });

  it('fällt bei kaputtem JSON auf Standardwerte zurück', () => {
    expect(migrateProgress('{kein json')).toEqual({ data: emptyProgress(), status: 'zurückgefallen' });
  });

  it('fällt bei fremder Version zurück, statt sie zu raten', () => {
    const raw = JSON.stringify({ version: SCHEMA_VERSION + 1, data: erwartetNachMigration });
    expect(migrateProgress(raw)).toEqual({ data: emptyProgress(), status: 'zurückgefallen' });
  });

  it('fällt bei fehlenden Feldern zurück', () => {
    expect(migrateProgress(JSON.stringify({ 'C-dur': { tempoA: 72, doneA: false } })))
      .toEqual({ data: emptyProgress(), status: 'zurückgefallen' });
  });

  it('fällt bei falschem Feldtyp im aktuellen Schema zurück', () => {
    const raw = JSON.stringify({ version: SCHEMA_VERSION, data: { stufen: { 'C-dur|A': { tempo: 72, done: 'ja' } }, folgen: {} } });
    expect(migrateProgress(raw)).toEqual({ data: emptyProgress(), status: 'zurückgefallen' });
  });

  it('fällt zurück, wenn ein Fach ganz fehlt', () => {
    const raw = JSON.stringify({ version: SCHEMA_VERSION, data: { stufen: {} } });
    expect(migrateProgress(raw)).toEqual({ data: emptyProgress(), status: 'zurückgefallen' });
  });
});

describe('migrateStats (R25)', () => {
  it('kein Eintrag ist kein Bruch', () => {
    expect(migrateStats(null)).toEqual({ data: leereStatistik, status: 'ok' });
  });

  const migriert = { ...alteStatistik, errors: alteFehlerOhneFinger, split: leereAufschlüsselung };

  it('übernimmt die Statistik der Fassung 1', () => {
    expect(migrateStats(JSON.stringify(alteStatistik)))
      .toEqual({ data: migriert, status: 'migriert' });
  });

  it('übernimmt die Statistik der Fassung 2 – gleiche Zahlen, neue Nummer', () => {
    const raw = JSON.stringify({ version: 2, data: alteStatistik });
    expect(migrateStats(raw)).toEqual({ data: migriert, status: 'migriert' });
  });

  // B-24: Anschläge, Treffer, Fehler und Drift kommen unverändert an; nur die
  // Aufschlüsselung beginnt bei null, weil die alten Zahlen sie nicht hergeben.
  it('übernimmt einen Datensatz der Fassung 3 ohne Verlust (R25)', () => {
    const res = migrateStats(JSON.stringify({ version: 3, data: alteStatistik }));
    expect(res.status).toBe('migriert');
    expect(res.data.attempts).toBe(9);
    expect(res.data.hits).toBe(6);
    expect(res.data.errors).toEqual(alteFehlerOhneFinger);
    expect(res.data.timing).toEqual(alteStatistik.timing);
    expect(res.data.split).toEqual(leereAufschlüsselung);
  });

  // B-25 AK 3: Die Vorgängerversion trennte Griff und Zeit bereits, kannte den
  // Finger aber nicht. Ihre Zahlen bleiben; die Summe je Akkord stimmt vor und
  // nach der Migration überein.
  it('ordnet die Fehler der Vorgängerversion dem Finger `ohne` zu, ohne Verlust', () => {
    const vorher = { ...alteStatistik, split: { attempts: 9, griffOk: 7, timingOk: 5, timingMeasured: 8 } };
    const res = migrateStats(JSON.stringify({ version: 4, data: vorher }));
    expect(res.status).toBe('migriert');
    expect(res.data.attempts).toBe(9);
    expect(res.data.hits).toBe(6);
    expect(res.data.split).toEqual(vorher.split);
    expect(res.data.errors).toEqual(alteFehlerOhneFinger);
    expect(chordTotals(res.data.errors['C-dur|C']).total).toBe(alteStatistik.errors['C-dur|C'].total);
    expect(weaknessWeights(res.data, 'C-dur', ['C'])).toEqual([1 + 3]);
  });

  it('fällt bei kaputten Timing-Werten zurück', () => {
    const kaputt = { errors: {}, timing: { 'C-dur': ['spät'] }, attempts: 1, hits: 0 };
    expect(migrateStats(JSON.stringify(kaputt))).toEqual({ data: leereStatistik, status: 'zurückgefallen' });
  });

  it('liefert bei jedem Rückfall eine eigene Instanz der Standardwerte', () => {
    const a = migrateStats('{kein json').data;
    a.attempts = 5;
    expect(migrateStats('{kein json').data.attempts).toBe(0);
  });
});

// ── Stände je Einheit (B-16, R10) und Tempo-Leiter (B-15) ────────────────────

/** Speicher im Arbeitsspeicher: die Testumgebung ist `node`, kein Browser. */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k); },
    setItem: (k: string, v: string) => { m.set(k, v); },
  };
}

describe('passTempo je Einheit', () => {
  // Der Handle bleibt hier: R24 verbietet `localStorage` außerhalb von store.ts,
  // und die Lint-Regel gilt für Tests genauso.
  let speicher: Storage;
  beforeEach(() => {
    speicher = memoryStorage();
    vi.stubGlobal('localStorage', speicher);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('hebt das Level einer Folge Schritt für Schritt bis TARGET_TEMPO und meldet dann done', () => {
    const einheit = folgenUnit('C-dur', 'vollkadenz');
    const gesehen: number[] = [];
    let fertig = false;
    // Ein Lauf ohne Verlassen der Einheit: jede Serie ruft passTempo erneut.
    for (let i = 0; i < 15 && !fertig; i++) {
      const res = passTempo(einheit);
      gesehen.push(res.newTempo);
      fertig = res.justCompleted;
    }
    const stufen = (TARGET_TEMPO - START_TEMPO) / TEMPO_STEP;
    expect(gesehen.slice(0, stufen)).toEqual(
      Array.from({ length: stufen }, (_, i) => START_TEMPO + TEMPO_STEP * (i + 1)),
    );
    expect(gesehen[stufen]).toBe(TARGET_TEMPO);
    expect(fertig).toBe(true);
    expect(getStand(loadProgress().data, einheit).done).toBe(true);
  });

  it('hält Tonarten, Folgen und Modi auseinander', () => {
    passTempo(folgenUnit('C-dur', 'vollkadenz'));
    passTempo(folgenUnit('C-dur', 'vollkadenz'));
    passTempo(folgenUnit('G-dur', 'vollkadenz'));
    passTempo(folgenUnit('C-dur', 'quintfall'));
    passTempo(stufenUnit('C-dur', 'C'));

    const p = loadProgress().data;
    expect(getStand(p, folgenUnit('C-dur', 'vollkadenz')).tempo).toBe(START_TEMPO + 2 * TEMPO_STEP);
    expect(getStand(p, folgenUnit('G-dur', 'vollkadenz')).tempo).toBe(START_TEMPO + TEMPO_STEP);
    expect(getStand(p, folgenUnit('C-dur', 'quintfall')).tempo).toBe(START_TEMPO + TEMPO_STEP);
    expect(getStand(p, stufenUnit('C-dur', 'C')).tempo).toBe(START_TEMPO + TEMPO_STEP);
    // Unberührte Einheiten stehen weiterhin am Anfang.
    expect(getStand(p, stufenUnit('C-dur', 'A')).tempo).toBe(START_TEMPO);
    expect(getStand(p, folgenUnit('A-moll', 'vollkadenz')).tempo).toBe(START_TEMPO);
  });

  it('schreibt den Fortschritt in der Hülle der aktuellen Version', () => {
    passTempo(stufenUnit('C-dur', 'C'));
    const roh = JSON.parse(speicher.getItem('tribunal.progress.v1') ?? 'null');
    expect(roh.version).toBe(SCHEMA_VERSION);
    expect(roh.data.stufen['C-dur|C']).toEqual({ tempo: START_TEMPO + TEMPO_STEP, done: false });
    expect(roh.data.folgen).toEqual({});
  });

  it('setzt eine Migration aus Fassung 1 fort, ohne den alten Stand zu verlieren', () => {
    speicher.setItem('tribunal.progress.v1', JSON.stringify(altFassung1));
    const res = passTempo(stufenUnit('C-dur', 'A'));
    expect(res.newTempo).toBe(76);
    const p = loadProgress().data;
    expect(getStand(p, stufenUnit('C-dur', 'B'))).toEqual({ tempo: 60, done: true });
  });
});

// ── Griff und Zeit getrennt (B-24, R26) ──────────────────────────────────────

describe('recordAttempt trennt Griff und Zeit (R26)', () => {
  let speicher: Storage;
  beforeEach(() => {
    speicher = memoryStorage();
    vi.stubGlobal('localStorage', speicher);
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Ein Anschlag auf C-Dur; die gemessene Landung folgt dem Urteil über die Zeit. */
  function anschlag(griffOk: boolean, timingOk: boolean | null, direction: 1 | -1 | 0 = 0): AttemptRecord {
    return {
      keyId: 'C-dur',
      chordName: 'C-Dur',
      griffOk,
      timingOk,
      direction,
      finger: null,
      halbtoene: 0,
      timingOffset: timingOk === null ? null : timingOk ? 5 : 120,
    };
  }

  it('lässt einen Timing-Fehler bei sitzendem Griff aus der Heatmap heraus (AK 1)', () => {
    const s = recordAttempt(loadStats().data, anschlag(true, false));
    expect(s.attempts).toBe(1);
    expect(s.errors).toEqual({});
    expect(s.hits).toBe(0);                     // Ton *und* Zeit: nicht bestanden
    expect(s.split).toEqual({ attempts: 1, griffOk: 1, timingOk: 0, timingMeasured: 1 });
    expect(s.timing['C-dur']).toEqual([120]);   // die Drift-Linie sieht ihn sehr wohl
  });

  it('ändert die Gewichte von Modus C durch einen Timing-Fehler nicht (AK 3)', () => {
    const leer = loadStats().data;
    const s = recordAttempt(leer, anschlag(true, false));
    expect(weaknessWeights(s, 'C-dur', ['C-Dur', 'G-Dur']))
      .toEqual(weaknessWeights(leer, 'C-dur', ['C-Dur', 'G-Dur']));
  });

  it('erhöht bei einem Fehlgriff genau einen Eintrag der Heatmap (AK 1, AK 3)', () => {
    const s = recordAttempt(loadStats().data, anschlag(false, true, 1));
    expect(s.errors).toEqual({ 'C-dur|C-Dur': { ohne: { high: 1, low: 0, total: 1, halbtoene: 0 } } });
    expect(weaknessWeights(s, 'C-dur', ['C-Dur', 'G-Dur'])).toEqual([2, 1]);
  });

  it('zählt als Treffer nur, was in Ton und Zeit steht (AK 4)', () => {
    let s = recordAttempt(loadStats().data, anschlag(true, true));
    s = recordAttempt(s, anschlag(false, true, -1));
    s = recordAttempt(s, anschlag(true, false));
    expect(s.attempts).toBe(3);
    expect(s.hits).toBe(1);
    expect(s.split).toEqual({ attempts: 3, griffOk: 2, timingOk: 2, timingMeasured: 3 });
  });

  it('behandelt eine nicht gemessene Zeit nicht als bestandene Zeit (R4)', () => {
    const s = recordAttempt(loadStats().data, anschlag(true, null));
    expect(s.hits).toBe(0);
    expect(s.split).toEqual({ attempts: 1, griffOk: 1, timingOk: 0, timingMeasured: 0 });
    expect(s.timing).toEqual({});               // ohne Messung kein Punkt in der Drift
  });

  it('schreibt die Statistik in der Hülle der aktuellen Version (R25)', () => {
    recordAttempt(loadStats().data, anschlag(true, true));
    const roh = JSON.parse(speicher.getItem('tribunal.stats.v1') ?? 'null');
    expect(roh.version).toBe(SCHEMA_VERSION);
    expect(roh.data.attempts).toBe(1);
    expect(loadStats()).toEqual({ data: roh.data, status: 'ok' });
  });
});

// ── Fehler je Finger (B-25, R27) ─────────────────────────────────────────────

describe('recordAttempt löst die Fehlerhistorie nach Fingern auf (R27)', () => {
  let speicher: Storage;
  beforeEach(() => {
    speicher = memoryStorage();
    vi.stubGlobal('localStorage', speicher);
  });
  afterEach(() => vi.unstubAllGlobals());

  const dDur = getKey('D-dur');
  const tonika = diatonicChords(dDur)[0];   // D – Fis – A

  /** Der Weg der Akte: das Urteil des Tribunals, so wie die Engine es weiterreicht. */
  function fehlgriff(gespielt: number[]) {
    const v = tribunal(tonika, new Set(gespielt), dDur);
    return {
      keyId: 'D-dur',
      chordName: tonika.name,
      griffOk: false,
      timingOk: true,
      direction: v.direction,
      finger: v.finger,
      halbtoene: v.halbtoene,
      timingOffset: 4,
    };
  }

  it('schreibt Richtung und Größe unter den Finger des Urteils (AK 1)', () => {
    // D – Fis – B statt D – Fis – A: die Quinte liegt einen Halbton zu hoch
    const s = recordAttempt(loadStats().data, fehlgriff([2, 6, 10]));
    expect(s.errors['D-dur|D-Dur']).toEqual({ '2': { high: 1, low: 0, total: 1, halbtoene: 1 } });
  });

  it('hält zwei Finger auf demselben Akkord auseinander und bleibt in der Summe ableitbar', () => {
    let s = recordAttempt(loadStats().data, fehlgriff([2, 6, 10]));   // Quinte +1
    s = recordAttempt(s, fehlgriff([2, 5, 9]));                       // Terz −1
    s = recordAttempt(s, fehlgriff([2, 6, 11]));                      // Quinte +2
    expect(s.errors['D-dur|D-Dur']).toEqual({
      '1': { high: 0, low: 1, total: 1, halbtoene: 1 },
      '2': { high: 2, low: 0, total: 2, halbtoene: 3 },
    });
    expect(chordTotals(s.errors['D-dur|D-Dur'])).toEqual({ high: 2, low: 1, total: 3, halbtoene: 4 });
    // Modus C gewichtet über die Summe – dieselbe Wirkung wie vor der Auflösung.
    expect(weaknessWeights(s, 'D-dur', [tonika.name])).toEqual([4]);
  });

  it('legt Urteile ohne Finger unter `ohne` ab, statt einen Finger zu behaupten (R4)', () => {
    // D – Fis – A + C: alle Zieltöne liegen, ein Ton zu viel – kein Finger im Urteil
    const s = recordAttempt(loadStats().data, fehlgriff([2, 6, 9, 0]));
    expect(s.errors['D-dur|D-Dur']).toEqual({ ohne: { high: 0, low: 0, total: 1, halbtoene: 0 } });
  });

  it('nennt bei einem fehlenden Ton den Finger, aber keine Größe', () => {
    // D – Fis: die Quinte fehlt, ohne dass ein falscher Ton an ihrer Stelle liegt
    const s = recordAttempt(loadStats().data, fehlgriff([2, 6]));
    expect(s.errors['D-dur|D-Dur']).toEqual({ '2': { high: 0, low: 0, total: 1, halbtoene: 0 } });
  });

  it('liest die geschriebene Akte in derselben Form wieder ein (R25)', () => {
    recordAttempt(loadStats().data, fehlgriff([2, 6, 10]));
    const geladen = loadStats();
    expect(geladen.status).toBe('ok');
    expect(geladen.data.errors['D-dur|D-Dur']).toEqual({ '2': { high: 1, low: 0, total: 1, halbtoene: 1 } });
  });
});
