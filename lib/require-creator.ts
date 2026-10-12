import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

export type CreatableType = 'article' | 'video' | 'podcast' | 'pill' | 'course'

// Anyone with an account can create articles, videos and knowledge pills.
// Podcasts and courses are curated: only admins and editors create them.
const EDITOR_ONLY_TYPES: CreatableType[] = ['podcast', 'course']

/** Can this role use the creation tools at all (every logged-in member can)? */
export function isCreatorRole(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'editor' || role === 'author' || role === 'user'
}

export function canCreateType(role: UserRole | null | undefined, type: CreatableType): boolean {
  if (!isCreatorRole(role)) return false
  return EDITOR_ONLY_TYPES.includes(type) ? role === 'admin' || role === 'editor' : true
}

/**
 * Call from any server component or action that needs the creation tools.
 * Redirects to /auth/login if not authenticated, /suspended if suspended.
 * Pass `type` when creating a new item, to also enforce who may create that type
 * (podcasts/courses → /create for non-editors).
 * Returns { user, profile } on success.
 */
export async function requireCreator(type?: CreatableType) {
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
  if (type && !canCreateType(profile?.role, type)) redirect('/create')

  return { user, profile }
}
