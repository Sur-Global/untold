import type { SupabaseClient } from '@supabase/supabase-js'
import { getTranslation } from '@/lib/content'
import { rankRelated, type RelatedCandidate } from '@/lib/related'

/** What the content cards under "También te puede interesar" need */
export type RelatedItem = {
  contentId: string
  type: 'article' | 'video' | 'podcast' | 'pill'
  slug: string
  title: string
  excerpt?: string | null
  coverImageUrl?: string | null
  publishedAt?: string | null
  likesCount: number
  authorName?: string | null
  authorSlug?: string | null
  authorAvatarUrl?: string | null
  categoryTag?: string | null
  categoryTagSlug?: string | null
  readTimeMinutes?: number | null
  isBookmarked: boolean
  isFeatured: boolean
  singleLanguage: boolean
  sourceLocale?: string | null
  subtitleLocales?: string[] | null
  duration?: string | null
  episodeNumber?: string | null
  accentColor?: string | null
}

const TYPES = ['article', 'video', 'podcast', 'pill']

const SELECT = `
  id, slug, type, source_locale, single_language, subtitle_locales, is_featured, is_home_featured, is_hero_featured,
  likes_count, published_at, cover_image_url, read_time_minutes,
  profiles!author_id ( display_name, slug, avatar_url ),
  content_translations ( title, excerpt, featured_summary, description, locale ),
  content_tags ( tags ( slug, names ) ),
  video_meta ( thumbnail_url, duration ),
  podcast_meta ( duration, episode_number ),
  pill_meta ( accent_color, image_url )
`

type Row = RelatedCandidate & { row: any }

/**
 * Up to three suggestions for a content page, drawn from what is published on the general pages: same
 * topic first (featured before the rest, then the most recent), topped up with the closest content.
 */
export async function loadRelatedContent(
  supabase: SupabaseClient,
  { contentId, type, locale, userId }: { contentId: string; type: string; locale: string; userId?: string | null },
  limit = 3,
): Promise<RelatedItem[]> {
  const db = supabase as any
  const { data: own } = await db.from('content_tags').select('tag_id, tags ( slug )').eq('content_id', contentId)
  const tagIds: string[] = (own ?? []).map((r: any) => r.tag_id)
  const tagSlugs: string[] = (own ?? []).map((r: any) => r.tags?.slug).filter(Boolean)

  const pool = () => db.from('content').select(SELECT).eq('status', 'published').eq('is_curated', true).in('type', TYPES).neq('id', contentId)
  const sharedQuery = tagIds.length
    ? db
        .from('content')
        .select(`${SELECT}, matching:content_tags!inner ( tag_id )`)
        .eq('status', 'published')
        .eq('is_curated', true)
        .in('type', TYPES)
        .neq('id', contentId)
        .in('matching.tag_id', tagIds)
        .order('published_at', { ascending: false })
        .limit(60)
    : Promise.resolve({ data: [] })
  const [shared, featured, recent] = await Promise.all([
    sharedQuery,
    pool().or('is_featured.eq.true,is_home_featured.eq.true,is_hero_featured.eq.true').order('published_at', { ascending: false }).limit(30),
    pool().order('published_at', { ascending: false }).limit(30),
  ])

  const byId = new Map<string, Row>()
  for (const r of [...(shared.data ?? []), ...(featured.data ?? []), ...(recent.data ?? [])]) {
    if (byId.has(r.id)) continue
    byId.set(r.id, {
      id: r.id,
      type: r.type,
      tagSlugs: (r.content_tags ?? []).map((ct: any) => ct.tags?.slug).filter(Boolean),
      isFeatured: !!(r.is_featured || r.is_home_featured || r.is_hero_featured),
      publishedAt: r.published_at ?? null,
      row: r,
    })
  }

  const top = rankRelated({ id: contentId, type, tagSlugs }, [...byId.values()], limit)
  if (top.length === 0) return []

  const bookmarked = new Set<string>()
  if (userId) {
    const { data } = await db.from('bookmarks').select('content_id').eq('user_id', userId).in('content_id', top.map((t) => t.id))
    for (const b of data ?? []) bookmarked.add(b.content_id)
  }

  return top.map(({ row: r }) => {
    const t = getTranslation(r.content_translations ?? [], locale)
    // the card's topic label: a topic shared with this page when there is one
    const tags = (r.content_tags ?? []).map((ct: any) => ct.tags).filter(Boolean)
    const tag = tags.find((x: any) => tagSlugs.includes(x.slug)) ?? tags[0]
    const kind = r.type as RelatedItem['type']
    return {
      contentId: r.id,
      type: kind,
      slug: r.slug,
      title: t?.title ?? 'Untitled',
      excerpt: t?.excerpt || t?.featured_summary || t?.description || null,
      coverImageUrl: r.cover_image_url ?? r.video_meta?.thumbnail_url ?? r.pill_meta?.image_url ?? null,
      publishedAt: r.published_at,
      likesCount: r.likes_count ?? 0,
      authorName: r.profiles?.display_name ?? null,
      authorSlug: r.profiles?.slug ?? null,
      authorAvatarUrl: r.profiles?.avatar_url ?? null,
      categoryTag: tag ? (tag.names?.[locale] ?? tag.names?.en ?? null) : null,
      categoryTagSlug: tag?.slug ?? null,
      readTimeMinutes: r.read_time_minutes ?? null,
      isBookmarked: bookmarked.has(r.id),
      isFeatured: !!(r.is_featured || r.is_home_featured || r.is_hero_featured),
      singleLanguage: !!r.single_language,
      sourceLocale: r.source_locale ?? null,
      subtitleLocales: r.subtitle_locales ?? null,
      duration: r.video_meta?.duration ?? r.podcast_meta?.duration ?? null,
      episodeNumber: r.podcast_meta?.episode_number ?? null,
      accentColor: r.pill_meta?.accent_color ?? null,
    }
  })
}
