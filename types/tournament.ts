/**
 * Tournament Data Models
 * Complete type definitions for the Darts Tournament application
 */

// Player Classes (A/B/C or null for no class)
export type PlayerClass = 'A' | 'B' | 'C' | null;

// Player
export interface Player {
  id: string;
  name: string;
  class: PlayerClass;
}

// Draw State - tracks live loting progress for Draw Viewer
export interface DrawState {
  status: 'idle' | 'picking' | 'assigned' | 'complete';
  currentPickedPlayerId?: string;
  currentPickedPoolId?: string;
}

// Tournament Settings
export interface TournamentSettings {
  tournamentName: string;
  numPools: number;
  numBoards: number;
  advanceToCrossFinals: number;
  advanceToLosersFinal: number;
  useClasses: boolean;
  liveDrawDelaySeconds: number;
  youtubeStreamUrl?: string;
}

// Pool
export interface Pool {
  id: string;
  name: string;
  playerIds: string[];
  boardNumber?: number | null;          // Legacy: single board
  boardNumbersText?: string | null;     // Flexible: "1", "1,2,3", or "1-4"
}

// Parse board numbers from text (e.g., "1,2,3" or "1-4" or "1,3-5")
export function parseBoardNumbers(text: string | null | undefined): number[] {
  if (!text || text.trim() === '') return [];

  const parts = text.split(',').map(p => p.trim());
  const numbers: number[] = [];

  for (const part of parts) {
    if (part.includes('-')) {
      // Range: "1-4" → [1,2,3,4]
      const [start, end] = part.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          numbers.push(i);
        }
      }
    } else {
      // Single number: "1" → [1]
      const num = parseInt(part);
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }
  }

  return [...new Set(numbers)].sort((a, b) => a - b); // Remove duplicates and sort
}

// Get board numbers for a pool (prefers boardNumbersText, falls back to boardNumber)
export function getPoolBoardNumbers(pool: Pool): number[] {
  if (pool.boardNumbersText) {
    return parseBoardNumbers(pool.boardNumbersText);
  }
  if (pool.boardNumber != null) {
    return [pool.boardNumber];
  }
  return [];
}

// Match Stage
export type MatchStage = 'POOL' | 'CROSS' | 'LOSERS';

// Match
export interface Match {
  id: string;
  roundIndex: number;
  poolId?: string;
  stage: MatchStage;
  player1Id: string;
  player2Id: string;
  legsP1: number | null;
  legsP2: number | null;
  confirmed: boolean;
  boardNumber?: number | null;
}

// Round
export interface Round {
  index: number;
  matchIds: string[];
  savedAll: boolean;
}

// Standings Row (derived/calculated, not stored)
export interface StandingsRow {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  legsDiff: number;
}

// Tournament Status
export type TournamentStatus = 'setup' | 'pool-play' | 'finals' | 'completed' | 'archived';

// Complete Tournament
export interface Tournament {
  id: string;
  settings: TournamentSettings;
  players: Player[];
  pools: Pool[];
  matches: Match[];
  rounds: Round[];
  status: TournamentStatus;
  drawState?: DrawState;
  createdAt: string;
  updatedAt: string;
}

// Default Tournament Settings
export const DEFAULT_TOURNAMENT_SETTINGS: TournamentSettings = {
  tournamentName: 'New Tournament',
  numPools: 4,
  numBoards: 8,
  advanceToCrossFinals: 2,
  advanceToLosersFinal: 2,
  useClasses: false,
  liveDrawDelaySeconds: 5,
  youtubeStreamUrl: undefined,
};

// Validation constants
export const VALIDATION = {
  MAX_PLAYERS: 24,
  MIN_PLAYERS: 4,
  MIN_POOLS: 2,
  MAX_POOLS: 8,
  MIN_BOARDS: 1,
  MAX_BOARDS: 16,
} as const;
