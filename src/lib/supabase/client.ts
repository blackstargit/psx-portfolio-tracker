import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseClient() {
  if (!client) {
    // createBrowserClient stores the auth session in cookies (not localStorage),
    // so the Next.js middleware and route handlers can read the logged-in user.
    client = createBrowserClient<Database>(supabaseUrl, supabasePublishableKey)
  }
  return client
}

export const supabase = getSupabaseClient()
