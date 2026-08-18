// ── Eingabe: Web MIDI API + Demo-Modus (Computertastatur) ───────────────────

import { useEffect, useRef, useState, useCallback } from 'react';

export interface NoteEvent {
  midi: number;        // 0..127
  time: number;        // performance.now() in ms
}

export type InputSource = 'midi' | 'demo' | 'none';

// Demo-Belegung: untere Reihe = weiße Töne ab C4, obere Reihe = schwarze Töne.
// Bewusst KEINE Tastatur-Grafik – nur eine Tastenliste (s. Konzept).
const DEMO_MAP: Record<string, number> = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, z: 68, h: 69, u: 70, j: 71, k: 72,
};

export const DEMO_HINT = 'A W S E D F T G Z H U J K  =  C Cis D Es E F Fis G As A B H c′';

export function useNoteInput(onNote: (ev: NoteEvent) => void) {
  const [source, setSource] = useState<InputSource>('none');
  const [midiName, setMidiName] = useState<string>('');
  // Wie in `engine.ts`: die Ref hält den jeweils frischen Callback, damit weder der
  // MIDI- noch der Demo-Effekt bei jedem neuen Callback neu aufgesetzt wird. Gelesen
  // wird sie ausschließlich aus Event-Handlern, geschrieben deshalb im Effekt.
  const onNoteRef = useRef(onNote);
  useEffect(() => { onNoteRef.current = onNote; }, [onNote]);

  useEffect(() => {
    let cancelled = false;
    const nav = navigator as Navigator & {
      requestMIDIAccess?: (opts?: { sysex?: boolean }) => Promise<MIDIAccess>;
    };
    if (!nav.requestMIDIAccess) return;

    nav.requestMIDIAccess().then((access) => {
      if (cancelled) return;
      const attach = () => {
        let found = '';
        access.inputs.forEach((input) => {
          found = input.name ?? 'MIDI-Gerät';
          input.onmidimessage = (msg: MIDIMessageEvent) => {
            const data = msg.data;
            if (!data || data.length < 3) return;
            const status = data[0] & 0xf0;
            const velocity = data[2];
            if (status === 0x90 && velocity > 0) {
              onNoteRef.current({ midi: data[1], time: performance.now() });
            }
          };
        });
        if (found) {
          setMidiName(found);
          setSource('midi');
        }
      };
      attach();
      access.onstatechange = attach;
    }).catch(() => { /* kein MIDI-Zugriff */ });

    return () => { cancelled = true; };
  }, []);

  // Demo-Modus: Computertastatur
  const [demoActive, setDemoActive] = useState(false);
  useEffect(() => {
    if (!demoActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const midi = DEMO_MAP[e.key.toLowerCase()];
      if (midi !== undefined) {
        e.preventDefault();
        onNoteRef.current({ midi, time: performance.now() });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [demoActive]);

  const enableDemo = useCallback(() => {
    setDemoActive(true);
    setSource((s) => (s === 'midi' ? s : 'demo'));
  }, []);

  const disableDemo = useCallback(() => {
    setDemoActive(false);
    setSource((s) => (s === 'demo' ? 'none' : s));
  }, []);

  return { source, midiName, demoActive, enableDemo, disableDemo };
}
