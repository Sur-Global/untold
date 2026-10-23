import type { SupabaseClient } from '@supabase/supabase-js'

export type PickerArticle = {
  id: string
  title: string
  authorName: string | null
  publishedAt: string | null
  /** the issue it belongs to now, if any (e.g. "Jun 2026") */
  issueLabel: string | null
}

/** The published articles an admin can put in an issue, newest first */
export async function loadPickerArticles(supabase: SupabaseClient): Promise<PickerArticle[]> {
  const { data } = await (supabase as any)
    .from('content')
    .select(`
      id, source_locale, published_at,
      issue:issues!content_issue_id_fkey ( issue_date ),
      profiles!author_id ( display_name ),
      content_translations ( title, locale )
    `)
    .eq('type', 'article')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(500)

  return (data ?? []).map((r: any) => {
    const translations: { title: string | null; locale: string }[] = r.content_translations ?? []
    const title = translations.find((t) => t.locale === (r.source_locale ?? 'es'))?.title ?? translations.find((t) => t.title)?.title ?? r.id
    return {
      id: r.id,
      title,
      authorName: r.profiles?.display_name ?? null,
      publishedAt: r.published_at ?? null,
      issueLabel: r.issue?.issue_date ? new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${r.issue.issue_date}T00:00:00Z`)) : null,
    }
  })
}
