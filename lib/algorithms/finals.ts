/**
 * Finals Algorithm
 * Single-elimination brackets for the cross finals (winner advances) and the
 * losers bracket (loser advances).
 *
 * A bracket is stored as its round-1 slots (top to bottom, null = bye). Every
 * later round is derived from those slots and the confirmed match results, so
 * any number of finalists works: the field is padded with byes to the next
 * power of two and the byes go to the top seeds.
 */

import { BracketSlots, FinalsBracket, Match, Pool, StandingsRow } from '@/types/tournament';
import { v4 as uuidv4 } from 'uuid';

export type FinalsStage = 'CROSS' | 'LOSERS';
export type FinalsAssignment = 'CROSS' | 'LOSERS' | 'ELIMINATED' | null;

export interface Finalist {
  poolId: string;
  playerId: string;
  rank: number; // 1 = pool winner
  fromBottom: number; // 0 = last place of the pool
  wins: number;
  legsDiff: number;
}

/**
 * Select finalists from pool standings
 * Respects manual assignments if provided
 */
export function selectFinalists(
  pools: Pool[],
  allStandings: { [poolId: string]: StandingsRow[] },
  topCount: number,
  bottomCount: number,
  manualAssignments?: { [playerId: string]: FinalsAssignment }
): { crossFinalists: Finalist[]; losersFinalists: Finalist[] } {
  const crossFinalists: Finalist[] = [];
  const losersFinalists: Finalist[] = [];

  pools.forEach((pool) => {
    const standings = allStandings[pool.id] || [];

    standings.forEach((row, index) => {
      const finalist: Finalist = {
        poolId: pool.id,
        playerId: row.playerId,
        rank: index + 1,
        fromBottom: standings.length - 1 - index,
        wins: row.wins,
        legsDiff: row.legsDiff,
      };
      const manualAssignment = manualAssignments?.[row.playerId];

      if (manualAssignment === 'CROSS') {
        crossFinalists.push(finalist);
      } else if (manualAssignment === 'LOSERS') {
        losersFinalists.push(finalist);
      } else if (manualAssignment === 'ELIMINATED') {
        // Manually eliminated - skip
      } else if (index < topCount) {
        // Top players go to the cross finals; they can't also be in the losers bracket
        crossFinalists.push(finalist);
      } else if (finalist.fromBottom < bottomCount) {
        losersFinalists.push(finalist);
      }
    });
  });

  return { crossFinalists, losersFinalists };
}

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/** Seed number per slot in standard bracket order, e.g. size 8 → [1, 8, 4, 5, 2, 7, 3, 6] */
function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const doubled = order.length * 2;
    order = order.flatMap((seed) => [seed, doubled + 1 - seed]);
  }
  return order;
}

/** Round in which the players in two slots would meet (1 = first round) */
function meetingRound(slotA: number, slotB: number): number {
  return Math.floor(Math.log2(slotA ^ slotB)) + 1;
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function countFirstRoundConflicts(poolOfSlot: (string | null)[]): number {
  let conflicts = 0;
  for (let slot = 0; slot < poolOfSlot.length; slot += 2) {
    if (poolOfSlot[slot] !== null && poolOfSlot[slot] === poolOfSlot[slot + 1]) conflicts++;
  }
  return conflicts;
}

/**
 * Seed finalists into round-1 slots.
 *
 * Finalists are seeded per tier (all pool winners, then all runners-up, ...) and
 * within a tier by wins and legs difference, so the best players get the byes.
 * Each player takes the free seed of their tier that keeps them furthest away
 * from players of their own pool, so pool mates meet as late as possible.
 *
 * In the losers bracket the order is reversed: the worst players are the top
 * seeds. A bye there means advancing without a chance to win, so it goes to
 * the players who finished lowest.
 */
export function seedBracket(finalists: Finalist[], stage: FinalsStage): BracketSlots {
  if (finalists.length < 2) return finalists.map((f) => f.playerId);

  const tierOf = (f: Finalist) => (stage === 'CROSS' ? f.rank : f.fromBottom);
  const direction = stage === 'CROSS' ? 1 : -1;
  // Shuffle first so equal players are seeded in random order (sort is stable)
  const sorted = shuffle(finalists).sort((a, b) => {
    if (tierOf(a) !== tierOf(b)) return tierOf(a) - tierOf(b);
    if (a.wins !== b.wins) return direction * (b.wins - a.wins);
    return direction * (b.legsDiff - a.legsDiff);
  });

  const size = nextPowerOfTwo(sorted.length);
  const slotOfSeed: number[] = [];
  seedOrder(size).forEach((seed, slot) => {
    slotOfSeed[seed] = slot;
  });

  const slots: BracketSlots = new Array(size).fill(null);
  const poolOfSlot: (string | null)[] = new Array(size).fill(null);
  const tierOfSlot: number[] = new Array(size).fill(-1);

  const distanceToPool = (slot: number, poolId: string) => {
    let closest = Infinity;
    poolOfSlot.forEach((pool, other) => {
      if (pool === poolId) closest = Math.min(closest, meetingRound(slot, other));
    });
    return closest;
  };

  let nextSeed = 1;
  for (let i = 0; i < sorted.length; ) {
    const tier = tierOf(sorted[i]);
    const members: Finalist[] = [];
    while (i < sorted.length && tierOf(sorted[i]) === tier) members.push(sorted[i++]);

    // Free slots of this tier, best seed first
    const free = members.map((_, k) => slotOfSeed[nextSeed + k]);
    nextSeed += members.length;

    for (const finalist of members) {
      let best = 0;
      for (let k = 1; k < free.length; k++) {
        if (distanceToPool(free[k], finalist.poolId) > distanceToPool(free[best], finalist.poolId)) best = k;
      }
      const slot = free.splice(best, 1)[0];
      slots[slot] = finalist.playerId;
      poolOfSlot[slot] = finalist.poolId;
      tierOfSlot[slot] = tier;
    }
  }

  // The greedy placement can still leave pool mates facing each other in round 1;
  // swap players within the same tier while that reduces those conflicts.
  const swap = (a: number, b: number) => {
    [slots[a], slots[b]] = [slots[b], slots[a]];
    [poolOfSlot[a], poolOfSlot[b]] = [poolOfSlot[b], poolOfSlot[a]];
  };
  let conflicts = countFirstRoundConflicts(poolOfSlot);
  let improved = true;
  while (conflicts > 0 && improved) {
    improved = false;
    search: for (let pairStart = 0; pairStart < size; pairStart += 2) {
      if (poolOfSlot[pairStart] === null || poolOfSlot[pairStart] !== poolOfSlot[pairStart + 1]) continue;
      for (const a of [pairStart + 1, pairStart]) {
        for (let b = 0; b < size; b++) {
          if (b === pairStart || b === pairStart + 1 || tierOfSlot[b] !== tierOfSlot[a]) continue;
          swap(a, b);
          const after = countFirstRoundConflicts(poolOfSlot);
          if (after < conflicts) {
            conflicts = after;
            improved = true;
            break search;
          }
          swap(a, b);
        }
      }
    }
  }

  return slots;
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

/** Name of a round by the number of players in it */
export function getRoundName(playersInRound: number): string {
  if (playersInRound === 2) return 'Final';
  if (playersInRound === 4) return 'Semi Finals';
  if (playersInRound === 8) return 'Quarter Finals';
  return `Round of ${playersInRound}`;
}

/** undefined = not known yet, null = bye */
type Participant = string | null | undefined;

export interface BracketPair {
  player1Id: Participant;
  player2Id: Participant;
  match?: Match;
  /** Player who moves on (winner in the cross finals, loser in the losers bracket) */
  advancingId: Participant;
}

export interface BracketRound {
  roundIndex: number;
  name: string;
  pairs: BracketPair[];
}

export interface BracketState {
  rounds: BracketRound[];
  /** Champion (cross finals) or last loser (losers bracket); undefined while undecided */
  resultId: Participant;
}

const isPairMatch = (match: Match, a: string, b: string) =>
  (match.player1Id === a && match.player2Id === b) || (match.player1Id === b && match.player2Id === a);

function resolvePair(
  player1Id: Participant,
  player2Id: Participant,
  stageMatches: Match[],
  roundIndex: number,
  stage: FinalsStage
): BracketPair {
  if (player1Id === null || player2Id === null) {
    // Bye: the other player moves on without playing
    return { player1Id, player2Id, advancingId: player1Id === null ? player2Id : player1Id };
  }
  if (player1Id === undefined || player2Id === undefined) {
    return { player1Id, player2Id, advancingId: undefined };
  }
  const match = stageMatches.find((m) => m.roundIndex === roundIndex && isPairMatch(m, player1Id, player2Id));
  const decided = match ? (stage === 'CROSS' ? getMatchWinner(match) : getMatchLoser(match)) : null;
  return { player1Id, player2Id, match, advancingId: decided ?? undefined };
}

/**
 * Derive every round of a bracket from its round-1 slots and the match results.
 */
export function buildBracket(slots: BracketSlots, matches: Match[], stage: FinalsStage): BracketState {
  const stageMatches = matches.filter((m) => m.stage === stage);
  const rounds: BracketRound[] = [];
  let participants: Participant[] = [...slots];
  let roundIndex = 1;

  while (participants.length > 1) {
    const pairs: BracketPair[] = [];
    for (let i = 0; i < participants.length; i += 2) {
      pairs.push(resolvePair(participants[i], participants[i + 1], stageMatches, roundIndex, stage));
    }
    rounds.push({ roundIndex, name: getRoundName(participants.length), pairs });
    participants = pairs.map((pair) => pair.advancingId);
    roundIndex++;
  }

  return { rounds, resultId: participants[0] };
}

/**
 * Bring the matches of one bracket in line with its results: create the matches
 * of each round once all of its players are known, and drop matches of such a
 * round that no longer fit (e.g. after an earlier result was changed).
 * Returns the matches of this stage only.
 */
export function syncBracketMatches(slots: BracketSlots, matches: Match[], stage: FinalsStage): Match[] {
  let stageMatches = matches.filter((m) => m.stage === stage);
  let participants: Participant[] = [...slots];
  let roundIndex = 1;

  while (participants.length > 1 && participants.every((p) => p !== undefined)) {
    const playable: [string, string][] = [];
    for (let i = 0; i < participants.length; i += 2) {
      const [a, b] = [participants[i], participants[i + 1]];
      if (typeof a === 'string' && typeof b === 'string') playable.push([a, b]);
    }

    const round = roundIndex;
    stageMatches = stageMatches.filter(
      (m) => m.roundIndex !== round || playable.some(([a, b]) => isPairMatch(m, a, b))
    );
    for (const [a, b] of playable) {
      if (!stageMatches.some((m) => m.roundIndex === round && isPairMatch(m, a, b))) {
        stageMatches.push({
          id: uuidv4(),
          roundIndex: round,
          stage,
          player1Id: a,
          player2Id: b,
          legsP1: null,
          legsP2: null,
          confirmed: false,
        });
      }
    }

    const next: Participant[] = [];
    for (let i = 0; i < participants.length; i += 2) {
      next.push(resolvePair(participants[i], participants[i + 1], stageMatches, round, stage).advancingId);
    }
    participants = next;
    roundIndex++;
  }

  return stageMatches;
}

/**
 * Round-1 slots of a bracket. Brackets created before slots were stored are
 * reconstructed from their round-1 matches.
 */
export function getBracketSlots(
  bracket: FinalsBracket | undefined,
  matches: Match[],
  stage: FinalsStage
): BracketSlots {
  const stored = bracket?.[stage];
  if (stored && stored.length > 0) return stored;

  const firstRound = matches
    .filter((m) => m.stage === stage && m.roundIndex === 1)
    .sort((a, b) => a.id.localeCompare(b.id));
  const slots: BracketSlots = firstRound.flatMap((m) => [m.player1Id, m.player2Id]);
  const size = nextPowerOfTwo(slots.length);
  while (slots.length > 0 && slots.length < size) slots.push(null);
  return slots;
}

/**
 * Generate both finals brackets from the pool standings.
 */
export function generateFinals(
  pools: Pool[],
  allStandings: { [poolId: string]: StandingsRow[] },
  topCount: number,
  bottomCount: number,
  manualAssignments?: { [playerId: string]: FinalsAssignment }
): { matches: Match[]; bracket: FinalsBracket } {
  const { crossFinalists, losersFinalists } = selectFinalists(
    pools,
    allStandings,
    topCount,
    bottomCount,
    manualAssignments
  );

  const cross = seedBracket(crossFinalists, 'CROSS');
  const losers = losersFinalists.length >= 2 ? seedBracket(losersFinalists, 'LOSERS') : [];

  return {
    matches: [...syncBracketMatches(cross, [], 'CROSS'), ...syncBracketMatches(losers, [], 'LOSERS')],
    bracket: { CROSS: cross, LOSERS: losers },
  };
}
