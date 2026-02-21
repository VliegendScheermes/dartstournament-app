/**
 * Drawing Algorithm
 * Distributes players into pools based on their classes
 */

import { Player, Pool } from '@/types/tournament';

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
function createPots(players: Player[], useClasses: boolean) {
  if (!useClasses) {
    return {
      potA: shuffleArray(players),
      potB: [],
      potC: [],
    };
  }

  const potA = shuffleArray(players.filter((p) => p.class === 'A'));
  const potB = shuffleArray(players.filter((p) => p.class === 'B'));
  const potC = shuffleArray(players.filter((p) => p.class === 'C'));
  const noClass = shuffleArray(players.filter((p) => p.class === null));

  // Add players without class to pot C
  return {
    potA,
    potB,
    potC: [...potC, ...noClass],
  };
}

// Distribute players into pools using snake draft
export function distributePlayers(
  players: Player[],
  numPools: number,
  useClasses: boolean
): Pool[] {
  if (players.length === 0) {
    return [];
  }

  // Create pots
  const { potA, potB, potC } = createPots(players, useClasses);

  // Initialize pools
  const pools: Pool[] = [];
  const poolLetters = 'ABCDEFGH';
  for (let i = 0; i < numPools; i++) {
    pools.push({
      id: crypto.randomUUID(),
      name: `Poule ${poolLetters[i]}`,
      playerIds: [],
      boardNumber: null,
    });
  }

  // Distribute using snake draft (round-robin with direction change)
  let currentPool = 0;
  let direction = 1; // 1 = forward, -1 = backward

  const allPlayers = [...potA, ...potB, ...potC];

  for (const player of allPlayers) {
    pools[currentPool].playerIds.push(player.id);

    // Move to next pool
    if (direction === 1) {
      if (currentPool === numPools - 1) {
        direction = -1;
      } else {
        currentPool++;
      }
    } else {
      if (currentPool === 0) {
        direction = 1;
      } else {
        currentPool--;
      }
    }
  }

  return pools;
}

// Live drawing with delay (returns a promise that resolves step by step)
export async function liveDistributePlayers(
  players: Player[],
  numPools: number,
  useClasses: boolean,
  delaySeconds: number,
  onStep: (player: Player, poolIndex: number, poolName: string) => void
): Promise<Pool[]> {
  if (players.length === 0) {
    return [];
  }

  // Create pots
  const { potA, potB, potC } = createPots(players, useClasses);

  // Initialize pools
  const pools: Pool[] = [];
  const poolLetters = 'ABCDEFGH';
  for (let i = 0; i < numPools; i++) {
    pools.push({
      id: crypto.randomUUID(),
      name: `Poule ${poolLetters[i]}`,
      playerIds: [],
      boardNumber: null,
    });
  }

  // Distribute using snake draft with delays
  let currentPool = 0;
  let direction = 1;

  const allPlayers = [...potA, ...potB, ...potC];

  for (let i = 0; i < allPlayers.length; i++) {
    const player = allPlayers[i];

    // Add player to pool
    pools[currentPool].playerIds.push(player.id);

    // Call the step callback
    onStep(player, currentPool, pools[currentPool].name);

    // Wait before next step (except for the last player)
    if (i < allPlayers.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
    }

    // Move to next pool
    if (direction === 1) {
      if (currentPool === numPools - 1) {
        direction = -1;
      } else {
        currentPool++;
      }
    } else {
      if (currentPool === 0) {
        direction = 1;
      } else {
        currentPool--;
      }
    }
  }

  return pools;
}
