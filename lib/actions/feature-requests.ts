'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireEditor } from '@/lib/require-editor'
import { sendNotificationEmail } from '@/lib/notify'
import { getPublicContentPath } from '@/lib/utils'
import type { ContentType } from '@/lib/supabase/types'
import { logActivity, getContentLogInfo } from '@/lib/actions/activity-log'
import { setContentPlacement, type ActionResult } from '@/lib/actions/admin'

export type RequestDecision = 'page' | 'home' | 'hero' | 'approve' | 'dismiss'

const PLACEMENT = { page: 'page', home: 'home', hero: 'hero' } as const

/**
 * An editor decides what to do with a "send my content to be featured" request:
 * place it (★ its page / ⌂ homepage section / ↑ hero), just approve it for the general
 * pages, or dismiss it. Returns an error (e.g. "slots are full") instead of throwing.
 */
export async function resolveFeatureRequest(contentId: string, decision: RequestDecision): Promise<ActionResult> {
  const { user, profile } = await requireEditor()
  const supabase = await createClient()

  // Admins decide anything; an editor only decides requests an admin assigned to them
  if (profile.role !== 'admin') {
    const { data: item } = await (supabase as any)
      .from('content')
      .select('feature_review_assigned_to')
      .eq('id', contentId)
      .single()
    if (item?.feature_review_assigned_to !== user.id) {
      return { ok: false, error: 'This request is not assigned to you' }
    }
  }

  if (decision === 'page' || decision === 'home' || decision === 'hero') {
    const result = await setContentPlacement(contentId, PLACEMENT[decision])
    if (!result.ok) return result
  } else if (decision === 'approve') {
    await (supabase as any).from('content').update({ is_curated: true }).eq('id', contentId)
  }

  await (supabase as any)
    .from('content')
    .update({ feature_request_resolved_at: new Date().toISOString() })
    .eq('id', contentId)

  const { type, label } = await getContentLogInfo(supabase, contentId)
  await logActivity({
    entityType: type ?? 'content',
    entityId: contentId,
    entityLabel: label,
    action: `feature_request_${decision}`,
  })

  revalidatePath('/admin/requests')
  revalidatePath('/admin/content')
  revalidatePath('/')
  return { ok: true }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export type AssignResult = ActionResult & { emailed?: boolean }

/**
 * An admin assigns a feature request to an editor (or another admin) to review.
 * The reviewer gets an email with the content, a link to the Requests page and the admin's note.
 * Assigning again replaces the reviewer.
 */
export async function assignFeatureRequest(contentId: string, reviewerId: string, note?: string): Promise<AssignResult> {
  const { user, profile } = await requireEditor()
  if (profile.role !== 'admin') return { ok: false, error: 'Only admins can assign requests' }

  const supabase = await createClient()
  const { data: reviewer } = await (supabase as any)
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', reviewerId)
    .single()
  if (!reviewer || (reviewer.role !== 'editor' && reviewer.role !== 'admin')) {
    return { ok: false, error: 'Pick an editor from the list' }
  }

  const { data: item } = await (supabase as any)
    .from('content')
    .select('id, type, slug, source_locale, content_translations ( title, locale )')
    .eq('id', contentId)
    .single()
  if (!item) return { ok: false, error: 'Content not found' }

  const cleanNote = (note ?? '').trim().slice(0, 1000) || null
  const { error } = await (supabase as any)
    .from('content')
    .update({
      feature_review_assigned_to: reviewerId,
      feature_review_assigned_at: new Date().toISOString(),
      feature_review_note: cleanNote,
    })
    .eq('id', contentId)
  if (error) return { ok: false, error: 'Could not assign this request' }

  const { type, label } = await getContentLogInfo(supabase, contentId)
  await logActivity({
    entityType: type ?? 'content',
    entityId: contentId,
    entityLabel: label,
    action: 'feature_request_assigned',
  })

  // Email the reviewer (login email first, contact email as a fallback)
  const sr = createServiceRoleClient() as any
  const { data: authUser } = await sr.auth.admin.getUserById(reviewerId)
  const { data: reviewerProfile } = await sr.from('profiles').select('email').eq('id', reviewerId).single()
  const to: string | undefined = authUser?.user?.email ?? reviewerProfile?.email ?? undefined

  let emailed = false
  if (to) {
    const sourceLocale = item.source_locale ?? 'en'
    const title =
      item.content_translations?.find((t: any) => t.locale === sourceLocale)?.title ??
      item.content_translations?.[0]?.title ??
      '(untitled)'
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
    const reviewUrl = `${site}/admin/requests`
    const contentUrl = `${site}${getPublicContentPath(item.type as ContentType, item.slug)}`
    const assigner = profile.display_name ?? 'An admin'
    emailed = await sendNotificationEmail({
      to,
      subject: `Assigned to you: review “${title}”`,
      text:
        `${assigner} assigned you to review a feature request on UNTOLD.\n\n` +
        `${item.type}: ${title}\n${contentUrl}\n` +
        (cleanNote ? `\nInstructions from ${assigner}:\n${cleanNote}\n` : '') +
        `\nReview and decide: ${reviewUrl}\n`,
      html:
        `<p><strong>${escapeHtml(assigner)}</strong> assigned you to review a feature request on UNTOLD.</p>` +
        `<p>${escapeHtml(item.type)}: <a href="${contentUrl}">${escapeHtml(title)}</a></p>` +
        (cleanNote ? `<p><strong>Instructions:</strong><br>${escapeHtml(cleanNote).replace(/\n/g, '<br>')}</p>` : '') +
        `<p><a href="${reviewUrl}">Review and decide</a></p>`,
    })
  }

  revalidatePath('/admin/requests')
  return { ok: true, emailed }
}
