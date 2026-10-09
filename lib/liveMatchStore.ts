/**
 * In-memory store for live match state.
 * Keyed by tournament ID. State persists as long as the Node.js process runs.
 * Written by the scoreboard page (operator); read by the OBS overlay (public).
 *
 * Every write carries a sequence number. Writes with a lower sequence number than the
 * stored one are ignored, so a request that arrives late can never overwrite newer state.
 */

interface LiveMatchEntry {
  seq: number;
  data: unknown;
}

// Module-level singleton — shared across all requests in the same Node.js process
const store = new Map<string, LiveMatchEntry>();

export const liveMatchStore = {
  get(tournamentId: string): unknown {
    return store.get(tournamentId)?.data ?? null;
  },
  /** Sequence number of the stored state, or null when nothing is stored. */
  getSeq(tournamentId: string): number | null {
    return store.get(tournamentId)?.seq ?? null;
  },
  /**
   * Stores `data` unless the stored state has a higher sequence number.
   * Returns false when the write was ignored as stale.
   */
  set(tournamentId: string, data: unknown, seq: number = 0): boolean {
    const current = store.get(tournamentId);
    if (current && seq < current.seq) return false;
    store.set(tournamentId, { seq, data });
    return true;
  },
  clear(tournamentId: string): void {
    store.delete(tournamentId);
  },
};
