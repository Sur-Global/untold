import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { FEATURE_REQUEST_EMAIL, sendNotificationEmail } from '@/lib/notify'
import { getPublicContentPath } from '@/lib/utils'
import type { ContentType } from '@/lib/supabase/types'

// "Send my content to be featured": the creator ticks a box; editors see it in admin → Requests
// and get an email once the content is published. A request is pending while
// feature_requested_at is set and feature_request_resolved_at is not.

/** The checkbox value from a form, or null when the form has no such field (leave the request alone) */
export function readFeatureRequest(formData: FormData): boolean | null {
  const value = formData.get('feature_requested')
  return value === null ? null : value === 'true'
}

/**
 * Applies the checkbox to an existing item. Ticking starts a new request, unticking withdraws it,
 * and saving with the box still ticked leaves a request (or its resolution) untouched.
 * Uses the service role: members can't write the resolution columns. Callers must have
 * already checked the user may edit this item.
 */
export async function syncFeatureRequest(contentId: string, requested: boolean | null): Promise<void> {
  if (requested === null) return
  const db = createServiceRoleClient() as any
  const { data: current } = await db.from('content').select('feature_requested_at').eq('id', contentId).single()
  if (!current) return

  if (requested && !current.feature_requested_at) {
    await db
      .from('content')
      .update({
        feature_requested_at: new Date().toISOString(),
        feature_request_resolved_at: null,
        feature_request_notified_at: null,
      })
      .eq('id', contentId)
  } else if (!requested && current.feature_requested_at) {
    await db
      .from('content')
      .update({ feature_requested_at: null, feature_request_resolved_at: null, feature_request_notified_at: null })
      .eq('id', contentId)
  }
}

/**
 * Emails the team about a pending request, once. Does nothing for drafts (nothing to review yet),
 * already-resolved requests, or requests already notified.
 */
export async function notifyFeatureRequest(contentId: string): Promise<void> {
  try {
    const db = createServiceRoleClient() as any
    const { data: item } = await db
      .from('content')
      .select(
        `id, type, slug, status, source_locale, feature_requested_at, feature_request_resolved_at, feature_request_notified_at,
         profiles!author_id ( display_name ), content_translations ( title, locale )`,
      )
      .eq('id', contentId)
      .single()

    if (
      !item ||
      item.status !== 'published' ||
      !item.feature_requested_at ||
      item.feature_request_resolved_at ||
      item.feature_request_notified_at
    ) {
      return
    }

    // Claim it first so two quick publishes can't send twice
    const { data: claimed } = await db
      .from('content')
      .update({ feature_request_notified_at: new Date().toISOString() })
      .eq('id', contentId)
      .is('feature_request_notified_at', null)
      .select('id')
    if (!claimed?.length) return

    const sourceLocale = item.source_locale ?? 'en'
    const title =
      item.content_translations?.find((t: any) => t.locale === sourceLocale)?.title ??
      item.content_translations?.[0]?.title ??
      '(untitled)'
    const author = item.profiles?.display_name ?? 'A creator'
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
    const reviewUrl = `${site}/admin/requests`
    const contentUrl = `${site}${getPublicContentPath(item.type as ContentType, item.slug)}`

    const ok = await sendNotificationEmail({
      to: FEATURE_REQUEST_EMAIL,
      subject: `Feature request: ${title}`,
      text: `${author} asked for their ${item.type} "${title}" to be featured on UNTOLD.\n\nView it: ${contentUrl}\nReview and decide: ${reviewUrl}\n`,
      html: `<p><strong>${escapeHtml(author)}</strong> asked for their ${escapeHtml(item.type)} <em>“${escapeHtml(title)}”</em> to be featured on UNTOLD.</p><p><a href="${contentUrl}">View it</a> · <a href="${reviewUrl}">Review and decide</a></p>`,
    })

    // Not sent (e.g. email not configured yet): free it so a later publish can try again
    if (!ok) await db.from('content').update({ feature_request_notified_at: null }).eq('id', contentId)
  } catch (err) {
    console.error('[feature-request] notify failed:', err)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
