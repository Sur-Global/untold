import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service role client — bypasses RLS.
 * Use only in API routes and server-only modules. Never import from client components.
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
