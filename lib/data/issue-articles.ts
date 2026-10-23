import type { SupabaseClient } from '@supabase/supabase-js'
import { getTranslation } from '@/lib/content'
import { formatDate } from '@/lib/format-date'
import { isRecent } from '@/lib/editorial'
import type { LatestItem } from '@/components/home/LatestSection'
import { tagDisplayName } from '@/lib/tag-name'

/** The published articles of an issue, newest first (the editorial itself is left out) */
export async function loadIssueArticles(supabase: SupabaseClient, issueId: string, excludeId?: string | null): Promise<any[]> {
  const { data } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, source_locale, single_language, published_at, read_time_minutes, cover_image_url,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, excerpt, featured_summary, locale ),
      content_tags ( tags ( names, slug ) )
    `)
    .eq('issue_id', issueId)
    .eq('type', 'article')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  return (data ?? []).filter((r: any) => r.id !== excludeId)
}

/** Rows from loadIssueArticles, shaped for the article list of the issue pages */
export function toIssueItems(rows: any[], locale: string, readTimeLabel: (minutes: number) => string): LatestItem[] {
  return rows.map((r) => {
    const trans = getTranslation(r.content_translations ?? [], locale)
    const tag = r.content_tags?.[0]?.tags
    return {
      slug: r.slug,
      title: trans?.title ?? 'Untitled',
      coverImageUrl: r.cover_image_url ?? null,
      categoryTag: tag ? tagDisplayName(tag.names, locale, tag.slug) : null,
      authorName: r.profiles?.display_name ?? null,
      dateLabel: r.published_at ? formatDate(r.published_at, locale, { day: 'numeric', month: 'short' }) : null,
      readTimeLabel: r.read_time_minutes ? readTimeLabel(r.read_time_minutes) : null,
      isNew: isRecent(r.published_at),
    }
  })
}
