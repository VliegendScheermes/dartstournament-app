/**
 * Round-Robin Algorithm
 * Generates round-robin tournament schedules using the circle method
 */

import { Match, Pool, Round } from '@/types/tournament';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate round-robin matches for a single pool
 * Uses the circle method to ensure each player plays max 1 match per round
 *
 * Algorithm: Fixed position with rotation
 * - Player at index 0 stays fixed
 * - Other players rotate clockwise around the circle
 * - In each round, pair opposite positions
 */
export function generateRoundRobinMatches(
  pool: Pool,
  poolPlayers: string[]
): { matches: Match[]; rounds: Round[] } {
  const originalPlayers = [...poolPlayers];
  const numPlayers = originalPlayers.length;

  if (numPlayers < 2) {
    return { matches: [], rounds: [] };
  }

  const matches: Match[] = [];
  const roundsData: Round[] = [];

  // For odd number of players, add a "BYE" placeholder
  const isOdd = numPlayers % 2 === 1;
  const players = isOdd ? [...originalPlayers, 'BYE'] : [...originalPlayers];
  const n = players.length;
  const numRounds = n - 1;

  // Circle method: position 0 is fixed, others rotate
  // Start with the initial arrangement
  let currentRotation = [...players];

  for (let round = 0; round < numRounds; round++) {
    const roundMatches: string[] = [];

    // For round > 0, rotate the positions (except position 0 which stays fixed)
    if (round > 0) {
      const fixed = currentRotation[0];
      const toRotate = currentRotation.slice(1);

      // Rotate clockwise by 1: take last element and put it at the beginning
      const last = toRotate.pop()!;
      toRotate.unshift(last);

      currentRotation = [fixed, ...toRotate];
    }

    // Pair up opponents: position i vs position (n-1-i)
    for (let i = 0; i < n / 2; i++) {
      const player1 = currentRotation[i];
      const player2 = currentRotation[n - 1 - i];

      // Skip matches involving the "BYE" player
      if (player1 === 'BYE' || player2 === 'BYE') {
        continue;
      }

      // Integrity check: both players must belong to this pool
      if (!originalPlayers.includes(player1) || !originalPlayers.includes(player2)) {
        console.error(`[INTEGRITY] Match generation aborted: player not in pool ${pool.id}`);
        continue;
      }

      const matchId = uuidv4();
      const newMatch: Match = {
        id: matchId,
        roundIndex: round + 1,
        poolId: pool.id,
        stage: 'POOL',
        player1Id: player1,
        player2Id: player2,
        legsP1: null,
        legsP2: null,
        confirmed: false,
        boardNumber: pool.boardNumber,
      };

      matches.push(newMatch);
      roundMatches.push(matchId);
    }

    if (roundMatches.length > 0) {
      roundsData.push({
        index: round + 1,
        matchIds: roundMatches,
        savedAll: false,
      });
    }
  }

  return { matches, rounds: roundsData };
}

/**
 * Generate round-robin schedules for all pools
 */
export function generateAllPoolSchedules(
  pools: Pool[],
  allPlayers: { id: string; name: string }[]
): { matches: Match[]; rounds: Round[] } {
  const allMatches: Match[] = [];
  const allRounds: Round[] = [];

  pools.forEach((pool) => {
    const poolPlayers = pool.playerIds;
    const { matches, rounds } = generateRoundRobinMatches(pool, poolPlayers);

    allMatches.push(...matches);
    allRounds.push(...rounds);
  });

  return { matches: allMatches, rounds: allRounds };
}
