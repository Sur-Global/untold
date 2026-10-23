import type { SupabaseClient } from '@supabase/supabase-js'
import { getTranslation } from '@/lib/content'
import { bodyExcerpt } from '@/lib/editorial'

type EditorialRow = {
  id: string
  source_locale: string | null
  content_translations: { title: string; excerpt: string | null; featured_summary?: string | null; locale: string }[] | null
}

/**
 * Title and short opening text of editorials, in the reader's language. An editorial without a written
 * summary opens with the first paragraph of its text.
 */
export async function editorialTexts(
  supabase: SupabaseClient,
  rows: EditorialRow[],
  locale: string,
): Promise<Map<string, { title: string; excerpt: string }>> {
  const out = new Map<string, { title: string; excerpt: string }>()
  const needBody: EditorialRow[] = []
  for (const row of rows) {
    const trans = getTranslation((row.content_translations ?? []) as any, locale)
    const excerpt = trans?.excerpt || trans?.featured_summary || ''
    out.set(row.id, { title: trans?.title ?? 'Untitled', excerpt })
    if (!excerpt) needBody.push(row)
  }
  if (needBody.length) {
    const { data: bodies } = await (supabase as any)
      .from('content_translations')
      .select('content_id, locale, body')
      .in('content_id', needBody.map((r) => r.id))
      .in('locale', [...new Set([locale, ...needBody.map((r) => r.source_locale ?? 'es')])])
    for (const row of needBody) {
      const mine = (bodies ?? []).filter((b: any) => b.content_id === row.id)
      const body = (mine.find((b: any) => b.locale === locale) ?? mine.find((b: any) => b.locale === (row.source_locale ?? 'es')) ?? mine[0])?.body
      out.get(row.id)!.excerpt = bodyExcerpt(body)
    }
  }
  return out
}
