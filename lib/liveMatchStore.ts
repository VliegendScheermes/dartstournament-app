/**
 * Live match state, keyed by tournament ID.
 * Written by the scoreboard page (operator); read by the OBS overlay (public).
 *
 * Stored in the LiveMatch table: on serverless hosting the scoreboard's writes and
 * the overlay's reads are served by different instances, so process memory can't be
 * shared between them. Until the LiveMatch migration has been applied the store falls
 * back to process memory (the old behaviour), so the scoreboard keeps working.
 *
 * Every write carries a sequence number. Writes with a lower sequence number than the
 * stored one are ignored, so a request that arrives late can never overwrite newer state.
 */

import { prisma } from '@/lib/db/prisma';

interface LiveMatchEntry {
  seq: number;
  data: unknown;
}

// Fallback when the LiveMatch table doesn't exist yet
const memory = new Map<string, LiveMatchEntry>();

// Raw query failed because the table is missing (Postgres 42P01: undefined_table)
function isMissingTable(error: unknown): boolean {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  return code === 'P2010' && /42P01|does not exist/.test(message ?? '');
}

export const liveMatchStore = {
  async get(tournamentId: string): Promise<unknown> {
    try {
      const rows = await prisma.$queryRaw<{ payload: unknown }[]>`
        SELECT "payload" FROM "LiveMatch" WHERE "tournamentId" = ${tournamentId}`;
      return rows[0]?.payload ?? null;
    } catch (error) {
      if (!isMissingTable(error)) throw error;
      return memory.get(tournamentId)?.data ?? null;
    }
  },

  /** Sequence number of the stored state, or null when nothing is stored. */
  async getSeq(tournamentId: string): Promise<number | null> {
    try {
      const rows = await prisma.$queryRaw<{ seq: number }[]>`
        SELECT "seq" FROM "LiveMatch" WHERE "tournamentId" = ${tournamentId}`;
      return rows[0]?.seq ?? null;
    } catch (error) {
      if (!isMissingTable(error)) throw error;
      return memory.get(tournamentId)?.seq ?? null;
    }
  },

  /**
   * Stores `data` unless the stored state has a higher sequence number.
   * The check and the write are one statement, so concurrent writes can't interleave.
   * Returns false when the write was ignored as stale.
   */
  async set(tournamentId: string, data: unknown, seq: number = 0): Promise<boolean> {
    try {
      const written = await prisma.$executeRaw`
        INSERT INTO "LiveMatch" ("tournamentId", "payload", "seq", "updatedAt")
        VALUES (${tournamentId}, ${JSON.stringify(data)}::jsonb, ${seq}::double precision, NOW())
        ON CONFLICT ("tournamentId") DO UPDATE
          SET "payload" = EXCLUDED."payload", "seq" = EXCLUDED."seq", "updatedAt" = NOW()
          WHERE "LiveMatch"."seq" <= EXCLUDED."seq"`;
      return written > 0;
    } catch (error) {
      if (!isMissingTable(error)) throw error;
      const current = memory.get(tournamentId);
      if (current && seq < current.seq) return false;
      memory.set(tournamentId, { seq, data });
      return true;
    }
  },

  async clear(tournamentId: string): Promise<void> {
    try {
      await prisma.$executeRaw`DELETE FROM "LiveMatch" WHERE "tournamentId" = ${tournamentId}`;
    } catch (error) {
      if (!isMissingTable(error)) throw error;
    }
    memory.delete(tournamentId);
  },
};
