import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

export function isCreatorRole(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'author'
}

/**
 * Call from any server component that requires admin or author access.
 * Redirects to /auth/login if not authenticated, / if wrong role.
 * Returns { user, profile } on success.
 */
export async function requireCreator() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('id, role, display_name, slug')
    .eq('id', user.id)
    .single()

  if (!isCreatorRole(profile?.role)) redirect('/')

  return { user, profile }
}
