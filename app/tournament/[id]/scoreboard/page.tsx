'use client';

import { use, useState, useCallback, useEffect, useRef, useSyncExternalStore, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { soundPlayer } from '@/lib/audio/soundPlayer';
import { createClient } from '@/lib/auth/supabase';
import {
  applyScore,
  canUndo,
  createMatch,
  hasProgress,
  isLegInProgress,
  parseScoreInput,
  restoreState,
  setLegStarter,
  setPlayerCount,
  setStartScore,
  undo,
  type PlayerIndex,
  type X01Error,
  type X01PlayerState,
  type X01State,
} from '@/lib/scoring/x01';
import {
  announcementScore,
  nextSeq,
  CELEBRATION_CLIP,
  type LiveMatchBarney,
  type LiveMatchCelebration,
  type LiveMatchEvent,
  type LiveMatchPayload,
} from '@/lib/scoring/liveMatch';

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

interface GameSettings {
  setsEnabled: boolean;
  sets: number;
  legsEnabled: boolean;
  legs: number;
  p1Link: string;
  p2Link: string;
  /** Play the anthem in the OBS overlay when a leg / set / match is won */
  celebrateLeg: boolean;
  celebrateSet: boolean;
  celebrateMatch: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  setsEnabled: false,
  sets: 3,
  legsEnabled: true,
  legs: 3,
  p1Link: '',
  p2Link: '',
  celebrateLeg: false,
  celebrateSet: false,
  celebrateMatch: false,
};

/** Which win the anthem should play for, or null when none is switched on */
function celebrationReason(
  event: { legWon: boolean; setWon: boolean; matchWon: boolean },
  settings: GameSettings
): LiveMatchCelebration['reason'] | null {
  if (event.matchWon && settings.celebrateMatch) return 'match';
  if (event.setWon && settings.celebrateSet) return 'set';
  if (event.legWon && settings.celebrateLeg) return 'leg';
  return null;
}

// Collapses bursts of changes into one POST; added to the delay before OBS shows a score
const SYNC_DEBOUNCE_MS = 80;

const DEFAULT_NAMES: [string, string] = ['Player One', 'Player Two'];
const DEFAULT_TOURNAMENT_NAME = 'Darts Tournament';
const DEFAULT_VOLUME = 70;

// ─── Persistence (localStorage) ─────────────────────────────────────────────

/** Everything needed to restore the scoreboard after a reload. */
interface StoredScoreboard {
  version: 2;
  /** ?p1=&p2= URL params the match was started with — identifies the match. */
  origin: { p1: string | null; p2: string | null };
  names: [string, string];
  settings: GameSettings;
  /** Full game state including the undo stack. */
  game: X01State;
  tournamentName: string;
  backendVolume: number;
  frontendVolume: number;
}

const storageKey = (id: string) => `darts-scoreboard-${id}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

function readSettings(value: unknown): GameSettings {
  const v = isRecord(value) ? value : {};
  return {
    setsEnabled: asBoolean(v.setsEnabled, DEFAULT_SETTINGS.setsEnabled),
    sets: asNumber(v.sets, DEFAULT_SETTINGS.sets),
    legsEnabled: asBoolean(v.legsEnabled, DEFAULT_SETTINGS.legsEnabled),
    legs: asNumber(v.legs, DEFAULT_SETTINGS.legs),
    p1Link: asString(v.p1Link) ?? '',
    p2Link: asString(v.p2Link) ?? '',
    celebrateLeg: asBoolean(v.celebrateLeg, DEFAULT_SETTINGS.celebrateLeg),
    celebrateSet: asBoolean(v.celebrateSet, DEFAULT_SETTINGS.celebrateSet),
    celebrateMatch: asBoolean(v.celebrateMatch, DEFAULT_SETTINGS.celebrateMatch),
  };
}

function readVolume(value: unknown): number {
  const volume = asNumber(value, DEFAULT_VOLUME);
  return volume >= 0 && volume <= 100 ? volume : DEFAULT_VOLUME;
}

function readStoredScoreboard(id: string): StoredScoreboard | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    const data: unknown = raw ? JSON.parse(raw) : null;
    // Older versions stored only the OBS payload — nothing to restore from that
    if (!isRecord(data) || data.version !== 2) return null;
    const game = restoreState(data.game);
    if (!game) return null;
    const origin = isRecord(data.origin) ? data.origin : {};
    const names = Array.isArray(data.names) ? data.names : [];
    return {
      version: 2,
      origin: { p1: asString(origin.p1), p2: asString(origin.p2) },
      names: [asString(names[0]) ?? DEFAULT_NAMES[0], asString(names[1]) ?? DEFAULT_NAMES[1]],
      settings: readSettings(data.settings),
      game,
      tournamentName: asString(data.tournamentName) ?? DEFAULT_TOURNAMENT_NAME,
      backendVolume: readVolume(data.backendVolume),
      frontendVolume: readVolume(data.frontendVolume),
    };
  } catch {
    return null;
  }
}

/**
 * Initial scoreboard: the stored match when it is the same match (no ?p1=&p2= given, or the
 * same players), otherwise a new match that keeps the format, 501/301, volumes and title.
 */
function loadInitialScoreboard(id: string): StoredScoreboard {
  const searchParams = new URLSearchParams(window.location.search);
  const p1 = searchParams.get('p1') || null;
  const p2 = searchParams.get('p2') || null;
  const stored = readStoredScoreboard(id);

  if (stored) {
    const noParams = p1 === null && p2 === null;
    const sameOrigin = stored.origin.p1 === p1 && stored.origin.p2 === p2;
    const sameNames = (p1 === null || stored.names[0] === p1) && (p2 === null || stored.names[1] === p2);
    if (noParams || sameOrigin || sameNames) return stored;
  }

  return {
    version: 2,
    origin: { p1, p2 },
    names: [p1 ?? DEFAULT_NAMES[0], p2 ?? DEFAULT_NAMES[1]],
    settings: stored?.settings ?? DEFAULT_SETTINGS,
    game: createMatch(stored?.game.startScore ?? 501),
    tournamentName: stored?.tournamentName ?? DEFAULT_TOURNAMENT_NAME,
    backendVolume: stored?.backendVolume ?? DEFAULT_VOLUME,
    frontendVolume: stored?.frontendVolume ?? DEFAULT_VOLUME,
  };
}

function scoreErrorMessage(error: X01Error, score: number | null): string {
  switch (error) {
    case 'invalid':
      return 'Invalid score (0–180)';
    case 'impossible-score':
      return `${score} is not a possible score`;
    case 'impossible-checkout':
      return `${score} is not a possible checkout`;
    case 'match-over':
      return 'Match is over — Undo or start a new match';
  }
}

// Input types that take no typed text: keys pressed while one of these has focus go to the score input
const NON_TEXT_INPUT_TYPES = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit']);

function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(target.type);
  return target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

interface ScoreboardPageProps {
  params: Promise<{ id: string }>;
}

const subscribeNoop = () => () => {};

export default function ScoreboardPage({ params }: ScoreboardPageProps) {
  const { id } = use(params);
  // The match is restored from localStorage, so the scoreboard renders on the client only:
  // no 501/501 flash after a reload and no hydration mismatch.
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!isClient) return <div className="h-screen bg-gray-900" />;
  return <Scoreboard id={id} />;
}

function Scoreboard({ id }: { id: string }) {
  const router = useRouter();
  const [initial] = useState(() => loadInitialScoreboard(id));

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tournamentName, setTournamentName] = useState(initial.tournamentName);
  const [settings, setSettings] = useState<GameSettings>(initial.settings);
  const [names, setNames] = useState<[string, string]>(initial.names);
  const [game, setGame] = useState<X01State>(initial.game);
  // Last score event / Barney trigger for the OBS overlay (each announced once, by seq)
  const [lastEvent, setLastEvent] = useState<LiveMatchEvent | null>(null);
  const [barney, setBarney] = useState<LiveMatchBarney | null>(null);
  const [celebration, setCelebration] = useState<LiveMatchCelebration | null>(null);
  const [message, setMessage] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [backendVolume, setBackendVolume] = useState(initial.backendVolume); // 0-100
  const [frontendVolume, setFrontendVolume] = useState(initial.frontendVolume); // 0-100
  const [volumeExpanded, setVolumeExpanded] = useState(true);
  const [obsExpanded, setObsExpanded] = useState(false);

  const scoreInputRef = useRef<HTMLInputElement>(null);
  const scoreFormRef = useRef<HTMLFormElement>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payloadSeqRef = useRef(0);

  const matchOver = game.matchWinner !== null;

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setMessage(''), 2000);
  }, []);

  const playBarney = (src: string) => setBarney({ seq: nextSeq(barney?.seq ?? 0), src });

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

  // Preload common sounds on mount and set initial volume
  useEffect(() => {
    soundPlayer.preloadCommonSounds();
    soundPlayer.setVolume(backendVolume / 100);
    soundPlayer.setEnabled(backendVolume > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single scoring path: the visible input + form submit (keyboard input is routed here too)
  const submitScore = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (game.matchWinner !== null) {
      showMessage(scoreErrorMessage('match-over', null));
      return;
    }
    if (inputValue.trim() === '') return;
    const score = parseScoreInput(inputValue);
    if (score === null) {
      showMessage(scoreErrorMessage('invalid', null));
      return;
    }
    const result = applyScore(game, score, settings);
    if (!result.ok) {
      showMessage(scoreErrorMessage(result.error, score));
      return;
    }

    const { event } = result;
    setGame(result.state);
    setInputValue('');
    setLastEvent({ seq: nextSeq(lastEvent?.seq ?? 0), player: event.player, score: event.score, type: event.type });
    // Announce after evaluating: a bust is announced as "no score" (0)
    soundPlayer.playScore(announcementScore(event));

    // Anthem in the OBS overlay for whichever wins the operator switched on
    const reason = celebrationReason(event, settings);
    if (reason) {
      setCelebration({ seq: nextSeq(celebration?.seq ?? 0), src: CELEBRATION_CLIP, reason });
    }

    const name = names[event.player];
    if (event.type === 'bust') {
      showMessage(event.bustReason === 'leaves-one' ? 'Bust! (leaves 1)' : 'Bust!');
    } else if (event.matchWon) {
      showMessage(`${name} wins the match! 🏆`);
    } else if (event.setWon) {
      showMessage(`${name} wins the set! 🎯`);
    } else if (event.legWon) {
      showMessage(`${name} wins the leg! 🎯`);
    }
  };

  // Restores the complete previous state (scores, legs, sets, turn, starter, match win). No sound.
  const handleUndo = () => {
    if (!canUndo(game)) return;
    setGame(undo(game));
    scoreInputRef.current?.focus();
  };

  // New match: clears the stored match (incl. undo history); keeps names, format and 501/301
  const startNewMatch = () => {
    try {
      localStorage.removeItem(storageKey(id));
    } catch {
      // storage unavailable
    }
    setGame(createMatch(game.startScore));
    setLastEvent(null);
    setInputValue('');
  };

  const resetGame = () => {
    if (hasProgress(game) && !window.confirm('Match resetten? Scores, legs, sets en de undo-geschiedenis worden gewist.')) return;
    startNewMatch();
  };

  const handleStartScoreChange = (value: 501 | 301) => {
    if (value === game.startScore) return;
    if (isLegInProgress(game) && !window.confirm(`De leg is bezig. Overschakelen naar ${value} wist de scores van deze leg. Doorgaan?`)) return;
    setGame(setStartScore(game, value));
  };

  const handleToggleStarter = (player: PlayerIndex) => {
    if (game.legStarter === player) return;
    if (game.matchWinner !== null) {
      showMessage('Match is over — start a new match first');
      return;
    }
    if (isLegInProgress(game) && !window.confirm(`De leg is bezig. ${names[player]} laten beginnen wist de scores van deze leg. Doorgaan?`)) return;
    setGame(setLegStarter(game, player));
  };

  const handleSettingChange = <K extends keyof GameSettings>(field: K, value: GameSettings[K]) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  // Keyboard/numpad: keys pressed outside a text field are routed to the visible score input
  // and Enter submits that same form — there is no second scoring path.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const input = scoreInputRef.current;
      const form = scoreFormRef.current;
      if (!input || !form) return;

      if (e.target === input) {
        // Typing and Enter (form submit) are handled natively by the input itself
        if (e.key === 'Escape') {
          e.preventDefault();
          setInputValue('');
        }
        return;
      }
      // Don't intercept other text fields (names, settings, legs/sets editor)
      if (isTextEntry(e.target)) return;

      if (e.key === 'Enter') {
        // (Numpad) Enter never "clicks" a focused button — it submits the score
        e.preventDefault();
        if (!input.disabled) {
          input.focus();
          form.requestSubmit();
        }
        return;
      }
      if (input.disabled) return;

      const digit = /^[0-9]$/.test(e.key) ? e.key : /^Numpad[0-9]$/.test(e.code) ? e.code.slice(6) : null;
      if (digit !== null) {
        e.preventDefault();
        input.focus();
        setInputValue(v => v + digit);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        input.focus();
        setInputValue(v => v.slice(0, -1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setInputValue('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Persist the full match (incl. undo stack) so a reload restores it
  useEffect(() => {
    const stored: StoredScoreboard = {
      version: 2,
      origin: initial.origin,
      names,
      settings,
      game,
      tournamentName,
      backendVolume,
      frontendVolume,
    };
    try {
      localStorage.setItem(storageKey(id), JSON.stringify(stored));
    } catch {
      // storage full or unavailable — the match still runs, it just won't survive a reload
    }
  }, [id, initial.origin, names, settings, game, tournamentName, backendVolume, frontendVolume]);

  // Debounced sync to the API for the OBS overlay (cross-browser). The first sync already
  // carries the restored match. Each payload gets a higher seq so the API can drop
  // requests that arrive out of order. The delay only collapses bursts (e.g. dragging a
  // volume slider) — keep it short, it is added to the delay before OBS shows a score.
  useEffect(() => {
    const seq = nextSeq(payloadSeqRef.current);
    payloadSeqRef.current = seq;
    const payload: LiveMatchPayload = {
      seq,
      tournamentName,
      p1Name: names[0],
      p1Score: game.players[0].score,
      p1Legs: game.players[0].legs,
      p1Sets: game.players[0].sets,
      p1Active: game.matchWinner === null && game.activePlayer === 0,
      p1StartedLeg: game.legStarter === 0,
      p2Name: names[1],
      p2Score: game.players[1].score,
      p2Legs: game.players[1].legs,
      p2Sets: game.players[1].sets,
      p2Active: game.matchWinner === null && game.activePlayer === 1,
      p2StartedLeg: game.legStarter === 1,
      startScore: game.startScore,
      legsEnabled: settings.legsEnabled,
      legs: settings.legs,
      setsEnabled: settings.setsEnabled,
      sets: settings.sets,
      matchWinner: game.matchWinner,
      frontendVolume,
      lastEvent,
      barney,
      celebration,
    };

    // Token is fetched fresh each time — Supabase auto-refreshes expired tokens.
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        await fetch(`/api/tournaments/${id}/live-match`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch {
        // ignore network errors
      }
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [id, tournamentName, names, game, settings.legsEnabled, settings.legs, settings.setsEnabled, settings.sets, frontendVolume, lastEvent, barney, celebration]);

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
                  <button key={v} onClick={() => handleStartScoreChange(v)} className={`flex-1 py-1 rounded font-semibold text-sm border ${game.startScore === v ? 'bg-green-600 border-green-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>{v}</button>
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

                  {/* Anthem in the overlay when a leg, set or match is won */}
                  <div className="pt-2 mt-1 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-1.5">Muziek bij winst (in de overlay)</p>
                    <label className="flex items-center gap-2 py-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.celebrateLeg}
                        onChange={e => handleSettingChange('celebrateLeg', e.target.checked)}
                        className="accent-green-500"
                      />
                      <span className="text-xs">Gewonnen leg</span>
                    </label>
                    <label className="flex items-center gap-2 py-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.celebrateSet}
                        onChange={e => handleSettingChange('celebrateSet', e.target.checked)}
                        className="accent-green-500"
                      />
                      <span className="text-xs">Gewonnen set</span>
                    </label>
                    <label className="flex items-center gap-2 py-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.celebrateMatch}
                        onChange={e => handleSettingChange('celebrateMatch', e.target.checked)}
                        className="accent-green-500"
                      />
                      <span className="text-xs">Einde wedstrijd</span>
                    </label>
                    <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                      Chase the Sun, 20 seconden. Speelt in de OBS-overlay, niet op deze laptop.
                    </p>
                  </div>
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
                <div className="mt-3 flex gap-6 justify-center py-2">
                  {/* Backend Volume — controls laptop sound */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-400">Backend 💻</span>
                    <div className="h-32 flex items-center justify-center overflow-hidden" style={{ width: '24px' }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={backendVolume}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setBackendVolume(val);
                          soundPlayer.setVolume(val / 100);
                          soundPlayer.setEnabled(val > 0);
                        }}
                        style={{ transform: 'rotate(-90deg)', width: '110px', cursor: 'pointer' }}
                      />
                    </div>
                    <span className="text-xs text-green-400 font-semibold">{backendVolume}%</span>
                  </div>

                  {/* Frontend Volume — controls OBS sound */}
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-400">OBS 📺</span>
                    <div className="h-32 flex items-center justify-center overflow-hidden" style={{ width: '24px' }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={frontendVolume}
                        onChange={e => setFrontendVolume(parseInt(e.target.value))}
                        style={{ transform: 'rotate(-90deg)', width: '110px', cursor: 'pointer' }}
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
              name={names[i]}
              player={game.players[i]}
              isActive={!matchOver && game.activePlayer === i}
              isStarter={game.legStarter === i}
              isWinner={game.matchWinner === i}
              onNameChange={name => setNames(prev => (i === 0 ? [name, prev[1]] : [prev[0], name]))}
              onLegsChange={legs => setGame(g => setPlayerCount(g, i, 'legs', legs))}
              onSetsChange={sets => setGame(g => setPlayerCount(g, i, 'sets', sets))}
              onToggleStarter={() => handleToggleStarter(i)}
            />
          ))}
        </div>

        {/* Central input */}
        <div className="flex-shrink-0 bg-gray-800 rounded-lg border-2 border-gray-700 p-4">
          {game.matchWinner !== null ? (
            <div className="flex items-center justify-center gap-4 mb-3">
              <span className="text-yellow-300 font-bold text-lg">
                🏆 {names[game.matchWinner]} heeft de match gewonnen!
              </span>
              <button
                type="button"
                onClick={startNewMatch}
                className="px-4 py-1.5 rounded bg-green-600 hover:bg-green-500 text-sm font-semibold"
              >
                Nieuwe match
              </button>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-400 mb-3">
              {names[game.activePlayer]} is aan de beurt
            </div>
          )}
          <form ref={scoreFormRef} onSubmit={submitScore} className="flex gap-3">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo(game)}
              className="px-6 py-4 bg-gray-600 hover:bg-gray-500 rounded-lg text-yellow-300 font-semibold text-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ↩ Undo
            </button>
            <input
              ref={scoreInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={matchOver ? 'Match afgelopen' : 'Voer score in en druk enter...'}
              disabled={matchOver}
              className="flex-1 bg-gray-700 border-2 border-gray-600 rounded-lg px-6 py-4 text-center text-2xl font-bold focus:outline-none focus:border-green-500 disabled:opacity-50"
              autoFocus
            />
            <button
              type="submit"
              disabled={matchOver}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 rounded-lg text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
  name: string;
  player: X01PlayerState;
  isActive: boolean;
  isStarter: boolean;
  isWinner: boolean;
  onNameChange: (name: string) => void;
  onLegsChange: (legs: number) => void;
  onSetsChange: (sets: number) => void;
  onToggleStarter: () => void;
}

function PlayerCardSimple({ name, player, isActive, isStarter, isWinner, onNameChange, onLegsChange, onSetsChange, onToggleStarter }: PlayerCardSimpleProps) {
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
      className={`bg-gray-800 rounded-lg p-4 flex flex-col gap-3 min-h-0 border-2 transition-colors ${isWinner ? 'border-yellow-400' : isActive ? 'border-green-500' : 'border-gray-700'}`}
    >
      {/* Player name with start indicator */}
      <div className="flex items-center justify-center gap-2">
        {isWinner && <span className="text-2xl" title="Match gewonnen">🏆</span>}
        <input
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          className="bg-transparent text-center text-xl font-bold border-b-2 border-gray-600 focus:outline-none focus:border-green-500 pb-2 flex-1"
        />
        <button
          onClick={onToggleStarter}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${isStarter ? 'bg-green-500 border-green-400' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
          title="Click to make this player start the leg"
        >
          {isStarter && <span className="text-white font-bold">●</span>}
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
          {player.history.slice().reverse().map((turn, i) => (
            <div key={player.history.length - i} className="flex justify-between text-sm bg-gray-700 px-3 py-2 rounded">
              <span className="text-gray-400">#{player.history.length - i}</span>
              {turn.bust ? (
                <span className="text-red-400 font-semibold">
                  Bust <span className="text-gray-500 font-normal">({turn.score})</span>
                </span>
              ) : (
                <span className="text-white font-semibold">{turn.score}</span>
              )}
              <span className="text-gray-500">{turn.remaining}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
