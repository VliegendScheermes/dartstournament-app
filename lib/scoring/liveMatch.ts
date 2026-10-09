/**
 * Live match payload shared by the scoreboard (writer), the live-match API and the
 * OBS overlay (reader). Pure helpers only — no React, no browser APIs.
 */

import type { PlayerIndex, X01EventType } from './x01';

/** Last scoring event; the overlay announces it once, when `seq` increases. */
export interface LiveMatchEvent {
  seq: number;
  player: PlayerIndex;
  /** The score as entered (a bust is announced as "no score"). */
  score: number;
  type: X01EventType;
}

/** Barney animation trigger; the overlay plays it once, when `seq` increases. */
export interface LiveMatchBarney {
  seq: number;
  src: string;
}

export interface LiveMatchPayload {
  /** Increases with every update; the API ignores POSTs older than the stored one. */
  seq: number;
  tournamentName: string;
  p1Name: string;
  p1Score: number;
  p1Legs: number;
  p1Sets: number;
  p1Active: boolean;
  p1StartedLeg: boolean;
  p2Name: string;
  p2Score: number;
  p2Legs: number;
  p2Sets: number;
  p2Active: boolean;
  p2StartedLeg: boolean;
  startScore: number;
  legsEnabled: boolean;
  legs: number;
  setsEnabled: boolean;
  sets: number;
  matchWinner: PlayerIndex | null;
  frontendVolume: number;
  lastEvent: LiveMatchEvent | null;
  barney: LiveMatchBarney | null;
}

/**
 * Next sequence number: time based so it keeps increasing across page reloads and
 * devices, and always strictly greater than `previous`.
 */
export function nextSeq(previous: number, now: number = Date.now()): number {
  const prev = Number.isFinite(previous) ? Math.floor(previous) : 0;
  return Math.max(Math.floor(now), prev + 1);
}

/** Score sound to play for an event: a bust is announced as "no score" (0). */
export function announcementScore(event: Pick<LiveMatchEvent, 'type' | 'score'>): number {
  return event.type === 'bust' ? 0 : event.score;
}

/** What the overlay has already seen (sequence numbers of the last event / Barney). */
export interface SeenLiveEvents {
  initialized: boolean;
  eventSeq: number;
  barneySeq: number;
}

export const INITIAL_SEEN_LIVE_EVENTS: SeenLiveEvents = { initialized: false, eventSeq: 0, barneySeq: 0 };

function seqOf(value: { seq?: unknown } | null | undefined): number {
  return value && typeof value.seq === 'number' && Number.isFinite(value.seq) ? value.seq : 0;
}

/**
 * Decides what the overlay should announce / animate for a freshly polled payload.
 * Nothing fires on the first payload (page load) — only events whose seq is higher than
 * the last one seen. Score differences are never used.
 */
export function detectNewLiveEvents(
  seen: SeenLiveEvents,
  data: { lastEvent?: LiveMatchEvent | null; barney?: LiveMatchBarney | null },
): { seen: SeenLiveEvents; announce: LiveMatchEvent | null; barney: LiveMatchBarney | null } {
  const eventSeq = seqOf(data.lastEvent);
  const barneySeq = seqOf(data.barney);
  const announce = seen.initialized && data.lastEvent && eventSeq > seen.eventSeq ? data.lastEvent : null;
  const barney = seen.initialized && data.barney && barneySeq > seen.barneySeq ? data.barney : null;
  return {
    seen: { initialized: true, eventSeq, barneySeq },
    announce,
    barney,
  };
}
