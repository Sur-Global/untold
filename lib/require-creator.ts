import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

export function isCreatorRole(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'author'
}

/**
 * Call from any server component that requires admin or author access.
 * Redirects to /auth/login if not authenticated, / if wrong role, /suspended if suspended.
 * Returns { user, profile } on success.
 */
export async function requireCreator() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('id, role, display_name, slug, suspended_at')
    .eq('id', user.id)
    .single()

  if (!isCreatorRole(profile?.role)) redirect('/')
  if (profile?.suspended_at) redirect('/suspended')

  return { user, profile }
}
