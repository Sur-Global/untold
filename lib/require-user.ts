import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Call from any server component that requires authentication but no specific role.
 * Redirects to /auth/login if not authenticated.
 * Returns { user } on success.
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return { user }
}
