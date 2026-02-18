'use client';

import { use, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { soundPlayer } from '@/lib/audio/soundPlayer';
import { createClient } from '@/lib/auth/supabase';

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
  startedLeg: boolean;
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

function makePlayer(name: string, score: number, startedLeg: boolean = true): PlayerState {
  return { name, score, legs: 0, sets: 0, history: [], input: '', startedLeg };
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
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tournamentName, setTournamentName] = useState('Darts Tournament');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [players, setPlayers] = useState<[PlayerState, PlayerState]>([
    makePlayer('Player One', 501, true),
    makePlayer('Player Two', 501, false),
  ]);
  const [message, setMessage] = useState('');
  const [activePlayer, setActivePlayer] = useState<0 | 1>(0);
  const [inputValue, setInputValue] = useState('');
  const [backendVolume, setBackendVolume] = useState(70); // 0-100
  const [frontendVolume, setFrontendVolume] = useState(70); // 0-100
  const [volumeExpanded, setVolumeExpanded] = useState(true);
  const [obsExpanded, setObsExpanded] = useState(false);
  const [barneyAnim, setBarneyAnim] = useState<{ src: string; key: number } | null>(null);

  const playBarney = (src: string) => setBarneyAnim({ src, key: Date.now() });

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  }, []);

  // Load tournament name from database on mount
  useEffect(() => {
    const loadTournamentName = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/tournaments/${id}`, { headers });
        if (response.ok) {
          const tournament = await response.json();
          if (tournament?.tournamentName) {
            setTournamentName(tournament.tournamentName);
          }
        }
      } catch (error) {
        console.error('Failed to load tournament name:', error);
      }
    };
    loadTournamentName();
  }, [id]);

  // Preload common sounds and set backend volume
  useEffect(() => {
    soundPlayer.preloadCommonSounds();
    soundPlayer.setVolume(backendVolume / 100);
    soundPlayer.setEnabled(backendVolume > 0);
  }, [backendVolume]);

  const updatePlayer = useCallback((index: 0 | 1, updates: Partial<PlayerState>) => {
    setPlayers(prev => {
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }, []);

  const resetGame = () => {
    const s = settings.startScore;
    setPlayers([makePlayer(players[0].name, s, true), makePlayer(players[1].name, s, false)]);
    setActivePlayer(0);
  };

  const applyScore = useCallback((playerIndex: 0 | 1, score: number) => {
    // Play score sound
    soundPlayer.playScore(score);

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
        // Switch to other player
        setActivePlayer(playerIndex === 0 ? 1 : 0);
        return next;
      }
      if (remaining === 1) {
        showMessage('Bust! (leaves 1)');
        const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
        next[playerIndex] = { ...player, input: '' };
        // Switch to other player
        setActivePlayer(playerIndex === 0 ? 1 : 0);
        return next;
      }
      if (remaining === 0) {
        showMessage(`${player.name} wins the leg! 🎯`);
        const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
        const winner = playerIndex;
        const otherPlayer = playerIndex === 0 ? 1 : 0;
        // Winner starts next leg
        next[winner] = {
          ...player,
          score: settings.startScore,
          legs: player.legs + 1,
          history: [],
          input: '',
          startedLeg: false,
        };
        next[otherPlayer] = {
          ...prev[otherPlayer],
          score: settings.startScore,
          history: [],
          startedLeg: true,
        };
        // Other player starts next leg
        setActivePlayer(otherPlayer);
        return next;
      }
      const next: [PlayerState, PlayerState] = [{ ...prev[0] }, { ...prev[1] }];
      next[playerIndex] = {
        ...player,
        score: remaining,
        history: [...player.history, score],
        input: '',
      };
      // Switch to other player
      setActivePlayer(playerIndex === 0 ? 1 : 0);
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

  // Sync live state to localStorage (same-browser tab) AND to API (OBS overlay)
  const apiWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  // Fetch and cache the session token once on mount
  useEffect(() => {
    const getToken = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      sessionTokenRef.current = session?.access_token ?? null;
    };
    getToken();
  }, []);

  useEffect(() => {
    const payload = {
      tournamentName,
      p1Name: players[0].name,
      p1Score: players[0].score,
      p1Legs: players[0].legs,
      p1Sets: players[0].sets,
      p1Active: activePlayer === 0,
      p1StartedLeg: players[0].startedLeg,
      p2Name: players[1].name,
      p2Score: players[1].score,
      p2Legs: players[1].legs,
      p2Sets: players[1].sets,
      p2Active: activePlayer === 1,
      p2StartedLeg: players[1].startedLeg,
      startScore: settings.startScore,
      legsEnabled: settings.legsEnabled,
      legs: settings.legs,
      setsEnabled: settings.setsEnabled,
      sets: settings.sets,
      frontendVolume,
      barneyFrame: barneyAnim ? { src: barneyAnim.src, ts: barneyAnim.key } : null,
    };

    // Write to localStorage (for same-browser tab fallback)
    localStorage.setItem(`darts-scoreboard-${id}`, JSON.stringify(payload));

    // Debounced write to API (for OBS overlay cross-browser)
    if (apiWriteTimerRef.current) clearTimeout(apiWriteTimerRef.current);
    apiWriteTimerRef.current = setTimeout(() => {
      if (!sessionTokenRef.current) return;
      fetch(`/api/tournaments/${id}/live-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionTokenRef.current}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => { /* ignore network errors */ });
    }, 400);
  }, [players, activePlayer, settings, tournamentName, id, frontendVolume, barneyAnim]);

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
              <label className="block text-gray-400 mb-1">Tournament Name</label>
              <input
                type="text"
                value={tournamentName}
                onChange={e => setTournamentName(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1"
              />
            </div>

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

            {/* OBS Links - Collapsible */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={obsExpanded} onChange={e => setObsExpanded(e.target.checked)} className="accent-green-500" />
                <span>OBS</span>
              </label>
              {obsExpanded && (
                <div className="mt-2 space-y-1.5">
                  <button
                    onClick={() => window.open(`/tournament/${id}/obs-overlay`, '_blank')}
                    className="w-full py-1.5 rounded bg-gray-700 border border-gray-600 hover:bg-gray-600 text-xs text-left px-2"
                  >
                    🎯 Scoreboard Overlay
                  </button>
                  <button
                    onClick={() => window.open(`/tournament/${id}/split-view`, '_blank')}
                    className="w-full py-1.5 rounded bg-gray-700 border border-gray-600 hover:bg-gray-600 text-xs text-left px-2"
                  >
                    ◧ Split Screen
                  </button>
                  <button
                    onClick={() => window.open(`/tournament/${id}/live-viewer`, '_blank')}
                    className="w-full py-1.5 rounded bg-gray-700 border border-gray-600 hover:bg-gray-600 text-xs text-left px-2"
                  >
                    📺 Live View
                  </button>
                </div>
              )}
            </div>

            <button onClick={resetGame} className="w-full py-1.5 rounded bg-red-800 hover:bg-red-700 border border-red-600 text-sm font-semibold">
              Reset Game
            </button>

            {/* Volume Controls - Collapsible */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={volumeExpanded} onChange={e => setVolumeExpanded(e.target.checked)} className="accent-green-500" />
                <span>Volume</span>
              </label>
              {volumeExpanded && (
                <div className="mt-3 flex gap-4 justify-center py-2">
                  {/* Backend Volume */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-400">Backend</span>
                    <div className="flex flex-col-reverse items-center h-32 bg-gray-700 rounded-lg p-1 relative">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={backendVolume}
                        onChange={e => setBackendVolume(parseInt(e.target.value))}
                        className="slider-vertical"
                        style={{
                          writingMode: 'bt-lr' as React.CSSProperties['writingMode'],
                          WebkitAppearance: 'slider-vertical',
                          width: '8px',
                          height: '110px'
                        }}
                      />
                    </div>
                    <span className="text-xs text-green-400 font-semibold">{backendVolume}%</span>
                  </div>

                  {/* Frontend Volume */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-400">Frontend</span>
                    <div className="flex flex-col-reverse items-center h-32 bg-gray-700 rounded-lg p-1 relative">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={frontendVolume}
                        onChange={e => setFrontendVolume(parseInt(e.target.value))}
                        className="slider-vertical"
                        style={{
                          writingMode: 'bt-lr' as React.CSSProperties['writingMode'],
                          WebkitAppearance: 'slider-vertical',
                          width: '8px',
                          height: '110px'
                        }}
                      />
                    </div>
                    <span className="text-xs text-green-400 font-semibold">{frontendVolume}%</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push(`/tournament/${id}/setup`)}
              className="w-full py-1.5 rounded bg-blue-700 hover:bg-blue-600 border border-blue-600 text-sm font-semibold"
            >
              Toernooi Setup
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 p-6 gap-6 relative overflow-hidden">
        {/* Header info */}
        <div className="text-center text-sm text-gray-400">
          Best of {settings.legsEnabled ? `${settings.legs} legs` : ''}{settings.setsEnabled ? ` • ${settings.sets} sets` : ''}
        </div>

        {/* Players row */}
        <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
          {([0, 1] as const).map(i => (
            <PlayerCardSimple
              key={i}
              player={players[i]}
              isActive={activePlayer === i}
              onNameChange={name => updatePlayer(i, { name })}
              onLegsChange={legs => updatePlayer(i, { legs })}
              onSetsChange={sets => updatePlayer(i, { sets })}
              onToggleStarter={() => {
                // Reset leg and set this player as starter and active
                setPlayers(prev => {
                  const next: [PlayerState, PlayerState] = [
                    { ...prev[0], score: settings.startScore, history: [], startedLeg: i === 0 },
                    { ...prev[1], score: settings.startScore, history: [], startedLeg: i === 1 }
                  ];
                  return next;
                });
                setActivePlayer(i);
              }}
            />
          ))}
        </div>

        {/* Central input */}
        <div className="flex-shrink-0 bg-gray-800 rounded-lg border-2 border-gray-700 p-4">
          <div className="text-center text-sm text-gray-400 mb-3">
            {players[activePlayer].name} is aan de beurt
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const score = parseInt(inputValue, 10);
            if (!isNaN(score) && score >= 0) {
              applyScore(activePlayer, score);
              setInputValue('');
            }
          }} className="flex gap-3">
            <button
              type="button"
              onClick={() => handleKey(activePlayer, 'undo')}
              className="px-6 py-4 bg-gray-600 hover:bg-gray-500 rounded-lg text-yellow-300 font-semibold text-lg"
            >
              ↩ Undo
            </button>
            <input
              type="number"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Voer score in en druk enter..."
              className="flex-1 bg-gray-700 border-2 border-gray-600 rounded-lg px-6 py-4 text-center text-2xl font-bold focus:outline-none focus:border-green-500"
              min="0"
              max="180"
              autoFocus
            />
            <button
              type="submit"
              className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-lg text-white font-semibold text-lg"
            >
              Verzenden
            </button>
          </form>
        </div>

        {/* Soundboard */}
        <Soundboard />

        {/* Barney Controls */}
        <BarneyControls onPlay={playBarney} />
      </main>
    </div>
  );
}

// ─── Soundboard ────────────────────────────────────────────────────────────

interface SoundboardEntry {
  id: string;
  label: string;
  src: string;
}

const SOUNDBOARD_ENTRIES: SoundboardEntry[] = [
  { id: 'anthem-chants',    label: 'Anthem\nChants',    src: '/sounds/soundboard/anthem-chants.wav' },
  { id: 'anthem-no-chants', label: 'Anthem\nNo Chants', src: '/sounds/soundboard/anthem-no-chants.wav' },
  // Add more entries here
];

interface WalkOnState {
  label: string;
  url: string | null;
  fileName: string | null;
}

const WALKON_DEFAULTS: WalkOnState[] = [
  { label: 'Walk-on\nSpeler 1', url: null, fileName: null },
  { label: 'Walk-on\nSpeler 2', url: null, fileName: null },
];

function Soundboard() {
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const [playing, setPlaying] = useState<Record<string, boolean>>({});

  // Walk-on state
  const [walkOns, setWalkOns] = useState<WalkOnState[]>(WALKON_DEFAULTS);
  const walkOnAudioRefs = useRef<(HTMLAudioElement | null)[]>([null, null]);
  const walkOnInputRefs = useRef<(HTMLInputElement | null)[]>([null, null]);

  const stopAll = () => {
    Object.values(audioRefs.current).forEach(a => {
      if (a) { a.pause(); a.currentTime = 0; }
    });
    walkOnAudioRefs.current.forEach(a => {
      if (a) { a.pause(); a.currentTime = 0; }
    });
    setPlaying({});
  };

  const toggle = (entry: SoundboardEntry) => {
    let audio = audioRefs.current[entry.id];
    if (!audio) {
      audio = new Audio(entry.src);
      audioRefs.current[entry.id] = audio;
      audio.addEventListener('ended', () => {
        setPlaying(prev => ({ ...prev, [entry.id]: false }));
      });
    }
    if (playing[entry.id]) {
      stopAll();
    } else {
      stopAll();
      audio.currentTime = 0;
      audio.play().catch(() => {});
      setPlaying({ [entry.id]: true });
    }
  };

  const handleWalkOnUpload = (index: number, file: File) => {
    // Revoke previous object URL
    if (walkOns[index].url) URL.revokeObjectURL(walkOns[index].url!);
    const url = URL.createObjectURL(file);
    setWalkOns(prev => prev.map((w, i) =>
      i === index ? { ...w, url, fileName: file.name } : w
    ));
    const id = `walkon-${index}`;
    const audio = new Audio(url);
    audio.addEventListener('ended', () => setPlaying(p => ({ ...p, [id]: false })));
    walkOnAudioRefs.current[index] = audio;
  };

  const toggleWalkOn = (index: number) => {
    const id = `walkon-${index}`;
    const audio = walkOnAudioRefs.current[index];
    if (!audio || !walkOns[index].url) return;
    if (playing[id]) {
      stopAll();
    } else {
      stopAll();
      audio.currentTime = 0;
      audio.play().catch(() => {});
      setPlaying({ [id]: true });
    }
  };

  return (
    <div className="flex-shrink-0 bg-gray-800 rounded-lg border border-gray-700 p-3 flex items-center gap-4">
      <span className="text-xs text-gray-500 uppercase tracking-widest select-none">Soundboard</span>
      <div className="flex gap-3 flex-wrap items-center">
        {/* Fixed soundboard buttons */}
        {SOUNDBOARD_ENTRIES.map(entry => (
          <button
            key={entry.id}
            onClick={() => toggle(entry)}
            title={entry.label.replace('\n', ' ')}
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-center transition-all select-none ${
              playing[entry.id]
                ? 'bg-green-600 border-green-400 shadow-lg shadow-green-900/50 scale-95'
                : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
            }`}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] leading-none">{playing[entry.id] ? '■' : '▶'}</span>
              <span className="text-[8px] leading-tight font-semibold text-white whitespace-pre-line text-center px-1">
                {entry.label}
              </span>
            </div>
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-10 bg-gray-600 mx-1 self-center" />

        {/* Walk-on buttons */}
        {walkOns.map((wo, i) => {
          const id = `walkon-${i}`;
          const isPlaying = !!playing[id];
          const hasFile = !!wo.url;
          return (
            <div key={id} className="flex flex-col items-center gap-1">
              <button
                onClick={() => toggleWalkOn(i)}
                disabled={!hasFile}
                title={wo.fileName ?? wo.label.replace('\n', ' ')}
                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-center transition-all select-none ${
                  isPlaying
                    ? 'bg-amber-600 border-amber-400 shadow-lg shadow-amber-900/50 scale-95'
                    : hasFile
                      ? 'bg-gray-700 border-amber-700 hover:bg-gray-600 hover:border-amber-500'
                      : 'bg-gray-800 border-gray-700 opacity-40 cursor-default'
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] leading-none">{isPlaying ? '■' : '▶'}</span>
                  <span className="text-[8px] leading-tight font-semibold text-white whitespace-pre-line text-center px-1">
                    {wo.label}
                  </span>
                </div>
              </button>
              {/* Upload button */}
              <button
                onClick={() => walkOnInputRefs.current[i]?.click()}
                title={hasFile ? `Huidig: ${wo.fileName}\nKlik om te vervangen` : 'Upload MP3 of WAV'}
                className="text-[9px] text-gray-500 hover:text-amber-400 transition-colors leading-none select-none"
              >
                {hasFile ? '↑ vervangen' : '↑ upload'}
              </button>
              <input
                ref={el => { walkOnInputRefs.current[i] = el; }}
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleWalkOnUpload(i, file);
                  e.target.value = '';
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Barney Overlay ─────────────────────────────────────────────────────────

function BarneyOverlay({ src, onDone }: { src: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <>
      <style>{`
        @keyframes barney-pop {
          0%   { transform: scale(0)    rotate(0deg);    opacity: 0; }
          18%  { transform: scale(1.12) rotate(390deg);  opacity: 1; }
          28%  { transform: scale(1)    rotate(360deg);  opacity: 1; }
          68%  { transform: scale(1)    rotate(360deg);  opacity: 1; }
          88%  { transform: scale(0.6)  rotate(360deg);  opacity: 0.6; }
          100% { transform: scale(0)    rotate(360deg);  opacity: 0; }
        }
      `}</style>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 50,
      }}>
        <img
          src={src}
          alt="Barney"
          style={{
            width: 380, height: 380, objectFit: 'contain',
            animation: 'barney-pop 3.2s ease-in-out forwards',
            filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.85))',
          }}
        />
      </div>
    </>
  );
}

// ─── Barney Controls ─────────────────────────────────────────────────────────

const BARNEY_WIN = [
  { src: '/barney/win-1.png', label: 'Win 1' },
  { src: '/barney/win-2.png', label: 'Win 2' },
  { src: '/barney/win-3.png', label: 'Win 3' },
];

const BARNEY_SAD = [
  { src: '/barney/sad-1.png', label: 'Lose 1' },
  { src: '/barney/sad-2.png', label: 'Lose 2' },
  { src: '/barney/sad-3.png', label: 'Lose 3' },
];

function BarneyControls({ onPlay }: { onPlay: (src: string) => void }) {
  return (
    <div className="flex-shrink-0 bg-gray-800 rounded-lg border border-gray-700 p-3 flex items-center gap-4">
      <span className="text-xs text-gray-500 uppercase tracking-widest select-none">Barney</span>
      <div className="flex gap-3 flex-wrap items-center">
        {/* Win buttons */}
        {BARNEY_WIN.map(b => (
          <button
            key={b.src}
            onClick={() => onPlay(b.src)}
            title={b.label}
            className="w-14 h-14 rounded-full border-2 border-green-600 overflow-hidden hover:border-green-400 hover:scale-105 transition-all select-none"
          >
            <img src={b.src} alt={b.label} className="w-full h-full object-cover" />
          </button>
        ))}

        <div className="w-px h-10 bg-gray-600 mx-1 self-center" />

        {/* Sad/lose buttons */}
        {BARNEY_SAD.map(b => (
          <button
            key={b.src}
            onClick={() => onPlay(b.src)}
            title={b.label}
            className="w-14 h-14 rounded-full border-2 border-red-700 overflow-hidden hover:border-red-500 hover:scale-105 transition-all select-none"
          >
            <img src={b.src} alt={b.label} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Player Card ────────────────────────────────────────────────────────────

interface PlayerCardSimpleProps {
  player: PlayerState;
  isActive: boolean;
  onNameChange: (name: string) => void;
  onLegsChange: (legs: number) => void;
  onSetsChange: (sets: number) => void;
  onToggleStarter: () => void;
}

function PlayerCardSimple({ player, isActive, onNameChange, onLegsChange, onSetsChange, onToggleStarter }: PlayerCardSimpleProps) {
  const checkout = player.score >= 2 && player.score <= 170 ? CHECKOUTS[player.score] : undefined;
  const [editingField, setEditingField] = useState<'legs' | 'sets' | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const startEdit = (field: 'legs' | 'sets') => {
    setEditingField(field);
    setEditValue(String(field === 'legs' ? player.legs : player.sets));
    setTimeout(() => { editInputRef.current?.select(); }, 0);
  };

  const commitEdit = () => {
    const val = parseInt(editValue, 10);
    if (!isNaN(val) && val >= 0) {
      if (editingField === 'legs') onLegsChange(val);
      else if (editingField === 'sets') onSetsChange(val);
    }
    setEditingField(null);
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg p-4 flex flex-col gap-3 min-h-0 border-2 transition-colors ${isActive ? 'border-green-500' : 'border-gray-700'}`}
    >
      {/* Player name with start indicator */}
      <div className="flex items-center justify-center gap-2">
        <input
          type="text"
          value={player.name}
          onChange={e => onNameChange(e.target.value)}
          className="bg-transparent text-center text-xl font-bold border-b-2 border-gray-600 focus:outline-none focus:border-green-500 pb-2 flex-1"
        />
        <button
          onClick={onToggleStarter}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${player.startedLeg ? 'bg-green-500 border-green-400' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
          title="Click to make this player start the leg"
        >
          {player.startedLeg && <span className="text-white font-bold">●</span>}
        </button>
      </div>

      {/* Big score */}
      <div className="text-center text-7xl font-bold leading-none py-2">
        {player.score}
      </div>

      {/* Checkout suggestion */}
      {checkout && (
        <div className="text-center text-green-400 text-base font-mono">
          {checkout}
        </div>
      )}

      {/* Stats row — double-click legs or sets to edit */}
      <div className="flex justify-center gap-6 text-base text-gray-400 py-2">
        {(['legs', 'sets'] as const).map(field => (
          <span key={field}>
            {field === 'legs' ? 'Legs' : 'Sets'}:{' '}
            {editingField === field ? (
              <input
                ref={editInputRef}
                type="number"
                min={0}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                  if (e.key === 'Escape') setEditingField(null);
                }}
                className="w-12 bg-gray-600 border border-green-500 rounded px-1 text-center text-white font-semibold text-sm focus:outline-none"
              />
            ) : (
              <span
                className="text-white font-semibold cursor-pointer hover:text-green-400 transition-colors"
                onDoubleClick={() => startEdit(field)}
                title={`Dubbelklik om ${field} te bewerken`}
              >
                {player[field]}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Score history */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="text-sm text-gray-400 mb-2">Score geschiedenis:</div>
        <div className="space-y-1">
          {player.history.slice().reverse().map((s, i) => (
            <div key={i} className="flex justify-between text-sm bg-gray-700 px-3 py-2 rounded">
              <span className="text-gray-400">#{player.history.length - i}</span>
              <span className="text-white font-semibold">{s}</span>
              <span className="text-gray-500">{player.score + player.history.slice(player.history.length - i).reduce((a, b) => a + b, 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
