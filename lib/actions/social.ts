'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/require-user'

export async function toggleLike(contentId: string) {
  const { user } = await requireUser()
  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .maybeSingle()

  if (existing) {
    await (supabase as any)
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', contentId)
  } else {
    await (supabase as any)
      .from('likes')
      .insert({ user_id: user.id, content_id: contentId })
  }

  // Recount and sync the denormalized counter
  const { count } = await (supabase as any)
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('content_id', contentId)

  await (supabase as any)
    .from('content')
    .update({ likes_count: count ?? 0 })
    .eq('id', contentId)

  revalidatePath('/', 'layout')
}

export async function toggleBookmark(contentId: string) {
  const { user } = await requireUser()
  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('bookmarks')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .maybeSingle()

  if (existing) {
    await (supabase as any)
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', contentId)
  } else {
    await (supabase as any)
      .from('bookmarks')
      .insert({ user_id: user.id, content_id: contentId })
  }

  revalidatePath('/', 'layout')
}

export async function toggleFollow(profileId: string) {
  const { user } = await requireUser()
  const supabase = await createClient()

  const { data: existing } = await (supabase as any)
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', profileId)
    .maybeSingle()

  if (existing) {
    await (supabase as any)
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', profileId)
  } else {
    await (supabase as any)
      .from('follows')
      .insert({ follower_id: user.id, following_id: profileId })
  }

  // Recount denormalized counters for both parties
  const { count: followersCount } = await (supabase as any)
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profileId)

  const { count: followingCount } = await (supabase as any)
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', user.id)

  await (supabase as any)
    .from('profiles')
    .update({ followers_count: followersCount ?? 0 })
    .eq('id', profileId)

  await (supabase as any)
    .from('profiles')
    .update({ following_count: followingCount ?? 0 })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
}
