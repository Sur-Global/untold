'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireEditor } from '@/lib/require-editor'
import { logActivity, getContentLogInfo } from '@/lib/actions/activity-log'

export async function toggleFeatured(contentId: string) {
  await requireEditor()
  const supabase = await createClient()

  const { data: item } = await (supabase as any)
    .from('content')
    .select('is_featured')
    .eq('id', contentId)
    .single()

  const nowFeatured = !item?.is_featured
  await (supabase as any)
    .from('content')
    // Unfeaturing also clears hero placement — an article can't be in the
    // homepage hero without also being Featured.
    .update(nowFeatured ? { is_featured: true } : { is_featured: false, is_hero_featured: false })
    .eq('id', contentId)

  const { type, label } = await getContentLogInfo(supabase, contentId)
  await logActivity({ entityType: type ?? 'content', entityId: contentId, entityLabel: label, action: nowFeatured ? 'featured' : 'unfeatured' })

  revalidatePath('/admin/content')
  revalidatePath('/')
}

const MAX_HERO_FEATURED = 3

export async function toggleHeroFeatured(contentId: string) {
  await requireEditor()
  const supabase = await createClient()

  const { data: item } = await (supabase as any)
    .from('content')
    .select('is_featured, is_hero_featured')
    .eq('id', contentId)
    .single()

  if (!item) throw new Error('Content not found')

  if (!item.is_hero_featured) {
    if (!item.is_featured) throw new Error('Must be Featured before it can go in the homepage hero')

    const { count } = await (supabase as any)
      .from('content')
      .select('id', { count: 'exact', head: true })
      .eq('is_hero_featured', true)
    if ((count ?? 0) >= MAX_HERO_FEATURED) {
      throw new Error(`Homepage hero is full (max ${MAX_HERO_FEATURED}) — remove one first`)
    }
  }

  const nowHeroFeatured = !item.is_hero_featured
  await (supabase as any)
    .from('content')
    .update({ is_hero_featured: nowHeroFeatured })
    .eq('id', contentId)

  const { type, label } = await getContentLogInfo(supabase, contentId)
  await logActivity({ entityType: type ?? 'content', entityId: contentId, entityLabel: label, action: nowHeroFeatured ? 'hero_featured' : 'hero_unfeatured' })

  revalidatePath('/admin/content')
  revalidatePath('/')
}

export async function adminUnpublishContent(contentId: string) {
  await requireEditor()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null, is_featured: false })
    .eq('id', contentId)

  const { type, label } = await getContentLogInfo(supabase, contentId)
  await logActivity({ entityType: type ?? 'content', entityId: contentId, entityLabel: label, action: 'unpublished' })

  revalidatePath('/admin/content')
}

export async function setUserRole(userId: string, role: 'user' | 'author' | 'editor' | 'admin') {
  const { profile: viewer } = await requireEditor()
  const supabase = await createClient()

  if (viewer.role !== 'admin') {
    if (role === 'admin') throw new Error('Only admins can grant the admin role')
    const { data: target } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (target?.role === 'admin') throw new Error('Only admins can modify admin accounts')
  }

  const { data: target } = await (supabase as any)
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()

  await (supabase as any)
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  await logActivity({ entityType: 'user', entityId: userId, entityLabel: target?.display_name ?? null, action: `role_changed_to_${role}` })

  revalidatePath('/admin/users')
}

export async function toggleSuspendUser(userId: string) {
  const { profile: viewer } = await requireEditor()
  const supabase = await createClient()

  const { data: target } = await (supabase as any)
    .from('profiles')
    .select('display_name, role, suspended_at')
    .eq('id', userId)
    .single()

  if (viewer.role !== 'admin' && target?.role === 'admin') {
    throw new Error('Only admins can ban admin accounts')
  }

  const nowSuspended = !target?.suspended_at
  await (supabase as any)
    .from('profiles')
    .update({
      suspended_at: nowSuspended ? new Date().toISOString() : null,
    })
    .eq('id', userId)

  await logActivity({ entityType: 'user', entityId: userId, entityLabel: target?.display_name ?? null, action: nowSuspended ? 'suspended' : 'unsuspended' })

  revalidatePath('/admin/users')
}

export async function deleteUser(userId: string) {
  const { profile: viewer } = await requireEditor()
  const supabase = await createClient()

  const { data: target } = await (supabase as any)
    .from('profiles')
    .select('display_name, role')
    .eq('id', userId)
    .single()

  if (viewer.role !== 'admin' && target?.role === 'admin') {
    throw new Error('Only admins can delete admin accounts')
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  await logActivity({ entityType: 'user', entityId: userId, entityLabel: target?.display_name ?? null, action: 'deleted' })

  revalidatePath('/admin/users')
  revalidatePath('/admin/content')
}
