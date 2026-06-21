import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

/**
 * Server-side Supabase client for Route Handlers.
 *
 * It reads the logged-in user's session from the request cookies, so queries
 * run as the `authenticated` role and satisfy the RLS policies. It is async
 * because Next.js 16's `cookies()` returns a Promise — callers must `await` it.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a context where cookies can't be set (e.g. a Server
            // Component). Safe to ignore — the middleware refreshes sessions.
          }
        },
      },
    }
  )
}
