/**
 * Tournament Store - Zustand State Management
 * Manages all tournament data with API persistence
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '@/lib/api/client';
import {
  Tournament,
  TournamentSettings,
  Player,
  Pool,
  Match,
  Round,
  StandingsRow,
  DrawState,
  DEFAULT_TOURNAMENT_SETTINGS,
} from '@/types/tournament';

// API Response Types
interface ApiTournament {
  id: string;
  userId: string;
  tournamentName: string;
  numPools: number;
  numBoards: number;
  advanceToCrossFinals: number;
  advanceToLosersFinal: number;
  useClasses: boolean;
  liveDrawDelaySeconds: number;
  youtubeStreamUrl: string | null;
  status: string;
  drawState: any;
  createdAt: string;
  updatedAt: string;
  players?: any[];
  pools?: any[];
  matches?: any[];
  rounds?: any[];
}

// Store State Interface
interface TournamentStore {
  tournaments: Tournament[];
  currentTournamentId: string | null;
  isLoading: boolean;
  error: string | null;

  // API Loading Actions
  loadTournaments: () => Promise<void>;
  loadTournament: (id: string) => Promise<void>;
  loadTournamentPublic: (id: string) => Promise<void>;

  // Actions
  createTournament: (name?: string) => Promise<string>;
  updateTournament: (id: string, updates: Partial<Tournament>) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  archiveTournament: (id: string) => Promise<void>;
  setCurrentTournament: (id: string | null) => void;

  // Settings Actions
  updateSettings: (id: string, settings: Partial<TournamentSettings>) => Promise<void>;

  // Player Actions
  addPlayer: (tournamentId: string, player: Omit<Player, 'id'>) => Promise<void>;
  updatePlayer: (tournamentId: string, playerId: string, updates: Partial<Player>) => Promise<void>;
  removePlayer: (tournamentId: string, playerId: string) => Promise<void>;
  setPlayers: (tournamentId: string, players: Player[]) => Promise<void>;

  // Pool Actions
  setPools: (tournamentId: string, pools: Pool[]) => Promise<void>;
  updatePool: (tournamentId: string, poolId: string, updates: Partial<Pool>) => Promise<void>;

  // Match Actions
  setMatches: (tournamentId: string, matches: Match[]) => Promise<void>;
  updateMatch: (tournamentId: string, matchId: string, updates: Partial<Match>) => Promise<void>;
  confirmMatch: (tournamentId: string, matchId: string) => Promise<void>;
  unconfirmMatch: (tournamentId: string, matchId: string) => Promise<void>;

  // Round Actions
  setRounds: (tournamentId: string, rounds: Round[]) => Promise<void>;
  saveRound: (tournamentId: string, roundIndex: number) => Promise<boolean>;

  // Draw State Actions
  updateDrawState: (id: string, drawState: DrawState) => Promise<void>;

  // Status Actions
  updateStatus: (id: string, status: Tournament['status']) => Promise<void>;

  // Selectors
  getTournament: (id: string) => Tournament | undefined;
  getCurrentTournament: () => Tournament | undefined;
  getActiveTournaments: () => Tournament[];
  getArchivedTournaments: () => Tournament[];
  getStandings: (tournamentId: string, poolId?: string) => StandingsRow[];
}

// Helper function to convert API tournament to store tournament
function apiToTournament(apiTournament: ApiTournament): Tournament {
  return {
    id: apiTournament.id,
    settings: {
      tournamentName: apiTournament.tournamentName,
      numPools: apiTournament.numPools,
      numBoards: apiTournament.numBoards,
      advanceToCrossFinals: apiTournament.advanceToCrossFinals,
      advanceToLosersFinal: apiTournament.advanceToLosersFinal,
      useClasses: apiTournament.useClasses,
      liveDrawDelaySeconds: apiTournament.liveDrawDelaySeconds,
      youtubeStreamUrl: apiTournament.youtubeStreamUrl || undefined,
    },
    players: apiTournament.players || [],
    pools: apiTournament.pools?.map((pool: any) => ({
      ...pool,
      playerIds: pool.players?.map((pp: any) => pp.playerId || pp.player?.id) || []
    })) || [],
    matches: apiTournament.matches || [],
    rounds: apiTournament.rounds || [],
    status: apiTournament.status as Tournament['status'],
    drawState: apiTournament.drawState || undefined,
    createdAt: apiTournament.createdAt,
    updatedAt: apiTournament.updatedAt,
  };
}

// Create the store without persistence
export const useTournamentStore = create<TournamentStore>()((set, get) => ({
  tournaments: [],
  currentTournamentId: null,
  isLoading: false,
  error: null,

  // Load all tournaments from API
  loadTournaments: async () => {
    set({ isLoading: true, error: null });
    try {
      const apiTournaments: ApiTournament[] = await apiClient.get('/tournaments');
      const tournaments = apiTournaments.map(apiToTournament);
      set({ tournaments, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Load single tournament from API
  loadTournament: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const apiTournament: ApiTournament = await apiClient.get(`/tournaments/${id}`);
      const tournament = apiToTournament(apiTournament);

      set((state) => ({
        tournaments: state.tournaments.some(t => t.id === id)
          ? state.tournaments.map((t) => (t.id === id ? tournament : t))
          : [...state.tournaments, tournament],
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Load single tournament from public API (no authentication required)
  // Used by viewer pages accessible to anyone (live-viewer, split-view, OBS sources)
  loadTournamentPublic: async (id: string) => {
    try {
      const response = await fetch(`/api/tournaments/${id}/public`);
      if (!response.ok) {
        if (response.status === 404) {
          set({ error: 'Tournament not found' });
          return;
        }
        throw new Error(`API error: ${response.statusText}`);
      }
      const apiTournament: ApiTournament = await response.json();
      const tournament = apiToTournament(apiTournament);

      set((state) => ({
        tournaments: state.tournaments.some(t => t.id === id)
          ? state.tournaments.map((t) => (t.id === id ? tournament : t))
          : [...state.tournaments, tournament],
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Create a new tournament
  createTournament: async (name?: string) => {
    const tempId = uuidv4();
    const now = new Date().toISOString();
    const tempTournament: Tournament = {
      id: tempId,
      settings: {
        ...DEFAULT_TOURNAMENT_SETTINGS,
        tournamentName: name || DEFAULT_TOURNAMENT_SETTINGS.tournamentName,
      },
      players: [],
      pools: [],
      matches: [],
      rounds: [],
      status: 'setup',
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    set((state) => ({
      tournaments: [...state.tournaments, tempTournament],
      currentTournamentId: tempId,
      isLoading: true,
    }));

    try {
      const apiTournament: ApiTournament = await apiClient.post('/tournaments', {
        tournamentName: name || DEFAULT_TOURNAMENT_SETTINGS.tournamentName,
        numPools: DEFAULT_TOURNAMENT_SETTINGS.numPools,
        numBoards: DEFAULT_TOURNAMENT_SETTINGS.numBoards,
        advanceToCrossFinals: DEFAULT_TOURNAMENT_SETTINGS.advanceToCrossFinals,
        advanceToLosersFinal: DEFAULT_TOURNAMENT_SETTINGS.advanceToLosersFinal,
        useClasses: DEFAULT_TOURNAMENT_SETTINGS.useClasses,
        liveDrawDelaySeconds: DEFAULT_TOURNAMENT_SETTINGS.liveDrawDelaySeconds,
        youtubeStreamUrl: DEFAULT_TOURNAMENT_SETTINGS.youtubeStreamUrl,
        status: 'setup'
      });

      const tournament = apiToTournament(apiTournament);

      // Replace temp with real tournament
      set((state) => ({
        tournaments: state.tournaments.map((t) => (t.id === tempId ? tournament : t)),
        currentTournamentId: tournament.id,
        isLoading: false,
      }));

      return tournament.id;
    } catch (error: any) {
      // Revert optimistic update
      set((state) => ({
        tournaments: state.tournaments.filter((t) => t.id !== tempId),
        currentTournamentId: null,
        isLoading: false,
        error: error.message,
      }));
      throw error;
    }
  },

      // Update tournament
      updateTournament: async (id, updates) => {
        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));

        try {
          const apiUpdates: any = {};
          if (updates.settings) {
            Object.assign(apiUpdates, {
              tournamentName: updates.settings.tournamentName,
              numPools: updates.settings.numPools,
              numBoards: updates.settings.numBoards,
              advanceToCrossFinals: updates.settings.advanceToCrossFinals,
              advanceToLosersFinal: updates.settings.advanceToLosersFinal,
              useClasses: updates.settings.useClasses,
              liveDrawDelaySeconds: updates.settings.liveDrawDelaySeconds,
              youtubeStreamUrl: updates.settings.youtubeStreamUrl,
            });
          }
          if (updates.status) apiUpdates.status = updates.status;
          if (updates.drawState !== undefined) apiUpdates.drawState = updates.drawState;

          await apiClient.put(`/tournaments/${id}`, apiUpdates);
        } catch (error: any) {
          // Reload tournament on error
          await get().loadTournament(id);
          throw error;
        }
      },

      // Delete tournament
      deleteTournament: async (id) => {
        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.filter((t) => t.id !== id),
          currentTournamentId:
            state.currentTournamentId === id ? null : state.currentTournamentId,
        }));

        try {
          await apiClient.delete(`/tournaments/${id}`);
        } catch (error: any) {
          // Reload tournaments on error
          await get().loadTournaments();
          throw error;
        }
      },

      // Archive tournament
      archiveTournament: async (id) => {
        await get().updateStatus(id, 'archived');
      },

      // Set current tournament
      setCurrentTournament: (id) => {
        set({ currentTournamentId: id });
      },

      // Update settings
      updateSettings: async (id, settings) => {
        const tournament = get().getTournament(id);
        if (!tournament) return;
        await get().updateTournament(id, { settings: { ...tournament.settings, ...settings } });
      },

      // Add player
      addPlayer: async (tournamentId, player) => {
        const newPlayer: Player = {
          id: uuidv4(),
          ...player,
        };

        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  players: [...t.players, newPlayer],
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        try {
          await apiClient.post(`/tournaments/${tournamentId}/players`, newPlayer);
        } catch (error: any) {
          await get().loadTournament(tournamentId);
          throw error;
        }
      },

      // Update player
      updatePlayer: async (tournamentId, playerId, updates) => {
        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  players: t.players.map((p) =>
                    p.id === playerId ? { ...p, ...updates } : p
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        try {
          const tournament = get().getTournament(tournamentId);
          if (tournament) {
            await apiClient.put(`/tournaments/${tournamentId}/players`, { players: tournament.players });
          }
        } catch (error: any) {
          await get().loadTournament(tournamentId);
          throw error;
        }
      },

      // Remove player
      removePlayer: async (tournamentId, playerId) => {
        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  players: t.players.filter((p) => p.id !== playerId),
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        try {
          const tournament = get().getTournament(tournamentId);
          if (tournament) {
            await apiClient.put(`/tournaments/${tournamentId}/players`, { players: tournament.players });
          }
        } catch (error: any) {
          await get().loadTournament(tournamentId);
          throw error;
        }
      },

      // Set players (bulk update)
      setPlayers: async (tournamentId, players) => {
        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  players,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        try {
          await apiClient.put(`/tournaments/${tournamentId}/players`, { players });
        } catch (error: any) {
          await get().loadTournament(tournamentId);
          throw error;
        }
      },

      // Set pools
      setPools: async (tournamentId, pools) => {
        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  pools,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        try {
          // API expects pool.players:[{playerId}] but store uses pool.playerIds:string[]
          const apiPools = pools.map(pool => ({
            ...pool,
            players: pool.playerIds.map(playerId => ({ playerId })),
          }));
          await apiClient.put(`/tournaments/${tournamentId}/pools`, { pools: apiPools });
        } catch (error: any) {
          await get().loadTournament(tournamentId);
          throw error;
        }
      },

      // Update pool
      updatePool: async (tournamentId, poolId, updates) => {
        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  pools: t.pools.map((p) =>
                    p.id === poolId ? { ...p, ...updates } : p
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        try {
          const tournament = get().getTournament(tournamentId);
          if (tournament) {
            await apiClient.put(`/tournaments/${tournamentId}/pools`, { pools: tournament.pools });
          }
        } catch (error: any) {
          await get().loadTournament(tournamentId);
          throw error;
        }
      },

      // Set matches
      setMatches: async (tournamentId, matches) => {
        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  matches,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        try {
          await apiClient.put(`/tournaments/${tournamentId}/matches`, { matches });
        } catch (error: any) {
          await get().loadTournament(tournamentId);
          throw error;
        }
      },

      // Update match
      updateMatch: async (tournamentId, matchId, updates) => {
        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  matches: t.matches.map((m) =>
                    m.id === matchId ? { ...m, ...updates } : m
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        try {
          const tournament = get().getTournament(tournamentId);
          if (tournament) {
            await apiClient.put(`/tournaments/${tournamentId}/matches`, { matches: tournament.matches });
          }
        } catch (error: any) {
          await get().loadTournament(tournamentId);
          throw error;
        }
      },

      // Confirm match
      confirmMatch: async (tournamentId, matchId) => {
        await get().updateMatch(tournamentId, matchId, { confirmed: true });
      },

      // Unconfirm match
      unconfirmMatch: async (tournamentId, matchId) => {
        await get().updateMatch(tournamentId, matchId, { confirmed: false });
      },

      // Set rounds
      setRounds: async (tournamentId, rounds) => {
        // Optimistic update
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  rounds,
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        try {
          await apiClient.put(`/tournaments/${tournamentId}/rounds`, { rounds });
        } catch (error: any) {
          await get().loadTournament(tournamentId);
          throw error;
        }
      },

      // Save round (confirm all matches in round)
      saveRound: async (tournamentId, roundIndex) => {
        const tournament = get().getTournament(tournamentId);
        if (!tournament) return false;

        const roundMatches = tournament.matches.filter(
          (m) => m.roundIndex === roundIndex && m.stage === 'POOL'
        );

        // Validate all matches have legs entered
        const allComplete = roundMatches.every(
          (m) => m.legsP1 !== null && m.legsP2 !== null
        );

        if (!allComplete) {
          return false;
        }

        // Optimistically confirm all matches in round
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? {
                  ...t,
                  matches: t.matches.map((m) =>
                    m.roundIndex === roundIndex && m.stage === 'POOL'
                      ? { ...m, confirmed: true }
                      : m
                  ),
                  rounds: t.rounds.map((r) =>
                    r.index === roundIndex ? { ...r, savedAll: true } : r
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        try {
          const updatedTournament = get().getTournament(tournamentId);
          if (updatedTournament) {
            await apiClient.put(`/tournaments/${tournamentId}/matches`, { matches: updatedTournament.matches });
            await apiClient.put(`/tournaments/${tournamentId}/rounds`, { rounds: updatedTournament.rounds });
          }
        } catch (error: any) {
          await get().loadTournament(tournamentId);
          throw error;
        }

        return true;
      },

      // Update draw state
      updateDrawState: async (id, drawState) => {
        await get().updateTournament(id, { drawState });
      },

      // Update status
      updateStatus: async (id, status) => {
        await get().updateTournament(id, { status });
      },

      // Get tournament by ID
      getTournament: (id) => {
        return get().tournaments.find((t) => t.id === id);
      },

      // Get current tournament
      getCurrentTournament: () => {
        const { currentTournamentId, tournaments } = get();
        if (!currentTournamentId) return undefined;
        return tournaments.find((t) => t.id === currentTournamentId);
      },

      // Get active tournaments
      getActiveTournaments: () => {
        return get().tournaments.filter((t) => t.status !== 'archived');
      },

      // Get archived tournaments
      getArchivedTournaments: () => {
        return get().tournaments.filter((t) => t.status === 'archived');
      },

      // Get standings for a pool or all pools
      getStandings: (tournamentId, poolId?) => {
        const tournament = get().getTournament(tournamentId);
        if (!tournament) return [];

        // Get all players in the pool(s)
        const playerIds = poolId
          ? tournament.pools.find((p) => p.id === poolId)?.playerIds || []
          : tournament.players.map((p) => p.id);

        // Filter confirmed POOL matches where at least one player is in this pool
        const playerIdSet = new Set(playerIds);
        const matches = poolId
          ? tournament.matches.filter(
              (m) =>
                m.confirmed &&
                m.stage === 'POOL' &&
                (playerIdSet.has(m.player1Id) || playerIdSet.has(m.player2Id))
            )
          : tournament.matches.filter((m) => m.confirmed && m.stage === 'POOL');

        // Calculate standings
        const standingsMap = new Map<string, StandingsRow>();

        // Initialize all players in this pool
        playerIds.forEach((playerId) => {
          const player = tournament.players.find((p) => p.id === playerId);
          if (player) {
            standingsMap.set(playerId, {
              playerId,
              playerName: player.name,
              wins: 0,
              losses: 0,
              legsDiff: 0,
            });
          }
        });

        // Calculate from confirmed matches — only update stats for players in this pool
        matches.forEach((match) => {
          if (match.legsP1 === null || match.legsP2 === null) return;

          const p1Stats = standingsMap.get(match.player1Id);
          const p2Stats = standingsMap.get(match.player2Id);

          if (match.legsP1 > match.legsP2) {
            // Player 1 wins
            if (p1Stats) {
              p1Stats.wins += 1;
              p1Stats.legsDiff += match.legsP1 - match.legsP2;
            }
            if (p2Stats) {
              p2Stats.losses += 1;
              p2Stats.legsDiff -= match.legsP1 - match.legsP2;
            }
          } else if (match.legsP2 > match.legsP1) {
            // Player 2 wins
            if (p2Stats) {
              p2Stats.wins += 1;
              p2Stats.legsDiff += match.legsP2 - match.legsP1;
            }
            if (p1Stats) {
              p1Stats.losses += 1;
              p1Stats.legsDiff -= match.legsP2 - match.legsP1;
            }
          }
        });

        // Convert to array and sort
        const standings = Array.from(standingsMap.values()).sort((a, b) => {
          // Sort by wins (descending)
          if (b.wins !== a.wins) return b.wins - a.wins;
          // Then by legs differential (descending)
          if (b.legsDiff !== a.legsDiff) return b.legsDiff - a.legsDiff;
          // Then alphabetically by name
          return a.playerName.localeCompare(b.playerName);
        });

        return standings;
      },
    })
);
