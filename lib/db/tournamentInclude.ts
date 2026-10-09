import { Prisma } from '@prisma/client'

/**
 * Relations loaded for a full tournament, in a stable order.
 * Without an explicit orderBy Postgres returns rows in physical order, which
 * changes after an UPDATE (e.g. setting a pool's board number reorders the pools).
 */
export const tournamentInclude = {
  players: { orderBy: { name: 'asc' } },
  pools: {
    orderBy: { name: 'asc' },
    include: {
      players: {
        include: { player: true },
        orderBy: { player: { name: 'asc' } }
      }
    }
  },
  matches: {
    include: { player1: true, player2: true },
    orderBy: [{ roundIndex: 'asc' }, { pool: { name: 'asc' } }, { id: 'asc' }]
  },
  rounds: { orderBy: { index: 'asc' } }
} satisfies Prisma.TournamentInclude
