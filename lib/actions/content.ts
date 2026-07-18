'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { isEditorRole } from '@/lib/require-editor'
import { logActivity, getContentLogInfo } from '@/lib/actions/activity-log'

export async function publishContent(id: string, _formData: FormData) {
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const query = (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
  if (!isEditorRole(profile.role)) query.eq('author_id', user.id)
  await query

  const { type, label } = await getContentLogInfo(supabase, id)
  await logActivity({ entityType: type ?? 'content', entityId: id, entityLabel: label, action: 'published' })

  // 'layout' invalidates /dashboard and all nested pages (edit pages included)
  revalidatePath('/dashboard', 'layout')

  after(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
        },
        body: JSON.stringify({ contentId: id }),
      })
      if (!res.ok) {
        console.error(`Translation trigger failed for ${id}: ${res.status}`)
      }
    } catch (err) {
      console.error(`Translation trigger error for ${id}:`, err)
    }

    // transcript extraction
    try {
      const transcriptRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/transcript`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-transcript-secret': process.env.TRANSCRIPT_API_SECRET!,
        },
        body: JSON.stringify({ contentId: id }),
      })
      if (!transcriptRes.ok) {
        console.error(`Transcript trigger failed for ${id}: ${transcriptRes.status}`)
      }
    } catch (err) {
      console.error(`Transcript trigger error for ${id}:`, err)
    }
  })
}

export async function unpublishContent(id: string, _formData: FormData) {
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const query = (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)
  if (!isEditorRole(profile.role)) query.eq('author_id', user.id)
  await query

  const { type, label } = await getContentLogInfo(supabase, id)
  await logActivity({ entityType: type ?? 'content', entityId: id, entityLabel: label, action: 'unpublished' })

  revalidatePath('/dashboard', 'layout')
}

export async function deleteContent(id: string) {
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const { type, label } = await getContentLogInfo(supabase, id)

  const query = (supabase as any)
    .from('content')
    .delete()
    .eq('id', id)
  if (!isEditorRole(profile.role)) query.eq('author_id', user.id)
  await query

  await logActivity({ entityType: type ?? 'content', entityId: id, entityLabel: label, action: 'deleted' })

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
