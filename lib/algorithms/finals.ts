/**
 * Finals Algorithm
 * Generates cross-finals and losers brackets
 */

import { Match, Pool, StandingsRow } from '@/types/tournament';
import { v4 as uuidv4 } from 'uuid';

/**
 * Select finalists from pool standings
 * Respects manual assignments if provided
 */
export function selectFinalists(
  pools: Pool[],
  allStandings: { [poolId: string]: StandingsRow[] },
  topCount: number,
  bottomCount: number,
  manualAssignments?: { [playerId: string]: 'CROSS' | 'LOSERS' | 'ELIMINATED' | null }
): {
  crossFinalists: { poolId: string; playerId: string; rank: number }[];
  losersFinalists: { poolId: string; playerId: string; rank: number }[];
} {
  const crossFinalists: { poolId: string; playerId: string; rank: number }[] = [];
  const losersFinalists: { poolId: string; playerId: string; rank: number }[] = [];
  const crossPlayerIds = new Set<string>(); // Track players already in cross finals

  pools.forEach((pool) => {
    const standings = allStandings[pool.id] || [];

    standings.forEach((standingRow, index) => {
      const playerId = standingRow.playerId;
      const rank = index + 1;

      // Check manual assignment first
      const manualAssignment = manualAssignments?.[playerId];

      if (manualAssignment === 'CROSS') {
        // Manually assigned to Cross Finals
        crossFinalists.push({ poolId: pool.id, playerId, rank });
        crossPlayerIds.add(playerId);
      } else if (manualAssignment === 'LOSERS') {
        // Manually assigned to Losers Bracket
        losersFinalists.push({ poolId: pool.id, playerId, rank });
      } else if (manualAssignment === 'ELIMINATED') {
        // Manually eliminated - skip
      } else if (manualAssignment === null || manualAssignment === undefined) {
        // No manual assignment - use automatic logic
        const isTopPlayer = index < topCount;
        const isBottomPlayer = index >= standings.length - bottomCount;

        if (isTopPlayer) {
          crossFinalists.push({ poolId: pool.id, playerId, rank });
          crossPlayerIds.add(playerId);
        } else if (isBottomPlayer && !crossPlayerIds.has(playerId)) {
          // Only add to losers if not already in cross (priority rule)
          losersFinalists.push({ poolId: pool.id, playerId, rank });
        }
      }
    });
  });

  return { crossFinalists, losersFinalists };
}

/**
 * Pair players greedily, avoiding same-pool matchups.
 * Any unavoidable same-pool matches are placed at the end of the list.
 */
function pairAvoidingSamePool(
  players: { poolId: string; playerId: string; rank: number }[]
): [{ poolId: string; playerId: string; rank: number }, { poolId: string; playerId: string; rank: number }][] {
  const crossPairs: [typeof players[0], typeof players[0]][] = [];
  const samePairs: [typeof players[0], typeof players[0]][] = [];
  const unmatched = [...players];

  while (unmatched.length >= 2) {
    const player = unmatched.shift()!;
    const diffPoolIdx = unmatched.findIndex((p) => p.poolId !== player.poolId);

    if (diffPoolIdx !== -1) {
      const opponent = unmatched.splice(diffPoolIdx, 1)[0];
      crossPairs.push([player, opponent]);
    } else {
      // All remaining players are from the same pool — unavoidable same-pool match
      const opponent = unmatched.shift()!;
      samePairs.push([player, opponent]);
    }
  }

  // Same-pool matches go last
  return [...crossPairs, ...samePairs];
}

/**
 * Generate cross-finals bracket (standard elimination - winner advances).
 * Seeding ensures same-pool players do NOT meet in round 1 if avoidable.
 * For balanced brackets (equal rank-1 and rank-2 counts), uses rotation seeding:
 *   A1 vs B2, B1 vs C2, C1 vs D2, D1 vs A2 — no same-pool first-round matches.
 * Any unavoidable same-pool matches are placed last in the round.
 */
export function generateCrossFinalsMatches(
  finalists: { poolId: string; playerId: string; rank: number }[]
): Match[] {
  const matches: Match[] = [];

  if (finalists.length < 2) return matches;

  const byRank: { [rank: number]: typeof finalists } = {};
  finalists.forEach((f) => {
    if (!byRank[f.rank]) byRank[f.rank] = [];
    byRank[f.rank].push(f);
  });

  const rank1Players = byRank[1] || [];
  const rank2Players = byRank[2] || [];

  let pairings: [typeof finalists[0], typeof finalists[0]][];

  if (rank1Players.length > 0 && rank1Players.length === rank2Players.length) {
    // Balanced bracket: rotate rank-2 list by 1 so rank1[i] faces rank2[i+1 mod n].
    // With pools ordered A,B,C,D this gives A1 vs B2, B1 vs C2, C1 vs D2, D1 vs A2.
    const rotatedRank2 = [...rank2Players.slice(1), rank2Players[0]];
    const crossPairs: [typeof finalists[0], typeof finalists[0]][] = [];
    const samePairs: [typeof finalists[0], typeof finalists[0]][] = [];

    for (let i = 0; i < rank1Players.length; i++) {
      const p1 = rank1Players[i];
      const p2 = rotatedRank2[i];
      if (p1.poolId !== p2.poolId) {
        crossPairs.push([p1, p2]);
      } else {
        // Single-pool tournament edge case — unavoidable
        samePairs.push([p1, p2]);
      }
    }
    pairings = [...crossPairs, ...samePairs];
  } else {
    // Unbalanced or mixed-rank finalists — greedy pool-avoiding pairing
    pairings = pairAvoidingSamePool(finalists);
  }

  for (const [p1, p2] of pairings) {
    matches.push({
      id: uuidv4(),
      roundIndex: 1,
      stage: 'CROSS',
      player1Id: p1.playerId,
      player2Id: p2.playerId,
      legsP1: null,
      legsP2: null,
      confirmed: false,
    });
  }

  return matches;
}

/**
 * Generate losers bracket (inverted elimination - loser advances).
 * Seeding avoids same-pool matchups in round 1; unavoidable same-pool
 * matches are placed last in the round.
 */
export function generateLosersBracketMatches(
  finalists: { poolId: string; playerId: string; rank: number }[]
): Match[] {
  const matches: Match[] = [];

  if (finalists.length < 2) return matches;

  const pairings = pairAvoidingSamePool(finalists);

  for (const [p1, p2] of pairings) {
    matches.push({
      id: uuidv4(),
      roundIndex: 1,
      stage: 'LOSERS',
      player1Id: p1.playerId,
      player2Id: p2.playerId,
      legsP1: null,
      legsP2: null,
      confirmed: false,
    });
  }

  console.log(`Generated ${matches.length} losers bracket matches for round 1`);
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
 * Losers from current round are paired sequentially for next round
 */
export function generateNextLosersRound(
  currentRoundMatches: Match[],
  nextRoundIndex: number
): Match[] {
  // Sort matches to ensure consistent pairing order
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
