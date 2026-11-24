import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'
import { liveFetchClearingCache, publicCachedFetch } from './public-cache'

/** Supabase keeps the session in cookies named sb-<project>-auth-token (split into .0, .1… when long). */
const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/

export async function createClient() {
  const cookieStore = await cookies()
  const all = cookieStore.getAll()
  const signedIn = all.some((c) => AUTH_COOKIE.test(c.name) && c.value)
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Visitors without a session share remembered answers (see public-cache.ts); signed-in people get live data
      global: { fetch: signedIn ? liveFetchClearingCache : publicCachedFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a Server Component — cookie writes are ignored (read-only context)
          }
        },
      },
    }
  )
}
