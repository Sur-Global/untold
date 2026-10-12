'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireEditor } from '@/lib/require-editor'
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
  await requireEditor()
  const supabase = await createClient()

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
