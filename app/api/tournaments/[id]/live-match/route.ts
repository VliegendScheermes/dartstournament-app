import { NextRequest, NextResponse } from 'next/server'
import { liveMatchStore } from '@/lib/liveMatchStore'
import { requireAuth } from '@/lib/auth/middleware'

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

// POST /api/tournaments/[id]/live-match — requires auth (operator only)
// Written by the scoreboard page whenever match state changes
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
    const body = await request.json()
    liveMatchStore.set(id, body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
}

// DELETE /api/tournaments/[id]/live-match — requires auth (operator only)
// Called when scoreboard is closed / match ends
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requireAuth(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  liveMatchStore.clear(id)
  return NextResponse.json({ ok: true })
}
