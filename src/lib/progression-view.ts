// ── Anzeige-Ordnung der Akkordfolgen (B-22) ─────────────────────────────────
// R14: Der Datensatz bleibt der Datensatz. Diese Datei ordnet ihn nur für die
// Auswahl – Reihenfolge, Gruppen, Beschriftungen. Die Ordnung lebt damit in der
// UI-Schicht, nicht in `PROGRESSIONS`, und kein `if` fragt nach einer Kennung:
// Was eine „Wippe" ist, steht in der Form der Stufenkette, nicht in einer Liste
// von Namen.

import { PROGRESSIONS, type Mode, type ProgressionDef, type ProgressionKategorie } from './music';

export const MODE_LABEL: Record<Mode, string> = { dur: 'Dur', moll: 'Moll' };

/** Reihenfolge der Kategorien in der Anzeige: Kadenzen zuerst (AK 2). */
export const KATEGORIEN: ProgressionKategorie[] = ['kadenz', 'sequenz', 'moll', 'pop', 'blues-jazz'];

export const KATEGORIE_LABEL: Record<ProgressionKategorie, string> = {
  kadenz: 'Kadenz',
  sequenz: 'Sequenz',
  moll: 'Moll',
  pop: 'Pop',
  'blues-jazz': 'Blues/Jazz',
};

/**
 * Die Filterstellungen: fünf Kategorien plus „alle". Eine Auswahl, kein
 * Freitextfeld – Tippen ist im Setup erlaubt (R6), Schreiben ist umständlich.
 */
export type Filter = 'alle' | ProgressionKategorie;

export const FILTER: Filter[] = ['alle', ...KATEGORIEN];

export function filterLabel(f: Filter): string {
  return f === 'alle' ? 'Alle' : KATEGORIE_LABEL[f];
}

/** Die Stufenbezeichner der Tonika – Dur groß, Moll klein (R15). */
const TONIKA = ['I', 'i'];

/**
 * Zwei-Akkord-Wippe: genau zwei Akkorde, und der erste ist die Tonika – ein
 * Pendel um die Heimat. Die Eigenschaft wird aus der Stufenkette gelesen, nicht
 * aus dem Namen (R14). Der Plagalschluss `IV – I` ist deshalb keine Wippe: er
 * beginnt auswärts und kehrt nur zurück.
 */
export function istWippe(p: ProgressionDef): boolean {
  return [p.degrees.dur, p.degrees.moll].some(
    (kette) => kette !== null && kette.length === 2 && TONIKA.includes(kette[0]),
  );
}

export interface AuswahlGruppe {
  id: 'wippe' | ProgressionKategorie;
  label: string;
  eintraege: ProgressionDef[];
}

/**
 * Die Einträge der Auswahl, gruppiert und in Anzeige-Reihenfolge (AK 1, AK 2):
 * Zwei-Akkord-Wippen zuerst – die kürzeste sinnvolle Übung steht oben –, dann
 * die Kadenzen, dann der Rest. Innerhalb einer Gruppe bleibt die Reihenfolge des
 * Datensatzes erhalten.
 *
 * Der Filter wirkt auf die Einträge, nicht auf die Gruppen: Bei `pop` erscheinen
 * genau die Pop-Einträge – die drei Wippen darunter stehen weiter oben, weil sie
 * Wippen sind, nicht weil sie eine eigene Kategorie wären.
 */
export function auswahlGruppen(filter: Filter, bestand: readonly ProgressionDef[] = PROGRESSIONS): AuswahlGruppe[] {
  const pool = filter === 'alle' ? bestand : bestand.filter((p) => p.kategorie === filter);
  const gruppen: AuswahlGruppe[] = [];

  const wippen = pool.filter(istWippe);
  if (wippen.length > 0) gruppen.push({ id: 'wippe', label: 'Zwei-Akkord-Wippen', eintraege: wippen });

  for (const k of KATEGORIEN) {
    const eintraege = pool.filter((p) => p.kategorie === k && !istWippe(p));
    if (eintraege.length > 0) gruppen.push({ id: k, label: KATEGORIE_LABEL[k], eintraege });
  }
  return gruppen;
}

/** Dieselbe Ordnung ohne Gruppengrenzen – die Positionen, die AK 2 prüft. */
export function auswahlReihenfolge(filter: Filter, bestand: readonly ProgressionDef[] = PROGRESSIONS): ProgressionDef[] {
  return auswahlGruppen(filter, bestand).flatMap((g) => g.eintraege);
}

export interface Stufenkette {
  /** `i – VII – VI – V` – dieselbe Schreibweise wie in `docs/Akkordfolgen.md`. */
  text: string;
  /** Gesetzt, wenn die Kette aus dem *anderen* Tongeschlecht stammt (B-20). */
  fremd: Mode | null;
}

/**
 * Die Stufenkette im aktiven Tongeschlecht (AK 3). Ist die Folge dort nicht
 * angeboten, steht die Kette des anderen Tongeschlechts da – gekennzeichnet,
 * nicht stillschweigend. Eine leere Zeile wäre die schlechteste Antwort: Der
 * Eintrag bleibt sichtbar (R16), also soll er auch zeigen, worum es geht.
 */
export function stufenkette(p: ProgressionDef, mode: Mode): Stufenkette {
  const eigen = p.degrees[mode];
  if (eigen) return { text: eigen.join(' – '), fremd: null };

  const andere: Mode = mode === 'dur' ? 'moll' : 'dur';
  const fremdKette = p.degrees[andere];
  // R14: Jede Folge trägt Stufen für Dur und/oder Moll. Keine von beiden wäre ein
  // Fehler im Datensatz und scheitert laut, statt eine leere Zeile zu zeigen (R16).
  if (!fremdKette) throw new Error(`Akkordfolge „${p.id}" hat in keinem Tongeschlecht eine Stufenkette (R14).`);
  return { text: fremdKette.join(' – '), fremd: andere };
}

/** Die Zeile, wie sie im Eintrag steht – mit Herkunft, wenn sie fremd ist. */
export function stufenketteText(p: ProgressionDef, mode: Mode): string {
  const k = stufenkette(p, mode);
  return k.fremd ? `nur ${MODE_LABEL[k.fremd]}: ${k.text}` : k.text;
}
