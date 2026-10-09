/**
 * Drawing Algorithm
 * Distributes players into pools based on their classes
 */

import { Player, Pool } from '@/types/tournament';

export const POOL_LETTERS = 'ABCDEFGH';

// One draw step: which player went to which pool, in draw order
export interface DrawStep {
  player: Player;
  poolIndex: number;
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Create pots based on player classes
function createPots(players: Player[], useClasses: boolean): Player[][] {
  if (!useClasses) {
    return [shuffleArray(players)];
  }

  const potA = shuffleArray(players.filter((p) => p.class === 'A'));
  const potB = shuffleArray(players.filter((p) => p.class === 'B'));
  const potC = shuffleArray(players.filter((p) => p.class === 'C'));
  const noClass = shuffleArray(players.filter((p) => p.class === null));

  // Players without class are drawn together with pot C
  return [potA, potB, [...potC, ...noClass]];
}

export function createEmptyPools(numPools: number): Pool[] {
  return Array.from({ length: numPools }, (_, i) => ({
    id: crypto.randomUUID(),
    name: `Poule ${POOL_LETTERS[i]}`,
    playerIds: [],
    boardNumber: null,
  }));
}

/**
 * Draw players into pools.
 *
 * Pots are drawn in order (A, B, C). Every drawn player goes to one of the pools
 * with the fewest players, preferring pools with the fewest players from the same
 * pot; remaining ties are broken randomly. Pool sizes therefore never differ by
 * more than one, each class is spread evenly, and which pools get an extra
 * player of a class is random.
 */
export function drawPools(
  players: Player[],
  numPools: number,
  useClasses: boolean
): { pools: Pool[]; steps: DrawStep[] } {
  const pools = createEmptyPools(numPools);
  const steps: DrawStep[] = [];

  for (const pot of createPots(players, useClasses)) {
    const fromPot = new Array(numPools).fill(0);

    for (const player of pot) {
      const minSize = Math.min(...pools.map((pool) => pool.playerIds.length));
      const smallest = pools.map((_, i) => i).filter((i) => pools[i].playerIds.length === minSize);
      const minFromPot = Math.min(...smallest.map((i) => fromPot[i]));
      const candidates = smallest.filter((i) => fromPot[i] === minFromPot);
      const poolIndex = candidates[Math.floor(Math.random() * candidates.length)];

      pools[poolIndex].playerIds.push(player.id);
      fromPot[poolIndex]++;
      steps.push({ player, poolIndex });
    }
  }

  return { pools, steps };
}

// Distribute players into pools (fast draw)
export function distributePlayers(players: Player[], numPools: number, useClasses: boolean): Pool[] {
  return drawPools(players, numPools, useClasses).pools;
}
