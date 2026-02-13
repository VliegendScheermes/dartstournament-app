'use client';

import { use, useState, useCallback, useEffect, useRef } from 'react';

// Standard darts checkout suggestions (2–170)
const CHECKOUTS: Record<number, string> = {
  170: 'T20 T20 D25', 167: 'T20 T19 D25', 164: 'T20 T18 D25',
  161: 'T20 T17 D25', 160: 'T20 T20 D20', 158: 'T20 T20 D19',
  157: 'T20 T19 D20', 156: 'T20 T20 D18', 155: 'T20 T19 D19',
  154: 'T20 T18 D20', 153: 'T20 T19 D18', 152: 'T20 T20 D16',
  151: 'T20 T17 D20', 150: 'T20 T18 D18', 149: 'T20 T19 D16',
  148: 'T20 T16 D20', 147: 'T20 T17 D18', 146: 'T20 T18 D16',
  145: 'T20 T19 D14', 144: 'T20 T20 D12', 143: 'T20 T17 D16',
  142: 'T20 T14 D20', 141: 'T20 T19 D12', 140: 'T20 T16 D16',
  139: 'T20 T13 D20', 138: 'T20 T18 D12', 137: 'T20 T15 D16',
  136: 'T20 T20 D8',  135: 'T20 T17 D12', 134: 'T20 T14 D16',
  133: 'T20 T19 D8',  132: 'T20 T16 D12', 131: 'T20 T13 D16',
  130: 'T20 T18 D8',  129: 'T19 T16 D12', 128: 'T20 T16 D10',
  127: 'T20 T17 D8',  126: 'T19 T19 D6',  125: 'T20 T15 D10',
  124: 'T20 T16 D8',  123: 'T19 T16 D9',  122: 'T18 T18 D7',
  121: 'T20 T11 D14', 120: 'T20 S20 D20', 119: 'T19 T12 D13',
  118: 'T20 S18 D20', 117: 'T20 S17 D20', 116: 'T20 S16 D20',
  115: 'T20 S15 D20', 114: 'T20 S14 D20', 113: 'T20 S13 D20',
  112: 'T20 S12 D20', 111: 'T20 S19 D16', 110: 'T20 S10 D20',
  109: 'T20 S9 D20',  108: 'T20 S8 D20',  107: 'T19 S10 D20',
  106: 'T20 S6 D20',  105: 'T20 S5 D20',  104: 'T18 S18 D16',
  103: 'T19 S6 D20',  102: 'T20 S2 D20',  101: 'T17 S10 D20',
  100: 'T20 D20',     99:  'T19 S10 D16', 98:  'T20 D19',
  97:  'T19 D20',     96:  'T20 D18',     95:  'T19 D19',
  94:  'T18 D20',     93:  'T19 D18',     92:  'T20 D16',
  91:  'T17 D20',     90:  'T18 D18',     89:  'T19 D16',
  88:  'T20 D14',     87:  'T17 D18',     86:  'T18 D16',
  85:  'T15 D20',     84:  'T20 D12',     83:  'T17 D16',
  82:  'T14 D20',     81:  'T19 D12',     80:  'T20 D10',
  79:  'T13 D20',     78:  'T18 D12',     77:  'T15 D16',
  76:  'T20 D8',      75:  'T17 D12',     74:  'T14 D16',
  73:  'T19 D8',      72:  'T16 D12',     71:  'T13 D16',
  70:  'T18 D8',      69:  'T19 D6',      68:  'T20 D4',
  67:  'T17 D8',      66:  'T14 D12',     65:  'T19 D4',
  64:  'T16 D8',      63:  'T13 D12',     62:  'T10 D16',
  61:  'T15 D8',      60:  'S20 D20',     59:  'S19 D20',
  58:  'S18 D20',     57:  'S17 D20',     56:  'T16 D4',
  55:  'S15 D20',     54:  'S14 D20',     53:  'S13 D20',
  52:  'S12 D20',     51:  'S19 D16',     50:  'S10 D20',
  49:  'S9 D20',      48:  'S16 D16',     47:  'S15 D16',
  46:  'S6 D20',      45:  'S13 D16',     44:  'S12 D16',
  43:  'S3 D20',      42:  'S10 D16',     41:  'S9 D16',
  40:  'D20',         38:  'D19',         36:  'D18',
  34:  'D17',         32:  'D16',         30:  'D15',
  28:  'D14',         26:  'D13',         24:  'D12',
  22:  'D11',         20:  'D10',         18:  'D9',
  16:  'D8',          14:  'D7',          12:  'D6',
  10:  'D5',          8:   'D4',          6:   'D3',
  4:   'D2',          2:   'D1',
};

interface PlayerState {
  name: string;
  score: number;
  legs: number;
  sets: number;
  history: number[];
  input: string;
}

interface GameSettings {
  startScore: 501 | 301;
  setsEnabled: boolean;
  sets: number;
  legsEnabled: boolean;
  legs: number;
  p1Link: string;
  p2Link: string;
}

function makePlayer(name: string, score: number): PlayerState {
  return { name, score, legs: 0, sets: 0, history: [], input: '' };
}

const DEFAULT_SETTINGS: GameSettings = {
  startScore: 501,
  setsEnabled: false,
  sets: 3,
  legsEnabled: true,
  legs: 3,
  p1Link: '',
  p2Link: '',
};

interface ScoreboardPageProps {
  params: Promise<{ id: string }>;
}

export default function ScoreboardPage({ params }: ScoreboardPageProps) {
  const { id } = use(params);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [players, setPlayers] = useState<[PlayerState, PlayerState]>([
    makePlayer('Player One', 501),
    makePlayer('Player Two', 501),
  ]);
  const [message, setMessage] = useState('');
  const [activePlayer, setActivePlayer] = useState<0 | 1 | null>(null);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  }, []);

  const updatePlayer = useCallback((index: 0 | 1, updates: Partial<PlayerState>) => {
    setPlayers(prev => {
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }, []);

  const resetGame = () => {
    const s = settings.startScore;
    setPlayers([makePlayer(players[0].name, s), makePlayer(players[1].name, s)]);
  };

  const applyScore = useCallback((playerIndex: 0 | 1, score: number) => {
    setPlayers(prev => {
      const player = prev[playerIndex];
      if (score < 0 || score > 180) {
        showMessage('Invalid score (max 180)');
        return prev;
      }
      const remaining = player.score - score;
      if (remaining < 0) {
        showMessage('Bust!');
        const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
        next[playerIndex] = { ...player, input: '' };
        return next;
      }
      if (remaining === 1) {
        showMessage('Bust! (leaves 1)');
        const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
        next[playerIndex] = { ...player, input: '' };
        return next;
      }
      if (remaining === 0) {
        showMessage(`${player.name} wins the leg! 🎯`);
        const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
        next[playerIndex] = {
          ...player,
          score: settings.startScore,
          legs: player.legs + 1,
          history: [],
          input: '',
        };
        return next;
      }
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      next[playerIndex] = {
        ...player,
        score: remaining,
        history: [...player.history, score],
        input: '',
      };
      return next;
    });
  }, [showMessage, settings.startScore]);

  const handleKey = useCallback((playerIndex: 0 | 1, key: string) => {
    setPlayers(prev => {
      const player = prev[playerIndex];
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];

      if (key === 'undo') {
        if (player.history.length === 0) return prev;
        const last = player.history[player.history.length - 1];
        next[playerIndex] = {
          ...player,
          score: player.score + last,
          history: player.history.slice(0, -1),
          input: '',
        };
        return next;
      }
      if (key === 'enter') {
        // submit handled separately via applyScore
        return prev;
      }
      if (key === 'clear') {
        next[playerIndex] = { ...player, input: '' };
        return next;
      }
      if (key === 'backspace') {
        next[playerIndex] = { ...player, input: player.input.slice(0, -1) };
        return next;
      }
      // Digit key
      const newInput = player.input + key;
      if (parseInt(newInput, 10) > 180) return prev;
      next[playerIndex] = { ...player, input: newInput };
      return next;
    });
  }, []);

  // Submit for active player (needs current input value)
  const submitActive = useCallback((playerIndex: 0 | 1) => {
    setPlayers(prev => {
      const input = prev[playerIndex].input;
      const score = parseInt(input, 10);
      if (!isNaN(score)) {
        // defer to applyScore logic via a flag — but applyScore uses setPlayers too
        // so we call applyScore outside this setter
      }
      return prev;
    });
    // Read current input and apply
    setPlayers(prev => {
      const score = parseInt(prev[playerIndex].input, 10);
      if (isNaN(score)) return prev;
      // inline apply logic
      const player = prev[playerIndex];
      if (score < 0 || score > 180) {
        showMessage('Invalid score (max 180)');
        return prev;
      }
      const remaining = player.score - score;
      if (remaining < 0) {
        showMessage('Bust!');
        const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
        next[playerIndex] = { ...player, input: '' };
        return next;
      }
      if (remaining === 1) {
        showMessage('Bust! (leaves 1)');
        const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
        next[playerIndex] = { ...player, input: '' };
        return next;
      }
      if (remaining === 0) {
        showMessage(`${player.name} wins the leg! 🎯`);
        const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
        next[playerIndex] = {
          ...player,
          score: settings.startScore,
          legs: player.legs + 1,
          history: [],
          input: '',
        };
        return next;
      }
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      next[playerIndex] = {
        ...player,
        score: remaining,
        history: [...player.history, score],
        input: '',
      };
      return next;
    });
  }, [showMessage, settings.startScore]);

  // Keyboard/numpad input
  const activePlayerRef = useRef(activePlayer);
  activePlayerRef.current = activePlayer;
  const handleKeyRef = useRef(handleKey);
  handleKeyRef.current = handleKey;
  const submitActiveRef = useRef(submitActive);
  submitActiveRef.current = submitActive;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const pi = activePlayerRef.current;
      if (pi === null) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyRef.current(pi, e.key);
      } else if (e.code.startsWith('Numpad') && e.code.length === 7) {
        // Numpad0–Numpad9
        const digit = e.code.slice(6);
        if (digit >= '0' && digit <= '9') {
          e.preventDefault();
          handleKeyRef.current(pi, digit);
        }
      } else if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        submitActiveRef.current(pi);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyRef.current(pi, 'backspace');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleKeyRef.current(pi, 'clear');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Sync live state to localStorage so OBS overlay can read it
  useEffect(() => {
    localStorage.setItem(`darts-scoreboard-${id}`, JSON.stringify({
      p1Name: players[0].name,
      p1Score: players[0].score,
      p1Legs: players[0].legs,
      p1Sets: players[0].sets,
      p1Active: activePlayer === 0,
      p2Name: players[1].name,
      p2Score: players[1].score,
      p2Legs: players[1].legs,
      p2Sets: players[1].sets,
      p2Active: activePlayer === 1,
      startScore: settings.startScore,
      legsEnabled: settings.legsEnabled,
      legs: settings.legs,
      setsEnabled: settings.setsEnabled,
      sets: settings.sets,
    }));
  }, [players, activePlayer, settings, id]);

  const handleSettingChange = (field: keyof GameSettings, value: unknown) => {
    setSettings(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'startScore') {
        const s = value as 501 | 301;
        setPlayers(prev2 => [
          { ...prev2[0], score: s, history: [], input: '' },
          { ...prev2[1], score: s, history: [], input: '' },
        ]);
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Toast message */}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 px-6 py-2 rounded-full font-bold z-50 shadow-lg text-lg">
          {message}
        </div>
      )}

      {/* Sidebar */}
      <aside className={`flex-shrink-0 bg-gray-800 border-r border-gray-700 transition-all duration-200 overflow-y-auto ${sidebarOpen ? 'w-52' : 'w-10'}`}>
        <div className="flex items-center justify-between p-2 border-b border-gray-700">
          {sidebarOpen && <span className="font-semibold text-sm">Settings</span>}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 flex-shrink-0"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {sidebarOpen && (
          <div className="p-3 space-y-4 text-sm">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.setsEnabled} onChange={e => handleSettingChange('setsEnabled', e.target.checked)} className="accent-green-500" />
                <span>Best of... Sets</span>
              </label>
              {settings.setsEnabled && (
                <input type="number" min={1} value={settings.sets} onChange={e => handleSettingChange('sets', parseInt(e.target.value) || 1)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center" />
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.legsEnabled} onChange={e => handleSettingChange('legsEnabled', e.target.checked)} className="accent-green-500" />
                <span>Best of... Legs</span>
              </label>
              {settings.legsEnabled && (
                <input type="number" min={1} value={settings.legs} onChange={e => handleSettingChange('legs', parseInt(e.target.value) || 1)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center" />
              )}
            </div>

            <div>
              <span className="block text-gray-400 mb-1">Game</span>
              <div className="flex gap-2">
                {([501, 301] as const).map(v => (
                  <button key={v} onClick={() => handleSettingChange('startScore', v)} className={`flex-1 py-1 rounded font-semibold text-sm border ${settings.startScore === v ? 'bg-green-600 border-green-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>{v}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Player one link</label>
              <input type="text" value={settings.p1Link} onChange={e => handleSettingChange('p1Link', e.target.value)} placeholder="https://..." className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Player two link</label>
              <input type="text" value={settings.p2Link} onChange={e => handleSettingChange('p2Link', e.target.value)} placeholder="https://..." className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs" />
            </div>

            <div>
              <button
                onClick={() => window.open(`/tournament/${id}/obs-overlay`, '_blank')}
                className="w-full py-1.5 rounded bg-gray-700 border border-gray-600 hover:bg-gray-600 text-xs"
              >
                OBS Scoreboard link
              </button>
            </div>

            <button onClick={resetGame} className="w-full py-1.5 rounded bg-red-800 hover:bg-red-700 border border-red-600 text-sm font-semibold">
              Reset Game
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 p-3 gap-3">
        {/* Keyboard hint */}
        <div className="text-xs text-gray-600 text-center">
          {activePlayer !== null
            ? `⌨ Keyboard active → ${players[activePlayer].name}`
            : '⌨ Click a player panel to activate keyboard input'}
        </div>

        {/* Players row */}
        <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
          {([0, 1] as const).map(i => (
            <PlayerCard
              key={i}
              player={players[i]}
              isActive={activePlayer === i}
              onActivate={() => setActivePlayer(i)}
              onNameChange={name => updatePlayer(i, { name })}
              onKey={key => handleKey(i, key)}
              onEnter={() => submitActive(i)}
              onShortcut={score => applyScore(i, score)}
            />
          ))}
        </div>

        {/* Soundboard placeholder */}
        <div className="flex-shrink-0 h-24 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
          <span className="text-gray-500 text-sm">Soundboard (coming soon)</span>
        </div>
      </main>
    </div>
  );
}

interface PlayerCardProps {
  player: PlayerState;
  isActive: boolean;
  onActivate: () => void;
  onNameChange: (name: string) => void;
  onKey: (key: string) => void;
  onEnter: () => void;
  onShortcut: (score: number) => void;
}

function PlayerCard({ player, isActive, onActivate, onNameChange, onKey, onEnter, onShortcut }: PlayerCardProps) {
  const checkout = player.score >= 2 && player.score <= 170 ? CHECKOUTS[player.score] : undefined;
  const btnBase = 'flex items-center justify-center rounded font-bold select-none cursor-pointer active:scale-95 transition-transform';

  return (
    <div
      onClick={onActivate}
      className={`bg-gray-800 rounded-lg p-3 flex flex-col gap-2 min-h-0 border-2 transition-colors cursor-pointer ${isActive ? 'border-blue-500' : 'border-gray-700 hover:border-gray-600'}`}
    >
      {/* Player name */}
      <input
        type="text"
        value={player.name}
        onChange={e => onNameChange(e.target.value)}
        onClick={e => e.stopPropagation()}
        className="bg-transparent text-center text-lg font-semibold border-b border-gray-600 focus:outline-none focus:border-green-500 pb-1"
      />

      {/* Input display */}
      <div className="text-center text-gray-400 text-sm h-5 tracking-widest">
        {player.input ? player.input : '· · · · ·'}
      </div>

      {/* Big score */}
      <div className="text-center text-6xl font-bold leading-none py-1">
        {player.score}
      </div>

      {/* Checkout suggestion */}
      <div className="text-center text-green-400 text-sm h-5 font-mono">
        {checkout || ''}
      </div>

      {/* Calculator grid */}
      <div className="flex-1 grid grid-cols-4 gap-1.5 min-h-0">
        <button onClick={e => { e.stopPropagation(); onShortcut(180); }} className={`${btnBase} bg-green-700 hover:bg-green-600 text-white`}>180</button>
        <button onClick={e => { e.stopPropagation(); onKey('1'); }} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}>1</button>
        <button onClick={e => { e.stopPropagation(); onKey('2'); }} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}>2</button>
        <button onClick={e => { e.stopPropagation(); onKey('3'); }} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}>3</button>

        <button onClick={e => { e.stopPropagation(); onShortcut(100); }} className={`${btnBase} bg-green-700 hover:bg-green-600 text-white`}>100</button>
        <button onClick={e => { e.stopPropagation(); onKey('4'); }} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}>4</button>
        <button onClick={e => { e.stopPropagation(); onKey('5'); }} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}>5</button>
        <button onClick={e => { e.stopPropagation(); onKey('6'); }} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}>6</button>

        <button onClick={e => { e.stopPropagation(); onShortcut(60); }} className={`${btnBase} bg-green-700 hover:bg-green-600 text-white`}>60</button>
        <button onClick={e => { e.stopPropagation(); onKey('7'); }} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}>7</button>
        <button onClick={e => { e.stopPropagation(); onKey('8'); }} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}>8</button>
        <button onClick={e => { e.stopPropagation(); onKey('9'); }} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}>9</button>

        <button onClick={e => { e.stopPropagation(); onShortcut(26); }} className={`${btnBase} bg-green-700 hover:bg-green-600 text-white`}>26</button>
        <button onClick={e => { e.stopPropagation(); onKey('undo'); }} className={`${btnBase} bg-gray-600 hover:bg-gray-500 text-yellow-300`}>↩</button>
        <button onClick={e => { e.stopPropagation(); onKey('0'); }} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}>0</button>
        <button onClick={e => { e.stopPropagation(); onEnter(); }} className={`${btnBase} bg-blue-700 hover:bg-blue-600 text-white`}>Enter</button>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-sm text-gray-400 pt-1 border-t border-gray-700">
        <span>Game: <span className="text-white font-semibold">{player.legs}</span></span>
        <span>Sets: <span className="text-white font-semibold">{player.sets}</span></span>
      </div>

      {/* Score history */}
      <div className="text-xs text-gray-500 flex flex-wrap gap-x-2 max-h-10 overflow-hidden">
        {player.history.slice(-10).map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
    </div>
  );
}
