import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { tournamentInclude } from '@/lib/db/tournamentInclude'

// GET /api/tournaments/[id]/public - Public read-only access (no authentication required)
// Used by viewer pages (live-viewer, split-view, OBS sources) that must be accessible
// to anyone with the link, including unauthenticated users and OBS browser sources.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const tournament = await prisma.tournament.findFirst({
      where: { id },
      // The owner's account id is not needed by viewers
      omit: { userId: true },
      include: tournamentInclude
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
    console.error('Error fetching public tournament:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tournament' },
      { status: 500 }
    )
  }
}
