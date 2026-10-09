import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'

// GET /api/tournaments/[id]/players - List tournament players
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

    const players = await prisma.player.findMany({
      where: { tournamentId: id },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(players, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments/[id]/players - Add player to tournament
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

    const player = await prisma.player.create({
      data: {
        tournamentId: id,
        name: body.name,
        class: body.class || null
      }
    })

    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    )
  }
}

// PUT /api/tournaments/[id]/players - Batch update players
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
    const players: { id?: string; name: string; class?: string | null }[] = body.players || []

    // Update players in place. Deleting and recreating them would cascade-delete
    // their pool assignments and every match they play in.
    await prisma.$transaction(async (tx) => {
      const keepIds = players.map((player) => player.id).filter((playerId): playerId is string => !!playerId)

      // Only players that were removed from the list are deleted
      await tx.player.deleteMany({
        where: { tournamentId: id, id: { notIn: keepIds } }
      })

      const existing = await tx.player.findMany({ where: { tournamentId: id } })
      const existingById = new Map(existing.map((player) => [player.id, player]))

      const toCreate = []
      for (const player of players) {
        const data = { name: player.name, class: player.class || null }
        const current = player.id ? existingById.get(player.id) : undefined

        if (!current) {
          toCreate.push({ ...(player.id && { id: player.id }), tournamentId: id, ...data })
        } else if (current.name !== data.name || current.class !== data.class) {
          await tx.player.update({ where: { id: current.id }, data })
        }
      }

      if (toCreate.length > 0) {
        await tx.player.createMany({ data: toCreate })
      }
    })

    return NextResponse.json({ count: players.length })
  } catch (error) {
    console.error('Error updating players:', error)
    return NextResponse.json(
      { error: 'Failed to update players' },
      { status: 500 }
    )
  }
}
