import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Call from any server component that requires authentication but no specific role.
 * Redirects to /auth/login if not authenticated, /suspended if account is suspended.
 * Returns { user } on success.
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('suspended_at')
    .eq('id', user.id)
    .single()

  if (profile?.suspended_at) redirect('/suspended')

  return { user }
}
