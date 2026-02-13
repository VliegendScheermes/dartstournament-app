import { createServerClient } from '@supabase/ssr'

export async function requireAuth(request: Request) {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 }
  }

  const token = authHeader.substring(7)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {}
      }
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return { error: 'Invalid token', status: 401 }
  }

  return { user, userId: user.id }
}
