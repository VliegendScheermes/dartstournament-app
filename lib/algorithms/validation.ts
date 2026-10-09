/**
 * Tournament Validation
 * Checks before drawing pools and before starting the tournament
 */

import { Player, Pool, TournamentSettings, VALIDATION } from '@/types/tournament';

function finalsFitPool(settings: TournamentSettings, smallestPool: number): string[] {
  const perPool = settings.advanceToCrossFinals + settings.advanceToLosersFinal;
  if (perPool <= smallestPool) return [];
  return [
    `Per poule gaan ${settings.advanceToCrossFinals} speler(s) naar de kruisfinales en ` +
      `${settings.advanceToLosersFinal} naar de losers bracket (samen ${perPool}), ` +
      `maar de kleinste poule heeft ${smallestPool} spelers. Pas de instellingen aan.`,
  ];
}

/** Problems that prevent drawing the pools; empty when the draw can go ahead */
export function validateDraw(players: Player[], settings: TournamentSettings): string[] {
  if (players.length < VALIDATION.MIN_PLAYERS) {
    return [`Er zijn minimaal ${VALIDATION.MIN_PLAYERS} spelers nodig (nu ${players.length}).`];
  }
  if (settings.numPools < VALIDATION.MIN_POOLS || settings.numPools > VALIDATION.MAX_POOLS) {
    return [`Het aantal poules moet tussen ${VALIDATION.MIN_POOLS} en ${VALIDATION.MAX_POOLS} liggen.`];
  }
  if (players.length < settings.numPools * 2) {
    return [
      `${settings.numPools} poules is te veel voor ${players.length} spelers: ` +
        `elke poule heeft minstens 2 spelers nodig.`,
    ];
  }
  return finalsFitPool(settings, Math.floor(players.length / settings.numPools));
}

/** Problems that prevent starting the tournament with the drawn pools */
export function validateStart(players: Player[], pools: Pool[], settings: TournamentSettings): string[] {
  if (pools.length === 0 || pools.every((pool) => pool.playerIds.length === 0)) {
    return ['Voer eerst de loting uit.'];
  }

  const errors: string[] = [];
  if (pools.length !== settings.numPools) {
    errors.push(
      `Er zijn ${pools.length} poules geloot, maar de instellingen zeggen ${settings.numPools}. Loot opnieuw.`
    );
  }

  const assigned = new Set(pools.flatMap((pool) => pool.playerIds));
  const missing = players.filter((player) => !assigned.has(player.id));
  if (missing.length > 0) {
    errors.push(
      `${missing.map((player) => player.name).join(', ')} ${missing.length === 1 ? 'zit' : 'zitten'} ` +
        `nog niet in een poule (toegevoegd na de loting?). Loot opnieuw.`
    );
  }

  const known = new Set(players.map((player) => player.id));
  if ([...assigned].some((playerId) => !known.has(playerId))) {
    errors.push('Een poule bevat een speler die niet meer in de spelerslijst staat. Loot opnieuw.');
  }

  const smallestPool = Math.min(...pools.map((pool) => pool.playerIds.length));
  if (smallestPool < 2) {
    errors.push('Elke poule moet minstens 2 spelers hebben.');
  }

  return [...errors, ...finalsFitPool(settings, smallestPool)];
}
