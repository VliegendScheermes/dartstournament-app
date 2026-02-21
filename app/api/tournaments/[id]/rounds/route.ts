import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'

// GET /api/tournaments/[id]/rounds - List tournament rounds
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

    const rounds = await prisma.round.findMany({
      where: { tournamentId: id },
      orderBy: { index: 'asc' }
    })

    return NextResponse.json(rounds, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('Error fetching rounds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rounds' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments/[id]/rounds - Create round
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

    const round = await prisma.round.create({
      data: {
        tournamentId: id,
        index: body.index,
        savedAll: body.savedAll || false
      }
    })

    return NextResponse.json(round, { status: 201 })
  } catch (error) {
    console.error('Error creating round:', error)
    return NextResponse.json(
      { error: 'Failed to create round' },
      { status: 500 }
    )
  }
}

// PUT /api/tournaments/[id]/rounds - Batch update rounds
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
    const rounds = body.rounds || []

    // Use transaction to update rounds
    await prisma.$transaction(async (tx) => {
      for (const round of rounds) {
        await tx.round.upsert({
          where: {
            tournamentId_index: {
              tournamentId: id,
              index: round.index
            }
          },
          create: {
            id: round.id,
            tournamentId: id,
            index: round.index,
            savedAll: round.savedAll || false
          },
          update: {
            savedAll: round.savedAll !== undefined ? round.savedAll : undefined
          }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating rounds:', error)
    return NextResponse.json(
      { error: 'Failed to update rounds' },
      { status: 500 }
    )
  }
}
