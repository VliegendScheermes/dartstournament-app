/**
 * Tournament Advice
 *
 * Works out which tournament setups are possible for a number of players and
 * ranks them, so the organiser does not have to guess how many pools to make.
 *
 * The number of players going to the losers bracket follows the pool size: with
 * the losers bracket on, everyone who does not reach the cross finals goes there,
 * so pools of 4 with the best 2 through send the bottom 2, and pools of 3 send
 * only the last one. With unequal pools that is based on the smallest pool, so
 * the bigger pools do drop a player.
 */

import { TournamentSettings, VALIDATION } from '@/types/tournament';
import { POOL_LETTERS } from '@/lib/algorithms/drawing';

/** What the organiser wants the advice to favour */
export type AdvicePriority = 'equal' | 'matches' | 'short';

export interface AdviceInput {
  players: number;
  boards: number;
  losersFinal: boolean;
}

export interface AdvicePool {
  name: string;
  size: number;
}

export interface AdviceOption {
  numPools: number;
  advanceToCrossFinals: number;
  advanceToLosersFinal: number;
  pools: AdvicePool[];
  /** Every pool holds the same number of players */
  equalPools: boolean;
  smallestPool: number;
  largestPool: number;
  poolMatches: number;
  matchesPerBoard: number;
  minMatchesPerPlayer: number;
  maxMatchesPerPlayer: number;
  crossFinalists: number;
  crossMatches: number;
  /** Players who get a bye in round 1 because the field is not a power of two */
  crossByes: number;
  losersFinalists: number;
  losersMatches: number;
  /** Players who play neither bracket after the pool phase */
  eliminatedAfterPools: number;
  totalMatches: number;
  /** Nothing to remark on: equal pools, a round bracket and nobody sent home */
  perfect: boolean;
  good: string[];
  cautions: string[];
}

export interface AdviceTip {
  kind: 'ok' | 'suggestion';
  text: string;
}

export interface AdviceResult {
  options: AdviceOption[];
  /** Why no setup is possible at all (too few players, for instance) */
  problems: string[];
  tip: AdviceTip | null;
}

/** Pool sizes for `players` over `numPools`, largest first; they differ by at most one */
export function poolSizes(players: number, numPools: number): number[] {
  const base = Math.floor(players / numPools);
  const remainder = players % numPools;
  return Array.from({ length: numPools }, (_, i) => base + (i < remainder ? 1 : 0));
}

const roundRobinMatches = (size: number): number => (size * (size - 1)) / 2;

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function buildOption(
  input: AdviceInput,
  numPools: number,
  top: number
): AdviceOption | null {
  const sizes = poolSizes(input.players, numPools);
  const smallestPool = sizes[sizes.length - 1];
  const largestPool = sizes[0];

  // Every pool needs at least two players, and at least one place must be left
  // over for the players who do not reach the cross finals
  if (smallestPool < 2 || top < 1 || top > smallestPool - 1) return null;

  const bottom = input.losersFinal ? smallestPool - top : 0;
  const crossFinalists = numPools * top;
  const losersFinalists = numPools * bottom;
  if (crossFinalists < 2) return null;
  if (input.losersFinal && losersFinalists < 2) return null;

  const poolMatches = sizes.reduce((total, size) => total + roundRobinMatches(size), 0);
  const crossMatches = crossFinalists - 1;
  const losersMatches = losersFinalists >= 2 ? losersFinalists - 1 : 0;
  const eliminatedAfterPools = sizes.reduce(
    (total, size) => total + Math.max(0, size - top - bottom),
    0
  );
  const crossByes = nextPowerOfTwo(crossFinalists) - crossFinalists;
  const equalPools = smallestPool === largestPool;

  const good: string[] = [];
  const cautions: string[] = [];

  if (equalPools) good.push('Gelijke poules');
  else cautions.push(`Poules van ${largestPool} en ${smallestPool} door elkaar`);

  if (eliminatedAfterPools === 0) good.push('Iedereen speelt door na de poules');
  else cautions.push(`${plural(eliminatedAfterPools, 'speler stopt', 'spelers stoppen')} na de poules`);

  if (crossByes === 0) good.push('Kruisfinale precies rond');
  else cautions.push(`${plural(crossByes, 'speler slaat', 'spelers slaan')} de eerste finaleronde over`);

  if (smallestPool < 3) cautions.push('Maar één wedstrijd per speler in de poulefase');

  return {
    numPools,
    advanceToCrossFinals: top,
    advanceToLosersFinal: bottom,
    pools: sizes.map((size, i) => ({ name: `Poule ${POOL_LETTERS[i]}`, size })),
    equalPools,
    smallestPool,
    largestPool,
    poolMatches,
    matchesPerBoard: Math.ceil(poolMatches / Math.max(1, input.boards)),
    minMatchesPerPlayer: smallestPool - 1,
    maxMatchesPerPlayer: largestPool - 1,
    crossFinalists,
    crossMatches,
    crossByes,
    losersFinalists,
    losersMatches,
    eliminatedAfterPools,
    totalMatches: poolMatches + crossMatches + losersMatches,
    perfect:
      equalPools &&
      crossByes === 0 &&
      eliminatedAfterPools === 0 &&
      smallestPool >= 3 &&
      smallestPool <= MAX_SENSIBLE_POOL,
    good,
    cautions,
  };
}

/** Above this, a pool means so many matches that the evening runs long */
const MAX_SENSIBLE_POOL = 6;

/** Distance from the 4-6 players per pool that makes for a decent pool phase */
function sweetSpotDistance(size: number): number {
  if (size < 4) return 4 - size;
  if (size > MAX_SENSIBLE_POOL) return size - MAX_SENSIBLE_POOL;
  return 0;
}

/**
 * How far the number going through is from the better half of the pool. Pools of 4
 * send their best 2 through, pools of 3 their best 2, so only the last one drops to
 * the losers bracket. Without this, the fewest matches would win and the advice
 * would send one player up and the whole rest down.
 */
function halfDistance(option: AdviceOption): number {
  return Math.abs(option.advanceToCrossFinals - Math.ceil(option.smallestPool / 2));
}

/** Setups that make for a poor evening, whatever else they score on */
function qualityTier(option: AdviceOption, priority: AdvicePriority): number {
  // One match per player is always weak
  if (option.minMatchesPerPlayer < 2) return 1;
  // Big pools mean a long evening — unless the organiser asked for many matches
  if (priority !== 'matches' && option.smallestPool > MAX_SENSIBLE_POOL) return 1;
  return 0;
}

/** Sort key, compared position by position; lower is better */
function rankKey(option: AdviceOption, priority: AdvicePriority): number[] {
  const tier = qualityTier(option, priority);
  const uneven = option.equalPools ? 0 : 1;

  if (priority === 'matches') {
    return [tier, -option.minMatchesPerPlayer, uneven, halfDistance(option), option.crossByes];
  }
  if (priority === 'short') {
    return [tier, option.totalMatches, halfDistance(option), uneven, option.crossByes];
  }
  return [
    tier,
    uneven,
    halfDistance(option),
    sweetSpotDistance(option.smallestPool),
    option.crossByes,
    option.totalMatches,
  ];
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Every workable setup for these players, best first */
function rankedOptions(input: AdviceInput, priority: AdvicePriority): AdviceOption[] {
  const options: AdviceOption[] = [];

  for (let numPools = VALIDATION.MIN_POOLS; numPools <= VALIDATION.MAX_POOLS; numPools++) {
    if (numPools * 2 > input.players) break;
    const smallest = poolSizes(input.players, numPools)[numPools - 1];
    for (let top = 1; top <= smallest - 1; top++) {
      const option = buildOption(input, numPools, top);
      if (option) options.push(option);
    }
  }

  return options.sort((a, b) => compareKeys(rankKey(a, priority), rankKey(b, priority)));
}

/** The best setup for a player count, used to judge whether another count works out better */
function bestOption(input: AdviceInput, priority: AdvicePriority): AdviceOption | undefined {
  return rankedOptions(input, priority)[0];
}

function describe(option: AdviceOption): string {
  const sizes = option.equalPools
    ? `${option.numPools} poules van ${option.smallestPool}`
    : `${option.numPools} poules: ${option.pools.map((p) => p.size).join(' / ')}`;
  const through = `beste ${option.advanceToCrossFinals} door`;
  const losers =
    option.advanceToLosersFinal > 0
      ? `, onderste ${option.advanceToLosersFinal} naar de verliezersfinale`
      : '';
  return `${sizes}, ${through}${losers}`;
}

/**
 * Advice for a number of players: the setups worth considering, plus a tip when
 * one or two players more or fewer would make it come out right.
 */
export function buildAdvice(input: AdviceInput, priority: AdvicePriority = 'equal'): AdviceResult {
  const problems: string[] = [];

  if (!Number.isFinite(input.players) || input.players < VALIDATION.MIN_PLAYERS) {
    problems.push(`Er zijn minimaal ${VALIDATION.MIN_PLAYERS} spelers nodig om een toernooi te spelen.`);
  }
  if (input.players > VALIDATION.MAX_PLAYERS) {
    problems.push(`De app werkt met maximaal ${VALIDATION.MAX_PLAYERS} spelers.`);
  }
  if (problems.length > 0) {
    return { options: [], problems, tip: null };
  }

  const ranked = rankedOptions(input, priority);
  if (ranked.length === 0) {
    return {
      options: [],
      problems: ['Met dit aantal spelers is geen werkbare poule-indeling te maken.'],
      tip: null,
    };
  }

  // Show a few setups, at most two per pool count, so the choices stay varied
  const options: AdviceOption[] = [];
  const perPoolCount = new Map<number, number>();
  for (const option of ranked) {
    const used = perPoolCount.get(option.numPools) ?? 0;
    if (used >= 2) continue;
    perPoolCount.set(option.numPools, used + 1);
    options.push(option);
    if (options.length === 4) break;
  }

  let tip: AdviceTip | null = null;
  if (options[0].perfect) {
    tip = { kind: 'ok', text: `${input.players} spelers komt precies uit: ${describe(options[0])}.` };
  } else {
    // Would one or two players more or fewer come out right?
    const better: string[] = [];
    for (const delta of [1, -1, 2, -2]) {
      const players = input.players + delta;
      if (players < VALIDATION.MIN_PLAYERS || players > VALIDATION.MAX_PLAYERS) continue;
      const best = bestOption({ ...input, players }, priority);
      if (best?.perfect) better.push(`Met ${players} spelers: ${describe(best)}.`);
      if (better.length === 2) break;
    }
    if (better.length > 0) {
      tip = {
        kind: 'suggestion',
        text: `${better.join(' ')} Een speler erbij of eraf lost het dus helemaal op.`,
      };
    }
  }

  return { options, problems: [], tip };
}

/** The settings an option sets when the organiser takes it over */
export function optionSettings(option: AdviceOption): Pick<
  TournamentSettings,
  'numPools' | 'advanceToCrossFinals' | 'advanceToLosersFinal'
> {
  return {
    numPools: option.numPools,
    advanceToCrossFinals: option.advanceToCrossFinals,
    advanceToLosersFinal: option.advanceToLosersFinal,
  };
}

/** Short label for a setup, used on the choice buttons */
export function optionLabel(option: AdviceOption): string {
  return option.equalPools
    ? `${option.numPools} poules van ${option.smallestPool}`
    : `${option.numPools} poules: ${option.pools.map((p) => p.size).join(' / ')}`;
}

/** Second line on the choice buttons: who goes through */
export function optionSubLabel(option: AdviceOption): string {
  const through = `beste ${option.advanceToCrossFinals} door`;
  return option.advanceToLosersFinal > 0
    ? `${through} · onderste ${option.advanceToLosersFinal} naar verliezersfinale`
    : through;
}
