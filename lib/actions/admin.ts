'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireEditor } from '@/lib/require-editor'
import { logActivity, getContentLogInfo } from '@/lib/actions/activity-log'
import { HERO_SLOTS, HOME_SLOTS, PAGE_FEATURED_SLOTS, TYPE_PLURAL, type PlacementType } from '@/lib/featured-slots'

export type ActionResult = { ok: true } | { ok: false; error: string }

type Placement = 'page' | 'home' | 'hero'

const PLACEMENT_COLUMN = {
  page: 'is_featured',
  home: 'is_home_featured',
  hero: 'is_hero_featured',
} as const

const PLACEMENT_LOG = {
  page: { on: 'featured', off: 'unfeatured' },
  home: { on: 'home_featured', off: 'home_unfeatured' },
  hero: { on: 'hero_featured', off: 'hero_unfeatured' },
} as const

function fullMessage(placement: Placement, type: string, count: number, cap: number): string {
  const plural = TYPE_PLURAL[type as PlacementType] ?? `${type}s`
  const slots = `${count} of ${cap}`
  if (placement === 'hero') {
    return `The homepage hero is full (${slots}). Remove one first — see "Placement slots" above the table.`
  }
  if (placement === 'home') {
    return `The homepage ${plural} section is full (${slots}). Remove one first — see "Placement slots" above the table.`
  }
  return `The ★ featured slots on the ${plural} page are full (${slots}). Remove one first — see "Placement slots" above the table.`
}

// Expected problems ("slots are full") are returned, not thrown: in production Next.js
// replaces the message of a thrown server-action error with a generic one.
async function togglePlacement(contentId: string, placement: Placement): Promise<ActionResult> {
  await requireEditor()
  const supabase = await createClient()
  const column = PLACEMENT_COLUMN[placement]

  const { data: item } = await (supabase as any)
    .from('content')
    .select('type, status, is_featured, is_home_featured, is_hero_featured')
    .eq('id', contentId)
    .single()

  if (!item) return { ok: false, error: 'Content not found' }

  const turningOn = !item[column]
  const update: Record<string, boolean> = { [column]: turningOn }

  if (turningOn) {
    if (item.status !== 'published') return { ok: false, error: 'Only published content can be placed' }
    if (placement === 'home' && item.is_hero_featured) {
      return { ok: false, error: 'This item is already in the homepage hero — remove it from the hero first.' }
    }

    const cap =
      placement === 'hero' ? HERO_SLOTS : placement === 'home' ? HOME_SLOTS[item.type as PlacementType] ?? 0 : PAGE_FEATURED_SLOTS
    let countQuery = (supabase as any)
      .from('content')
      .select('id', { count: 'exact', head: true })
      .eq(column, true)
      .eq('status', 'published')
    if (placement !== 'hero') countQuery = countQuery.eq('type', item.type)
    const { count } = await countQuery
    if ((count ?? 0) >= cap) return { ok: false, error: fullMessage(placement, item.type, count ?? 0, cap) }

    // The hero takes over from the homepage section so an item never shows twice on the homepage
    if (placement === 'hero') update.is_home_featured = false
  }

  await (supabase as any).from('content').update(update).eq('id', contentId)

  const { type, label } = await getContentLogInfo(supabase, contentId)
  const log = PLACEMENT_LOG[placement]
  await logActivity({ entityType: type ?? 'content', entityId: contentId, entityLabel: label, action: turningOn ? log.on : log.off })

  revalidatePath('/admin/content')
  revalidatePath('/')
  return { ok: true }
}

export async function toggleFeatured(contentId: string): Promise<ActionResult> {
  return togglePlacement(contentId, 'page')
}

export async function toggleHomeFeatured(contentId: string): Promise<ActionResult> {
  return togglePlacement(contentId, 'home')
}

export async function toggleHeroFeatured(contentId: string): Promise<ActionResult> {
  return togglePlacement(contentId, 'hero')
}

export async function adminUnpublishContent(contentId: string) {
  await requireEditor()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null, is_featured: false, is_home_featured: false, is_hero_featured: false })
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
