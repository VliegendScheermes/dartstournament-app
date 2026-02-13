import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'

// GET /api/tournaments/[id]/matches - List tournament matches
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

    const stage = request.nextUrl.searchParams.get('stage')
    const roundIndex = request.nextUrl.searchParams.get('roundIndex')

    const matches = await prisma.match.findMany({
      where: {
        tournamentId: id,
        ...(stage && { stage }),
        ...(roundIndex && { roundIndex: parseInt(roundIndex) })
      },
      include: {
        player1: true,
        player2: true,
        pool: true
      },
      orderBy: [
        { roundIndex: 'asc' },
        { boardNumber: 'asc' }
      ]
    })

    return NextResponse.json(matches)
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments/[id]/matches - Create match
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

    const match = await prisma.match.create({
      data: {
        tournamentId: id,
        roundIndex: body.roundIndex,
        poolId: body.poolId || null,
        stage: body.stage,
        player1Id: body.player1Id,
        player2Id: body.player2Id,
        legsP1: body.legsP1 || null,
        legsP2: body.legsP2 || null,
        confirmed: body.confirmed || false,
        boardNumber: body.boardNumber || null
      }
    })

    return NextResponse.json(match, { status: 201 })
  } catch (error) {
    console.error('Error creating match:', error)
    return NextResponse.json(
      { error: 'Failed to create match' },
      { status: 500 }
    )
  }
}

// PUT /api/tournaments/[id]/matches - Batch update matches
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
    const matches = body.matches || []

    // Use transaction to update matches
    await prisma.$transaction(async (tx) => {
      for (const match of matches) {
        await tx.match.upsert({
          where: { id: match.id },
          create: {
            id: match.id,
            tournamentId: id,
            roundIndex: match.roundIndex,
            poolId: match.poolId || null,
            stage: match.stage,
            player1Id: match.player1Id,
            player2Id: match.player2Id,
            legsP1: match.legsP1 || null,
            legsP2: match.legsP2 || null,
            confirmed: match.confirmed || false,
            boardNumber: match.boardNumber || null
          },
          update: {
            roundIndex: match.roundIndex,
            poolId: match.poolId || null,
            stage: match.stage,
            player1Id: match.player1Id,
            player2Id: match.player2Id,
            legsP1: match.legsP1 !== undefined ? match.legsP1 : undefined,
            legsP2: match.legsP2 !== undefined ? match.legsP2 : undefined,
            confirmed: match.confirmed !== undefined ? match.confirmed : undefined,
            boardNumber: match.boardNumber !== undefined ? match.boardNumber : undefined
          }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating matches:', error)
    return NextResponse.json(
      { error: 'Failed to update matches' },
      { status: 500 }
    )
  }
}

// DELETE /api/tournaments/[id]/matches - Delete all matches
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

    await prisma.match.deleteMany({
      where: { tournamentId: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting matches:', error)
    return NextResponse.json(
      { error: 'Failed to delete matches' },
      { status: 500 }
    )
  }
}
