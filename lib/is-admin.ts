import type { SupabaseClient } from '@supabase/supabase-js'

/** True when this signed-in user is an active administrator (for API routes, which cannot redirect). */
export async function isActiveAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await (supabase as any).from('profiles').select('role, suspended_at').eq('id', userId).single()
  return data?.role === 'admin' && !data?.suspended_at
}

/** True when this signed-in user is an active administrator or editor */
export async function isActiveEditor(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await (supabase as any).from('profiles').select('role, suspended_at').eq('id', userId).single()
  return (data?.role === 'admin' || data?.role === 'editor') && !data?.suspended_at
}
