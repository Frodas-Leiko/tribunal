import { useCallback, useRef, useState } from 'react';
import { Home, type SessionSetup } from './sections/Home';
import { Session } from './sections/Session';
import { Stats } from './sections/Stats';
import { openAudioContext } from './lib/audio';
import { loadProgress, type Progress } from './lib/store';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';

type View = 'home' | 'session' | 'stats';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [setup, setSetup] = useState<SessionSetup | null>(null);
  const [audio, setAudio] = useState<AudioContext | null>(null);
  const [progress, setProgress] = useState<Progress>(() => loadProgress().data);
  const audioRef = useRef<AudioContext | null>(null);

  const refresh = useCallback(() => setProgress(loadProgress().data), []);

  // R18: Wird von `Home` im Klick-Handler von „Einheit starten" aufgerufen – der
  // einzige Ort, an dem ein AudioContext entstehen darf. Über mehrere Einheiten
  // hinweg bleibt es derselbe Kontext.
  const openAudio = useCallback(() => {
    const ctx = openAudioContext(audioRef.current);
    audioRef.current = ctx;
    return ctx;
  }, []);

  const startSession = (s: SessionSetup, ctx: AudioContext) => {
    setAudio(ctx);
    setSetup(s);
    setView('session');
  };

  return (
    <div className="app">
      <header className="app-head">
        <div className="app-title" onClick={() => setView('home')}>
          <h1>TRIBUNAL</h1>
          <span>propriozeptiver Klaviertrainer</span>
        </div>
        <nav>
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Stufenplan</button>
          <button className={view === 'stats' ? 'active' : ''} onClick={() => setView('stats')}>Statistik</button>
        </nav>
      </header>

      {/* B-27/AK 2: Querformat ist der einzige gestaltete Zustand (R6). Der Hinweis
          nennt, was zu tun ist, und blockiert nichts – ein gedrehtes Tablet ist kein
          Fehlerzustand, der die Eingabe abschneiden dürfte (R22). Sichtbar wird er
          allein über die Medienabfrage in `index.css`. */}
      <div className="rotate-hint" role="note">
        Hochformat: Bitte das Gerät ins Querformat drehen – das Cockpit ist für die Breite gebaut.
      </div>

      {view === 'home' && <Home progress={progress} onStart={startSession} openAudio={openAudio} />}
      {view === 'session' && setup && audio && (
        <Session setup={setup} audio={audio} onExit={() => { refresh(); setView('home'); }} onProgressChanged={refresh} />
      )}
      {view === 'stats' && <Stats onReset={refresh} />}

      <footer className="app-foot">
        Fortschritt & Statistik bleiben in diesem Browser auf diesem Gerät · Querformat empfohlen · USB-MIDI erforderlich (oder Demo-Modus)
      </footer>
    </div>
  );
}
