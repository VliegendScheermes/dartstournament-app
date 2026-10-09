import { NextRequest, NextResponse } from 'next/server'
import { liveMatchStore } from '@/lib/liveMatchStore'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'

// GET /api/tournaments/[id]/live-match — public, no auth required
// Read by the OBS overlay to show live scoreboard data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = liveMatchStore.get(id)
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' }
  })
}

// Only the logged-in owner of the tournament may write its live match state.
// Returns an error response, or null when the request may proceed.
async function requireTournamentOwner(request: NextRequest, id: string): Promise<NextResponse | null> {
  const auth = await requireAuth(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const tournament = await prisma.tournament.findFirst({
      where: { id, userId: auth.userId },
      select: { id: true }
    })

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error verifying tournament ownership:', error)
    return NextResponse.json(
      { error: 'Failed to verify tournament' },
      { status: 500 }
    )
  }

  return null
}

// POST /api/tournaments/[id]/live-match — requires auth + tournament ownership (operator only)
// Written by the scoreboard page whenever match state changes.
// Body must carry an increasing `seq`; updates older than the stored one are ignored (409).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const denied = await requireTournamentOwner(request, id)
  if (denied) return denied

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Requests can arrive out of order — never let an older update overwrite a newer one
  const rawSeq = (body as { seq?: unknown }).seq
  const seq = typeof rawSeq === 'number' && Number.isFinite(rawSeq) ? rawSeq : 0
  if (!liveMatchStore.set(id, body, seq)) {
    return NextResponse.json(
      { ok: false, ignored: true, error: 'Stale update', seq: liveMatchStore.getSeq(id) },
      { status: 409 }
    )
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/tournaments/[id]/live-match — requires auth + tournament ownership (operator only)
// Called when scoreboard is closed / match ends
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const denied = await requireTournamentOwner(request, id)
  if (denied) return denied

  liveMatchStore.clear(id)
  return NextResponse.json({ ok: true })
}
