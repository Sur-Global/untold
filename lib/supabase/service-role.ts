import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { liveFetchClearingCache } from './public-cache'

/**
 * Service role client — bypasses RLS.
 * Use only in API routes and server-only modules. Never import from client components.
 * Its reads are always live; a save through it clears the answers remembered for visitors (see public-cache.ts).
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: liveFetchClearingCache } },
  )
}
