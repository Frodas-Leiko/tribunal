// Tests der Musik-Logik (Regelwerk §5.4).
// Der Import läuft absichtlich über den Alias `@/` – damit prüft schon dieser
// Test mit, dass Test- und Build-Auflösung identisch sind.

import { describe, expect, it } from 'vitest';
import { pcName } from '@/lib/music';

describe('deutsche Notennamen (R9)', () => {
  it('nennt Pitch Class 11 „H" und Pitch Class 10 „B"', () => {
    expect(pcName(11)).toBe('H');
    expect(pcName(10)).toBe('B');
  });

  it('rechnet Pitch Classes außerhalb 0..11 in die Oktave zurück', () => {
    expect(pcName(12)).toBe('C');
    expect(pcName(-1)).toBe('H');
  });
});
