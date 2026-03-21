import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

export async function getNavProps(): Promise<{
  isLoggedIn: boolean
  userRole: UserRole | null
}> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { isLoggedIn: false, userRole: null }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    isLoggedIn: true,
    userRole: (profile?.role as UserRole) ?? null,
  }
}
