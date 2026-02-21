import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Next.js Middleware — runs on the Edge before every page request.
 *
 * Public routes (no login required):
 *   /login, /register
 *   /tournament/[id]/live-viewer   — share with audience / OBS
 *   /tournament/[id]/obs-overlay   — OBS browser source
 *   /tournament/[id]/split-view    — OBS split-screen source
 *
 * All other pages redirect to /login when not authenticated.
 * API routes are always skipped — they handle auth via requireAuth (Bearer token).
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip Next.js internals and static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/sounds/')
  ) {
    return NextResponse.next()
  }

  // API routes handle their own auth via requireAuth (Bearer token)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Public pages — always allow without auth
  // Check by splitting on '/' so we match exact path segments
  const segments = pathname.split('/')
  const lastSegment = segments[segments.length - 1] || segments[segments.length - 2]

  if (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/register' ||
    pathname.startsWith('/register/') ||
    lastSegment === 'live-viewer' ||
    lastSegment === 'obs-overlay' ||
    lastSegment === 'split-view'
  ) {
    return NextResponse.next()
  }

  // All other pages — check Supabase session, redirect to /login if not authenticated
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Apply to all routes except Next.js build output and common static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wav|mp3)).*)',
  ],
}
