// Anzeige-Ordnung der Akkordfolgen (B-22 AK 1, AK 2).
// Geprüft wird die Ordnung, nicht der Datensatz – der steht in `music.test.ts`.

import { describe, expect, it } from 'vitest';
import { PROGRESSIONS, type ProgressionKategorie } from '@/lib/music';
import {
  FILTER, KATEGORIEN, auswahlGruppen, auswahlReihenfolge, istWippe, stufenkette, stufenketteText,
} from '@/lib/progression-view';

const prog = (id: string) => PROGRESSIONS.find((p) => p.id === id)!;

describe('istWippe (B-22 AK 2)', () => {
  it('erkennt genau die vier Pendel um die Tonika', () => {
    const wippen = PROGRESSIONS.filter(istWippe).map((p) => p.id);
    expect(wippen).toEqual(['wippe-subdominante', 'wippe-dominante', 'wippe-parallele', 'modalwippe']);
  });

  it('zählt den Plagalschluss nicht dazu – er beginnt auswärts', () => {
    // `IV – I` ist zweigliedrig, aber kein Pendel um die Heimat.
    expect(prog('plagal').degrees.dur).toHaveLength(2);
    expect(istWippe(prog('plagal'))).toBe(false);
  });
});

describe('auswahlGruppen · Gruppierung (AK 1)', () => {
  it('gruppiert ohne Filter nach Kategorie, die Wippen vorweg', () => {
    expect(auswahlGruppen('alle').map((g) => g.id))
      .toEqual(['wippe', 'kadenz', 'sequenz', 'moll', 'pop', 'blues-jazz']);
  });

  it('zeigt je Filterstellung genau die Einträge dieser Kategorie', () => {
    for (const kategorie of KATEGORIEN) {
      const gezeigt = auswahlReihenfolge(kategorie).map((p) => p.id).sort();
      const soll = PROGRESSIONS.filter((p) => p.kategorie === kategorie).map((p) => p.id).sort();
      expect(gezeigt, kategorie).toEqual(soll);
    }
  });

  it('zeigt ohne Filter alle 32 Folgen, jede genau einmal', () => {
    const ids = auswahlReihenfolge('alle').map((p) => p.id);
    expect(ids).toHaveLength(32);
    expect(new Set(ids).size).toBe(32);
  });

  it('lässt keine Gruppe leer', () => {
    for (const f of FILTER) {
      for (const g of auswahlGruppen(f)) expect(g.eintraege.length, `${f}/${g.id}`).toBeGreaterThan(0);
    }
  });

  it('behält innerhalb einer Gruppe die Reihenfolge des Datensatzes', () => {
    const kadenzen = auswahlGruppen('alle').find((g) => g.id === 'kadenz')!.eintraege.map((p) => p.id);
    expect(kadenzen).toEqual(PROGRESSIONS.filter((p) => p.kategorie === 'kadenz').map((p) => p.id));
  });
});

describe('auswahlReihenfolge · Reihenfolge (AK 2)', () => {
  it('stellt die drei Zwei-Akkord-Wippen ohne Filter auf die Positionen 1–3', () => {
    expect(auswahlReihenfolge('alle').slice(0, 3).map((p) => p.id))
      .toEqual(['wippe-subdominante', 'wippe-dominante', 'wippe-parallele']);
  });

  it('setzt hinter die Wippen die Kadenzen und erst danach den Rest', () => {
    const reihe = auswahlReihenfolge('alle');
    const rang = (p: (typeof reihe)[number]): number =>
      istWippe(p) ? 0 : p.kategorie === 'kadenz' ? 1 : 2;
    // Monoton steigend heißt: keine Kadenz vor einer Wippe, kein Rest vor einer Kadenz.
    for (let i = 1; i < reihe.length; i += 1) {
      expect(rang(reihe[i - 1]), `${reihe[i - 1].id} vor ${reihe[i].id}`).toBeLessThanOrEqual(rang(reihe[i]));
    }
    expect(reihe.filter((p) => rang(p) === 0)).toHaveLength(4);
    expect(reihe.filter((p) => rang(p) === 1)).toHaveLength(9);
  });

  it('hält die Wippen auch unter ihrem Kategorie-Filter oben', () => {
    // Die drei Wippen sind Pop-Einträge (B-20) und stehen auch dort vorn.
    expect(auswahlReihenfolge('pop').slice(0, 3).map((p) => p.id))
      .toEqual(['wippe-subdominante', 'wippe-dominante', 'wippe-parallele']);
    expect(auswahlReihenfolge('blues-jazz')[0].id).toBe('modalwippe');
  });

  it('verteilt die 32 Folgen restlos auf die fünf Filterstellungen', () => {
    const summe = KATEGORIEN.reduce((n, k: ProgressionKategorie) => n + auswahlReihenfolge(k).length, 0);
    expect(summe).toBe(32);
  });
});

describe('stufenkette (AK 3)', () => {
  it('nennt die Kette des aktiven Tongeschlechts in der Schreibweise des Datensatzes', () => {
    expect(stufenkette(prog('mollwendung'), 'moll')).toEqual({ text: 'i – VII – VI – V', fremd: null });
    expect(stufenkette(prog('vollkadenz'), 'dur')).toEqual({ text: 'I – IV – V – I', fremd: null });
  });

  it('kennzeichnet die Kette des anderen Tongeschlechts, statt leer zu bleiben', () => {
    expect(stufenkette(prog('mollwendung'), 'dur')).toEqual({ text: 'i – VII – VI – V', fremd: 'moll' });
    expect(stufenketteText(prog('kanon'), 'moll')).toBe('nur Dur: I – V – vi – iii – IV – I – IV – V');
  });

  it('liefert für jede Folge in beiden Tongeschlechtern eine nicht leere Kette', () => {
    for (const p of PROGRESSIONS) {
      for (const mode of ['dur', 'moll'] as const) {
        expect(stufenketteText(p, mode).length, `${p.id}/${mode}`).toBeGreaterThan(0);
      }
    }
  });
});
