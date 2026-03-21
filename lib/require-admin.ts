import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Call from any server component or action that requires admin access.
 * Redirects to /auth/login if not authenticated, / if not admin, /suspended if suspended.
 * Returns { user } on success.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, suspended_at')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')
  if (profile?.suspended_at) redirect('/suspended')

  return { user }
}
