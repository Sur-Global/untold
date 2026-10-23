'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { requireDeclaration } from '@/lib/declaration'
import { notifyFeatureRequest } from '@/lib/feature-request'
import { isEditorRole } from '@/lib/require-editor'
import { parseSlides, slidesProblem } from '@/lib/pill-slides'
import { logActivity, getContentLogInfo } from '@/lib/actions/activity-log'
import { publishErrorMessage } from '@/lib/profile-complete'

export async function publishContent(id: string, formData: FormData) {
  const { user, profile } = await requireCreator()
  const supabase = await createClient()
  // Publishing needs the creator's "I take responsibility" confirmation (recorded the first time)
  await requireDeclaration(supabase, id, formData)

  // A carousel pill needs its slides complete before it can go public
  const { data: pillMeta } = await (supabase as any).from('pill_meta').select('format, slides').eq('content_id', id).maybeSingle()
  if (pillMeta?.format === 'carousel') {
    const problem = slidesProblem(parseSlides(pillMeta.slides))
    if (problem) throw new Error(problem)
  }

  const query = (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)
  if (!isEditorRole(profile.role)) query.eq('author_id', user.id)
  const { error: publishError } = await query
  if (publishError) throw new Error(publishErrorMessage(publishError))

  const { type, label } = await getContentLogInfo(supabase, id)
  await logActivity({ entityType: type ?? 'content', entityId: id, entityLabel: label, action: 'published' })

  // 'layout' invalidates /dashboard and all nested pages (edit pages included)
  revalidatePath('/dashboard', 'layout')

  after(async () => {
    await notifyFeatureRequest(id)
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
