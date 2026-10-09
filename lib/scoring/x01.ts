/**
 * X01 (501/301) darts scoring rules — pure functions, no React, no browser APIs.
 *
 * Every action takes the current state and returns a new state. Actions that change
 * the game push a snapshot of the previous state on `undoStack`, so `undo` restores the
 * complete previous state: both players' scores, legs, sets and histories, the active
 * player, the leg/set starters, the start score and the match winner.
 *
 * Throw order (standard darts): the throw alternates every leg regardless of who won.
 * With sets, legs alternate within a set and the first leg of each new set is started by
 * the player who did not start the first leg of the previous set.
 */

export type PlayerIndex = 0 | 1;

/** One visit to the board (up to 3 darts) in the current leg. */
export interface X01Turn {
  /** The score as entered. For a bust nothing is deducted. */
  score: number;
  /** Remaining score after this turn. */
  remaining: number;
  bust: boolean;
}

export interface X01PlayerState {
  /** Remaining score in the current leg. */
  score: number;
  legs: number;
  sets: number;
  /** Turns thrown in the current leg. */
  history: X01Turn[];
}

/** The game at one moment — exactly what `undo` restores. */
export interface X01Snapshot {
  startScore: number;
  players: [X01PlayerState, X01PlayerState];
  activePlayer: PlayerIndex;
  /** Player who throws first in the current leg. */
  legStarter: PlayerIndex;
  /** Player who threw first in the first leg of the current set (the match starter without sets). */
  setStarter: PlayerIndex;
  matchWinner: PlayerIndex | null;
}

export interface X01State extends X01Snapshot {
  /** Previous snapshots, oldest first (capped at MAX_UNDO). */
  undoStack: X01Snapshot[];
}

/** Match format: "best of N legs" and optionally "best of S sets". */
export interface X01Format {
  legsEnabled: boolean;
  legs: number;
  setsEnabled: boolean;
  sets: number;
}

export type X01EventType = 'score' | 'bust' | 'checkout';

export interface X01Event {
  type: X01EventType;
  player: PlayerIndex;
  /** The score as entered (for a bust nothing was deducted). */
  score: number;
  /** Remaining score of `player` after the turn (unchanged on a bust, 0 on a checkout). */
  remaining: number;
  bustReason?: 'below-zero' | 'leaves-one';
  legWon: boolean;
  setWon: boolean;
  matchWon: boolean;
}

export type X01Error =
  | 'invalid'             // not an integer between 0 and 180
  | 'impossible-score'    // a 3-dart total that cannot be thrown (179, 178, ...)
  | 'impossible-checkout' // would finish the leg from a value that cannot be checked out
  | 'match-over';         // the match has been won; only undo / a new match are allowed

export type ApplyScoreResult =
  | { ok: true; state: X01State; event: X01Event }
  | { ok: false; error: X01Error };

export const MAX_SCORE = 180;
export const MAX_CHECKOUT = 170;
export const MAX_UNDO = 200;

/** 3-dart totals between 0 and 180 that cannot be thrown. */
export const IMPOSSIBLE_SCORES: readonly number[] = [163, 166, 169, 172, 173, 175, 176, 178, 179];

/** Values of 170 or less that cannot be checked out (the last dart must be a double). */
export const BOGEY_CHECKOUTS: readonly number[] = [159, 162, 163, 165, 166, 168, 169];

const IMPOSSIBLE_SET = new Set(IMPOSSIBLE_SCORES);
const BOGEY_SET = new Set(BOGEY_CHECKOUTS);

export function otherPlayer(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

export function isPossibleScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= MAX_SCORE && !IMPOSSIBLE_SET.has(score);
}

export function isValidCheckout(score: number): boolean {
  return Number.isInteger(score) && score >= 2 && score <= MAX_CHECKOUT && !BOGEY_SET.has(score);
}

/** Parses typed input: digits only ("1e2", "6.0", "-5" and "" are rejected with null). */
export function parseScoreInput(raw: string): number | null {
  const value = raw.trim();
  if (!/^\d+$/.test(value)) return null;
  return parseInt(value, 10);
}

/** Wins needed in a "best of N": floor(N / 2) + 1. */
export function winsNeeded(bestOf: number): number {
  const n = Number.isFinite(bestOf) && bestOf >= 1 ? Math.floor(bestOf) : 1;
  return Math.floor(n / 2) + 1;
}

/** Legs needed to win a set (sets on) or the match (sets off); null = no leg target. */
export function legsToWin(format: X01Format): number | null {
  if (format.legsEnabled) return winsNeeded(format.legs);
  // Sets without a legs format: every leg decides a set.
  return format.setsEnabled ? 1 : null;
}

/** Sets needed to win the match; null when sets are off. */
export function setsToWin(format: X01Format): number | null {
  return format.setsEnabled ? winsNeeded(format.sets) : null;
}

function isValidStartScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 2;
}

function newPlayer(startScore: number): X01PlayerState {
  return { score: startScore, legs: 0, sets: 0, history: [] };
}

export function createMatch(startScore: number = 501, starter: PlayerIndex = 0): X01State {
  const start = isValidStartScore(startScore) ? startScore : 501;
  return {
    startScore: start,
    players: [newPlayer(start), newPlayer(start)],
    activePlayer: starter,
    legStarter: starter,
    setStarter: starter,
    matchWinner: null,
    undoStack: [],
  };
}

function snapshotOf(state: X01Snapshot): X01Snapshot {
  return {
    startScore: state.startScore,
    players: state.players,
    activePlayer: state.activePlayer,
    legStarter: state.legStarter,
    setStarter: state.setStarter,
    matchWinner: state.matchWinner,
  };
}

/** Undo stack with the current state pushed on top. */
function pushUndo(state: X01State): X01Snapshot[] {
  const stack = [...state.undoStack, snapshotOf(state)];
  return stack.length > MAX_UNDO ? stack.slice(stack.length - MAX_UNDO) : stack;
}

function replacePlayer(
  players: [X01PlayerState, X01PlayerState],
  index: PlayerIndex,
  player: X01PlayerState,
): [X01PlayerState, X01PlayerState] {
  return index === 0 ? [player, players[1]] : [players[0], player];
}

/** Both players back to the start score with an empty leg history (legs/sets kept). */
function freshLeg(
  players: [X01PlayerState, X01PlayerState],
  startScore: number,
  resetLegs: boolean = false,
): [X01PlayerState, X01PlayerState] {
  const reset = (p: X01PlayerState): X01PlayerState => ({
    ...p,
    score: startScore,
    history: [],
    legs: resetLegs ? 0 : p.legs,
  });
  return [reset(players[0]), reset(players[1])];
}

export function canUndo(state: X01State): boolean {
  return state.undoStack.length > 0;
}

/** Restores the complete previous state. Returns the same state when there is nothing to undo. */
export function undo(state: X01State): X01State {
  if (state.undoStack.length === 0) return state;
  const previous = state.undoStack[state.undoStack.length - 1];
  return { ...snapshotOf(previous), undoStack: state.undoStack.slice(0, -1) };
}

/** True when a turn has been entered in the current leg (and the match is still running). */
export function isLegInProgress(state: X01Snapshot): boolean {
  return state.matchWinner === null
    && (state.players[0].history.length > 0 || state.players[1].history.length > 0);
}

/** True when anything has happened in this match (a reset would lose something). */
export function hasProgress(state: X01Snapshot): boolean {
  return state.matchWinner !== null
    || state.players.some(p => p.history.length > 0 || p.legs > 0 || p.sets > 0);
}

/**
 * Applies a 3-dart score for the active player.
 * - Invalid / impossible scores and impossible checkouts are rejected (state unchanged).
 * - Remaining below 0 or exactly 1 is a bust: score unchanged, the turn passes.
 * - Remaining 0 wins the leg, and possibly the set and the match.
 */
export function applyScore(state: X01State, score: number, format: X01Format): ApplyScoreResult {
  if (state.matchWinner !== null) return { ok: false, error: 'match-over' };
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return { ok: false, error: 'invalid' };
  if (!isPossibleScore(score)) return { ok: false, error: 'impossible-score' };

  const p = state.activePlayer;
  const player = state.players[p];
  const remaining = player.score - score;

  if (remaining === 0 && !isValidCheckout(score)) return { ok: false, error: 'impossible-checkout' };

  const undoStack = pushUndo(state);

  if (remaining < 0 || remaining === 1) {
    const players = replacePlayer(state.players, p, {
      ...player,
      history: [...player.history, { score, remaining: player.score, bust: true }],
    });
    return {
      ok: true,
      state: { ...state, players, activePlayer: otherPlayer(p), undoStack },
      event: {
        type: 'bust',
        player: p,
        score,
        remaining: player.score,
        bustReason: remaining < 0 ? 'below-zero' : 'leaves-one',
        legWon: false,
        setWon: false,
        matchWon: false,
      },
    };
  }

  if (remaining > 0) {
    const players = replacePlayer(state.players, p, {
      ...player,
      score: remaining,
      history: [...player.history, { score, remaining, bust: false }],
    });
    return {
      ok: true,
      state: { ...state, players, activePlayer: otherPlayer(p), undoStack },
      event: { type: 'score', player: p, score, remaining, legWon: false, setWon: false, matchWon: false },
    };
  }

  return finishLeg(state, p, score, format, undoStack);
}

function finishLeg(
  state: X01State,
  winner: PlayerIndex,
  score: number,
  format: X01Format,
  undoStack: X01Snapshot[],
): ApplyScoreResult {
  const before = state.players[winner];
  let players = replacePlayer(state.players, winner, {
    ...before,
    score: 0,
    legs: before.legs + 1,
    history: [...before.history, { score, remaining: 0, bust: false }],
  });

  const legTarget = legsToWin(format);
  const setTarget = setsToWin(format);
  let setWon = false;
  let matchWon = false;

  if (setTarget !== null) {
    if (legTarget !== null && players[winner].legs >= legTarget) {
      setWon = true;
      players = replacePlayer(players, winner, { ...players[winner], sets: players[winner].sets + 1 });
      matchWon = players[winner].sets >= setTarget;
    }
  } else if (legTarget !== null) {
    matchWon = players[winner].legs >= legTarget;
  }

  const event: X01Event = { type: 'checkout', player: winner, score, remaining: 0, legWon: true, setWon, matchWon };

  if (matchWon) {
    // Keep the final leg on screen (winner on 0, final legs/sets); further scores are blocked.
    return { ok: true, state: { ...state, players, matchWinner: winner, undoStack }, event };
  }

  // Next leg: the throw alternates every leg regardless of who won. A new set is started by
  // the player who did not start the first leg of the previous set; legs reset per set.
  const setStarter = setWon ? otherPlayer(state.setStarter) : state.setStarter;
  const legStarter = setWon ? setStarter : otherPlayer(state.legStarter);

  return {
    ok: true,
    state: {
      ...state,
      players: freshLeg(players, state.startScore, setWon),
      activePlayer: legStarter,
      legStarter,
      setStarter,
      matchWinner: null,
      undoStack,
    },
    event,
  };
}

/**
 * Switches 501/301. A running leg restarts at the new start score (legs/sets are kept);
 * after a match win only the start score for the next match changes. Undoable.
 */
export function setStartScore(state: X01State, startScore: number): X01State {
  if (!isValidStartScore(startScore) || startScore === state.startScore) return state;
  const undoStack = pushUndo(state);
  if (state.matchWinner !== null) return { ...state, startScore, undoStack };
  return {
    ...state,
    startScore,
    players: freshLeg(state.players, startScore),
    activePlayer: state.legStarter,
    undoStack,
  };
}

/**
 * Makes `player` start the current leg (restarting it). The set starter is derived from
 * the number of legs already played so the alternation stays consistent. Undoable.
 * No-op when `player` already starts the leg or the match is over.
 */
export function setLegStarter(state: X01State, player: PlayerIndex): X01State {
  if (state.matchWinner !== null || player === state.legStarter) return state;
  const legsPlayed = state.players[0].legs + state.players[1].legs;
  return {
    ...state,
    players: freshLeg(state.players, state.startScore),
    activePlayer: player,
    legStarter: player,
    setStarter: legsPlayed % 2 === 0 ? player : otherPlayer(player),
    undoStack: pushUndo(state),
  };
}

/** Manual correction of a player's legs or sets (does not decide legs/sets/matches). Undoable. */
export function setPlayerCount(
  state: X01State,
  player: PlayerIndex,
  field: 'legs' | 'sets',
  value: number,
): X01State {
  if (!Number.isInteger(value) || value < 0 || state.players[player][field] === value) return state;
  return {
    ...state,
    players: replacePlayer(state.players, player, { ...state.players[player], [field]: value }),
    undoStack: pushUndo(state),
  };
}

// ─── Restoring persisted state ──────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPlayerIndex(value: unknown): value is PlayerIndex {
  return value === 0 || value === 1;
}

function parseTurn(value: unknown): X01Turn | null {
  if (!isRecord(value)) return null;
  const { score, remaining, bust } = value;
  if (!isCount(score) || !isCount(remaining) || typeof bust !== 'boolean') return null;
  return { score, remaining, bust };
}

function parsePlayer(value: unknown): X01PlayerState | null {
  if (!isRecord(value)) return null;
  const { score, legs, sets, history } = value;
  if (!isCount(score) || !isCount(legs) || !isCount(sets) || !Array.isArray(history)) return null;
  const turns: X01Turn[] = [];
  for (const item of history) {
    const turn = parseTurn(item);
    if (!turn) return null;
    turns.push(turn);
  }
  return { score, legs, sets, history: turns };
}

function parseSnapshot(value: unknown): X01Snapshot | null {
  if (!isRecord(value)) return null;
  const { startScore, players, activePlayer, legStarter, setStarter, matchWinner } = value;
  if (!isValidStartScore(startScore)) return null;
  if (!Array.isArray(players) || players.length !== 2) return null;
  const p0 = parsePlayer(players[0]);
  const p1 = parsePlayer(players[1]);
  if (!p0 || !p1) return null;
  if (!isPlayerIndex(activePlayer) || !isPlayerIndex(legStarter) || !isPlayerIndex(setStarter)) return null;
  if (matchWinner !== null && !isPlayerIndex(matchWinner)) return null;
  return { startScore, players: [p0, p1], activePlayer, legStarter, setStarter, matchWinner };
}

/**
 * Validates a state read from storage (e.g. JSON.parse output). Returns null when the
 * state itself is unusable; a corrupt undo stack is dropped but the state is kept.
 */
export function restoreState(value: unknown): X01State | null {
  const snapshot = parseSnapshot(value);
  if (!snapshot || !isRecord(value)) return null;
  const rawStack = value.undoStack;
  if (!Array.isArray(rawStack)) return { ...snapshot, undoStack: [] };
  const undoStack: X01Snapshot[] = [];
  for (const item of rawStack.slice(-MAX_UNDO)) {
    const previous = parseSnapshot(item);
    if (!previous) return { ...snapshot, undoStack: [] };
    undoStack.push(previous);
  }
  return { ...snapshot, undoStack };
}
