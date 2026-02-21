import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Next.js Middleware — runs before every request.
 *
 * Public routes (no login required):
 *   /login, /register
 *   /tournament/[id]/live-viewer   — share with audience / OBS
 *   /tournament/[id]/obs-overlay   — OBS browser source
 *   /tournament/[id]/split-view    — OBS split-screen source
 *
 * All other pages redirect to /login when not authenticated.
 * API routes are skipped — they handle auth themselves via requireAuth (Bearer token).
 */

// Pages that are always publicly accessible
const PUBLIC_PAGE_PATTERNS: RegExp[] = [
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  /^\/tournament\/[^/]+\/live-viewer(\/|$)/,
  /^\/tournament\/[^/]+\/obs-overlay(\/|$)/,
  /^\/tournament\/[^/]+\/split-view(\/|$)/,
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/sounds/') ||
    pathname.match(/\.[a-zA-Z0-9]+$/) // files with extensions (favicon.ico, etc.)
  ) {
    return NextResponse.next()
  }

  // API routes handle their own auth via requireAuth (Bearer token) — skip middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Always allow public pages without auth
  if (PUBLIC_PAGE_PATTERNS.some(pattern => pattern.test(pathname))) {
    return NextResponse.next()
  }

  // For all other pages: check Supabase session and redirect if not logged in
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

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  // Apply to all routes except Next.js static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
