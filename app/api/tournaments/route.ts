import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'

// GET /api/tournaments - List user's tournaments
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const status = request.nextUrl.searchParams.get('status')

    const tournaments = await prisma.tournament.findMany({
      where: {
        userId: auth.userId,
        ...(status && { status })
      },
      include: {
        _count: {
          select: {
            players: true,
            pools: true,
            matches: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tournaments)
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    )
  }
}

// POST /api/tournaments - Create new tournament
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()

    const tournament = await prisma.tournament.create({
      data: {
        userId: auth.userId,
        tournamentName: body.tournamentName || 'New Tournament',
        numPools: body.numPools || 4,
        numBoards: body.numBoards || 4,
        advanceToCrossFinals: body.advanceToCrossFinals || 2,
        advanceToLosersFinal: body.advanceToLosersFinal || 2,
        useClasses: body.useClasses || false,
        liveDrawDelaySeconds: body.liveDrawDelaySeconds || 3,
        youtubeStreamUrl: body.youtubeStreamUrl || null,
        status: body.status || 'setup',
        drawState: body.drawState || null
      }
    })

    return NextResponse.json(tournament, { status: 201 })
  } catch (error) {
    console.error('Error creating tournament:', error)
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    )
  }
}
