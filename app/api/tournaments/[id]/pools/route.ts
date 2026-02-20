import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'

// GET /api/tournaments/[id]/pools - List tournament pools
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    // Verify tournament ownership
    const tournament = await prisma.tournament.findFirst({
      where: { id, userId: auth.userId }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    const pools = await prisma.pool.findMany({
      where: { tournamentId: id },
      include: {
        players: {
          include: {
            player: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(pools)
  } catch (error) {
    console.error('Error fetching pools:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pools' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments/[id]/pools - Create pools
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    // Verify tournament ownership
    const tournament = await prisma.tournament.findFirst({
      where: { id, userId: auth.userId }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    const pool = await prisma.pool.create({
      data: {
        tournamentId: id,
        name: body.name,
        boardNumber: body.boardNumber || null
      }
    })

    return NextResponse.json(pool, { status: 201 })
  } catch (error) {
    console.error('Error creating pool:', error)
    return NextResponse.json(
      { error: 'Failed to create pool' },
      { status: 500 }
    )
  }
}

// PUT /api/tournaments/[id]/pools - Batch update pools
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    // Verify tournament ownership
    const tournament = await prisma.tournament.findFirst({
      where: { id, userId: auth.userId }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const pools = body.pools || []

    // Use a transaction to update pools and pool players
    await prisma.$transaction(async (tx) => {
      // Delete existing pools and pool players
      await tx.pool.deleteMany({
        where: { tournamentId: id }
      })

      // Create new pools
      for (const pool of pools) {
        const createdPool = await tx.pool.create({
          data: {
            id: pool.id,
            tournamentId: id,
            name: pool.name,
            boardNumber: pool.boardNumber || null
          }
        })

        // Create pool players
        if (pool.players && pool.players.length > 0) {
          await tx.poolPlayer.createMany({
            data: pool.players.map((player: any) => ({
              poolId: createdPool.id,
              playerId: player.playerId || player.id
            }))
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating pools:', error)
    return NextResponse.json(
      { error: 'Failed to update pools' },
      { status: 500 }
    )
  }
}

// DELETE /api/tournaments/[id]/pools - Delete all pools
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    // Verify tournament ownership
    const tournament = await prisma.tournament.findFirst({
      where: { id, userId: auth.userId }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    await prisma.pool.deleteMany({
      where: { tournamentId: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pools:', error)
    return NextResponse.json(
      { error: 'Failed to delete pools' },
      { status: 500 }
    )
  }
}
