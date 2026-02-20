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
  finalsAssignments?: { [playerId: string]: 'CROSS' | 'LOSERS' | 'ELIMINATED' | null };
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
  boardNumber?: number | null;
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
