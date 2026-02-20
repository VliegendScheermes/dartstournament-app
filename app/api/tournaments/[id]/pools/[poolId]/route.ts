import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'

// PATCH /api/tournaments/[id]/pools/[poolId] - Update a single pool's metadata (e.g. boardNumber)
// This avoids the DELETE+recreate pattern of the batch PUT route, which would null out
// all match.poolId foreign keys via the onDelete: SetNull cascade.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; poolId: string }> }
) {
  const { id, poolId } = await params
  const auth = await requireAuth(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const tournament = await prisma.tournament.findFirst({
      where: { id, userId: auth.userId }
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const body = await request.json()

    const updated = await prisma.pool.update({
      where: { id: poolId },
      data: {
        ...(body.boardNumber !== undefined && { boardNumber: body.boardNumber }),
        ...(body.name !== undefined && { name: body.name }),
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error patching pool:', error)
    return NextResponse.json({ error: 'Failed to update pool' }, { status: 500 })
  }
}
