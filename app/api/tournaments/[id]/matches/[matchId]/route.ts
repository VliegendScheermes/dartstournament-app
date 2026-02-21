import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'

// PATCH /api/tournaments/[id]/matches/[matchId] - Update a single match
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id, matchId } = await params
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

    // Verify match belongs to this tournament
    const existingMatch = await prisma.match.findFirst({
      where: {
        id: matchId,
        tournamentId: id
      }
    })

    if (!existingMatch) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Update only the provided fields
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        ...(body.legsP1 !== undefined && { legsP1: body.legsP1 !== null ? parseInt(String(body.legsP1), 10) : null }),
        ...(body.legsP2 !== undefined && { legsP2: body.legsP2 !== null ? parseInt(String(body.legsP2), 10) : null }),
        ...(body.confirmed !== undefined && { confirmed: body.confirmed }),
        ...(body.boardNumber !== undefined && { boardNumber: body.boardNumber !== null ? (parseInt(String(body.boardNumber), 10) || null) : null }),
        ...(body.roundIndex !== undefined && { roundIndex: body.roundIndex }),
        ...(body.poolId !== undefined && { poolId: body.poolId }),
        ...(body.stage !== undefined && { stage: body.stage }),
        ...(body.player1Id !== undefined && { player1Id: body.player1Id }),
        ...(body.player2Id !== undefined && { player2Id: body.player2Id }),
      }
    })

    return NextResponse.json(updatedMatch)
  } catch (error: any) {
    console.error('Error updating match:', error)
    return NextResponse.json(
      { error: 'Failed to update match', detail: error?.message ?? String(error) },
      { status: 500 }
    )
  }
}
