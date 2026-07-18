'use server'

import { createClient } from '@/lib/supabase/server'

// Best-effort lookup of a content item's type + title, for a readable activity
// log entry (falls back gracefully if the row/translation can't be found).
export async function getContentLogInfo(
  supabase: any,
  contentId: string,
): Promise<{ type: string | null; label: string | null }> {
  try {
    const { data } = await (supabase as any)
      .from('content')
      .select('type, source_locale, content_translations(title, locale)')
      .eq('id', contentId)
      .maybeSingle()
    if (!data) return { type: null, label: null }
    const translations: Array<{ title: string | null; locale: string }> = data.content_translations ?? []
    const sourceLocale = data.source_locale ?? 'en'
    const label = translations.find((t) => t.locale === sourceLocale)?.title
      ?? translations.find((t) => t.title)?.title
      ?? null
    return { type: data.type ?? null, label }
  } catch {
    return { type: null, label: null }
  }
}

interface LogActivityParams {
  entityType: string
  entityId?: string | null
  entityLabel?: string | null
  action: string
}

// Best-effort audit trail — logging must never break the action it's attached
// to, so failures here are swallowed (and reported to the console) rather
// than propagated.
export async function logActivity({ entityType, entityId, entityLabel, action }: LogActivityParams): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    await (supabase as any).from('activity_log').insert({
      entity_type: entityType,
      entity_id: entityId ?? null,
      entity_label: entityLabel ?? null,
      action,
      actor_id: user.id,
      actor_name: profile?.display_name ?? null,
    })
  } catch (err) {
    console.error('[activity-log] failed to record activity:', err)
  }
}
