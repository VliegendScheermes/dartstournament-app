/**
 * In-memory store for live match state.
 * Keyed by tournament ID. State persists as long as the Node.js process runs.
 * Written by the scoreboard page (operator); read by the OBS overlay (public).
 */

// Module-level singleton — shared across all requests in the same Node.js process
const store = new Map<string, unknown>();

export const liveMatchStore = {
  get(tournamentId: string): unknown {
    return store.get(tournamentId) ?? null;
  },
  set(tournamentId: string, data: unknown): void {
    store.set(tournamentId, data);
  },
  clear(tournamentId: string): void {
    store.delete(tournamentId);
  },
};
