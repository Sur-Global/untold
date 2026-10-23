// What happens to the translations of a piece of content when its original text changes.
//  · an automatic translation is made again where the original changed: it is deleted when the title changed (a title
//    cannot be empty), or emptied of the fields that changed, so the translator fills it in on the next visit;
//  · a translation corrected by hand is kept (it is protected) but flagged "needs review", because it may no longer
//    match the original.

export type ChangedFields = { title?: boolean; excerpt?: boolean; description?: boolean; body?: boolean; slides?: boolean }

export async function markTranslationsStale(supabase: any, contentId: string, sourceLocale: string, changed: ChangedFields): Promise<void> {
  if (changed.title) {
    await supabase
      .from('content_translations')
      .delete()
      .eq('content_id', contentId)
      .neq('locale', sourceLocale)
      .or('is_auto_translated.is.null,is_auto_translated.eq.true')
  } else {
    const emptied: Record<string, null> = {}
    if (changed.excerpt) emptied.excerpt = null
    if (changed.description) emptied.description = null
    if (changed.body) emptied.body = null
    if (Object.keys(emptied).length > 0) {
      await supabase
        .from('content_translations')
        .update(emptied)
        .eq('content_id', contentId)
        .neq('locale', sourceLocale)
        .or('is_auto_translated.is.null,is_auto_translated.eq.true')
    }
  }
  if (Object.values(changed).some(Boolean)) {
    await supabase
      .from('content_translations')
      .update({ needs_review: true })
      .eq('content_id', contentId)
      .neq('locale', sourceLocale)
      .eq('is_auto_translated', false)
  }
}

/**
 * Saves the original text of a piece of content and tells which of its fields changed (so the translations can be
 * handled with markTranslationsStale). `values` only has the columns that this kind of content edits.
 */
export async function saveSourceText(
  supabase: any,
  contentId: string,
  sourceLocale: string,
  values: { title: string; excerpt?: string | null; description?: string | null; body?: unknown },
): Promise<ChangedFields> {
  const { data: current } = await supabase
    .from('content_translations')
    .select('title, excerpt, description, body')
    .eq('content_id', contentId)
    .eq('locale', sourceLocale)
    .maybeSingle()

  await supabase
    .from('content_translations')
    .upsert({ content_id: contentId, locale: sourceLocale, ...values }, { onConflict: 'content_id,locale' })

  const differs = (a: unknown, b: unknown) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)
  const changed: ChangedFields = {}
  if (differs(current?.title, values.title)) changed.title = true
  if ('excerpt' in values && differs(current?.excerpt, values.excerpt)) changed.excerpt = true
  if ('description' in values && differs(current?.description, values.description)) changed.description = true
  if ('body' in values && differs(current?.body, values.body)) changed.body = true
  return changed
}
