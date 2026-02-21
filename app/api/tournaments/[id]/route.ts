import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'

// GET /api/tournaments/[id] - Get single tournament with all relations
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
    const tournament = await prisma.tournament.findFirst({
      where: {
        id,
        userId: auth.userId
      },
      include: {
        players: true,
        pools: {
          include: {
            players: {
              include: {
                player: true
              }
            }
          }
        },
        matches: {
          include: {
            player1: true,
            player2: true
          }
        },
        rounds: true
      }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(tournament, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error fetching tournament:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tournament' },
      { status: 500 }
    )
  }
}

// PUT /api/tournaments/[id] - Update tournament
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
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.tournament.findFirst({
      where: { id, userId: auth.userId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        ...(body.tournamentName && { tournamentName: body.tournamentName }),
        ...(body.numPools !== undefined && { numPools: body.numPools }),
        ...(body.numBoards !== undefined && { numBoards: body.numBoards }),
        ...(body.advanceToCrossFinals !== undefined && { advanceToCrossFinals: body.advanceToCrossFinals }),
        ...(body.advanceToLosersFinal !== undefined && { advanceToLosersFinal: body.advanceToLosersFinal }),
        ...(body.useClasses !== undefined && { useClasses: body.useClasses }),
        ...(body.liveDrawDelaySeconds !== undefined && { liveDrawDelaySeconds: body.liveDrawDelaySeconds }),
        ...(body.youtubeStreamUrl !== undefined && { youtubeStreamUrl: body.youtubeStreamUrl }),
        ...(body.status && { status: body.status }),
        ...(body.drawState !== undefined && { drawState: body.drawState }),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(tournament)
  } catch (error) {
    console.error('Error updating tournament:', error)
    return NextResponse.json(
      { error: 'Failed to update tournament' },
      { status: 500 }
    )
  }
}

// DELETE /api/tournaments/[id] - Delete tournament
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
    // Verify ownership
    const existing = await prisma.tournament.findFirst({
      where: { id, userId: auth.userId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    await prisma.tournament.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tournament:', error)
    return NextResponse.json(
      { error: 'Failed to delete tournament' },
      { status: 500 }
    )
  }
}
