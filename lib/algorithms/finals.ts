/**
 * Finals Algorithm
 * Generates cross-finals and losers brackets
 */

import { Match, Pool, StandingsRow } from '@/types/tournament';
import { v4 as uuidv4 } from 'uuid';

/**
 * Select finalists from pool standings
 */
export function selectFinalists(
  pools: Pool[],
  allStandings: { [poolId: string]: StandingsRow[] },
  topCount: number,
  bottomCount: number
): {
  crossFinalists: { poolId: string; playerId: string; rank: number }[];
  losersFinalists: { poolId: string; playerId: string; rank: number }[];
} {
  const crossFinalists: { poolId: string; playerId: string; rank: number }[] = [];
  const losersFinalists: { poolId: string; playerId: string; rank: number }[] = [];

  pools.forEach((pool) => {
    const standings = allStandings[pool.id] || [];

    // Top players for cross-finals
    for (let i = 0; i < topCount && i < standings.length; i++) {
      crossFinalists.push({
        poolId: pool.id,
        playerId: standings[i].playerId,
        rank: i + 1,
      });
    }

    // Bottom players for losers bracket
    for (let i = standings.length - bottomCount; i < standings.length; i++) {
      if (i >= 0) {
        losersFinalists.push({
          poolId: pool.id,
          playerId: standings[i].playerId,
          rank: standings.length - i,
        });
      }
    }
  });

  return { crossFinalists, losersFinalists };
}

/**
 * Generate cross-finals bracket (standard elimination - winner advances)
 */
export function generateCrossFinalsMatches(
  finalists: { poolId: string; playerId: string; rank: number }[]
): Match[] {
  const matches: Match[] = [];
  const numPlayers = finalists.length;

  if (numPlayers < 2) return matches;

  // Seeding: pair players from different pools
  // For 8 players (2 from 4 pools): A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2
  // For other configurations: group by rank and alternate pools

  const byRank: { [rank: number]: typeof finalists } = {};
  finalists.forEach((f) => {
    if (!byRank[f.rank]) byRank[f.rank] = [];
    byRank[f.rank].push(f);
  });

  // Create first round pairings
  let roundIndex = 1;
  const firstRoundPlayers: string[] = [];

  // Pair rank 1 with rank 2 from different pools
  const rank1Players = byRank[1] || [];
  const rank2Players = byRank[2] || [];

  // Simple seeding: alternate between rank groups
  for (let i = 0; i < rank1Players.length; i++) {
    if (i < rank2Players.length) {
      const player1 = rank1Players[i];
      const player2 = rank2Players[i];

      // Ensure they're from different pools
      if (player1.poolId !== player2.poolId) {
        matches.push({
          id: uuidv4(),
          roundIndex,
          stage: 'CROSS',
          player1Id: player1.playerId,
          player2Id: player2.playerId,
          legsP1: null,
          legsP2: null,
          confirmed: false,
        });
        firstRoundPlayers.push(player1.playerId, player2.playerId);
      }
    }
  }

  // If we have players left, create additional matches
  const remainingPlayers = finalists.filter(
    (f) => !firstRoundPlayers.includes(f.playerId)
  );

  for (let i = 0; i < remainingPlayers.length; i += 2) {
    if (i + 1 < remainingPlayers.length) {
      matches.push({
        id: uuidv4(),
        roundIndex,
        stage: 'CROSS',
        player1Id: remainingPlayers[i].playerId,
        player2Id: remainingPlayers[i + 1].playerId,
        legsP1: null,
        legsP2: null,
        confirmed: false,
      });
    }
  }

  return matches;
}

/**
 * Generate losers bracket (inverted elimination - loser advances)
 */
export function generateLosersBracketMatches(
  finalists: { poolId: string; playerId: string; rank: number }[]
): Match[] {
  const matches: Match[] = [];
  const numPlayers = finalists.length;

  if (numPlayers < 2) return matches;

  // Pair players for first round
  let roundIndex = 1;

  for (let i = 0; i < numPlayers; i += 2) {
    if (i + 1 < numPlayers) {
      matches.push({
        id: uuidv4(),
        roundIndex,
        stage: 'LOSERS',
        player1Id: finalists[i].playerId,
        player2Id: finalists[i + 1].playerId,
        legsP1: null,
        legsP2: null,
        confirmed: false,
      });
    }
  }

  return matches;
}

/**
 * Get winner of a match
 */
export function getMatchWinner(match: Match): string | null {
  if (!match.confirmed || match.legsP1 === null || match.legsP2 === null) {
    return null;
  }

  if (match.legsP1 > match.legsP2) {
    return match.player1Id;
  } else if (match.legsP2 > match.legsP1) {
    return match.player2Id;
  }

  return null; // Tie (shouldn't happen in darts)
}

/**
 * Get loser of a match (for losers bracket)
 */
export function getMatchLoser(match: Match): string | null {
  if (!match.confirmed || match.legsP1 === null || match.legsP2 === null) {
    return null;
  }

  if (match.legsP1 < match.legsP2) {
    return match.player1Id;
  } else if (match.legsP2 < match.legsP1) {
    return match.player2Id;
  }

  return null;
}

/**
 * Generate next round matches for cross-finals
 * Winners are paired sequentially: Winner of Match 1 vs Winner of Match 2, etc.
 */
export function generateNextCrossRound(
  currentRoundMatches: Match[],
  nextRoundIndex: number
): Match[] {
  // Sort matches by their position in the round to ensure consistent pairing
  const sortedMatches = [...currentRoundMatches].sort((a, b) => {
    // If matches have IDs, use them for consistent ordering
    return a.id.localeCompare(b.id);
  });

  const winners: string[] = [];

  sortedMatches.forEach((match) => {
    const winner = getMatchWinner(match);
    if (winner) {
      winners.push(winner);
    } else {
      console.warn(`Match ${match.id} has no winner yet`);
    }
  });

  // Need at least 2 winners to create a match
  if (winners.length < 2) {
    console.log(`Not enough winners (${winners.length}) to create next round`);
    return [];
  }

  const nextRoundMatches: Match[] = [];

  // Pair winners sequentially: 1 vs 2, 3 vs 4, etc.
  for (let i = 0; i < winners.length; i += 2) {
    if (i + 1 < winners.length) {
      const newMatch = {
        id: uuidv4(),
        roundIndex: nextRoundIndex,
        stage: 'CROSS' as const,
        player1Id: winners[i],
        player2Id: winners[i + 1],
        legsP1: null,
        legsP2: null,
        confirmed: false,
      };
      nextRoundMatches.push(newMatch);
      console.log(`Creating match: ${winners[i]} vs ${winners[i + 1]}`);
    }
  }

  console.log(`Generated ${nextRoundMatches.length} matches for round ${nextRoundIndex}`);
  return nextRoundMatches;
}

/**
 * Generate next round matches for losers bracket
 * Losers are paired sequentially: Loser of Match 1 vs Loser of Match 2, etc.
 */
export function generateNextLosersRound(
  currentRoundMatches: Match[],
  nextRoundIndex: number
): Match[] {
  // Sort matches by their position in the round to ensure consistent pairing
  const sortedMatches = [...currentRoundMatches].sort((a, b) => {
    return a.id.localeCompare(b.id);
  });

  const losers: string[] = [];

  sortedMatches.forEach((match) => {
    const loser = getMatchLoser(match);
    if (loser) {
      losers.push(loser);
    } else {
      console.warn(`Match ${match.id} has no loser yet`);
    }
  });

  // Need at least 2 losers to create a match
  if (losers.length < 2) {
    console.log(`Not enough losers (${losers.length}) to create next round`);
    return [];
  }

  const nextRoundMatches: Match[] = [];

  // Pair losers sequentially: 1 vs 2, 3 vs 4, etc.
  for (let i = 0; i < losers.length; i += 2) {
    if (i + 1 < losers.length) {
      const newMatch = {
        id: uuidv4(),
        roundIndex: nextRoundIndex,
        stage: 'LOSERS' as const,
        player1Id: losers[i],
        player2Id: losers[i + 1],
        legsP1: null,
        legsP2: null,
        confirmed: false,
      };
      nextRoundMatches.push(newMatch);
      console.log(`Creating losers match: ${losers[i]} vs ${losers[i + 1]}`);
    }
  }

  console.log(`Generated ${nextRoundMatches.length} losers matches for round ${nextRoundIndex}`);
  return nextRoundMatches;
}
