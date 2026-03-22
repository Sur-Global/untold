import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'
import { ArticlesFilter } from './ArticlesFilter'
import type { TagItem } from './ArticlesFilter'
import Link from 'next/link'

const BASE_LIMIT = 12
const LOAD_MORE_STEP = 12

function tagColorIndex(slug: string): number {
  let hash = 0
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return Math.abs(hash) % 6
}

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ limit?: string; q?: string; filter?: string; tag?: string }>
}

export default async function ArticlesPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { limit: limitStr, q, filter, tag } = await searchParams
  const limit = Math.min(100, Math.max(BASE_LIMIT, parseInt(limitStr ?? String(BASE_LIMIT), 10)))

  const [tListings, tSearch, supabase, navData] = await Promise.all([
    getTranslations('listings'),
    getTranslations('search'),
    createClient(),
    getNavProps(),
  ])
  const { userId, ...navProps } = navData

  // Fetch all tags for the tag cloud
  const { data: tagsData } = await (supabase as any)
    .from('tags')
    .select('slug, names')
    .order('slug')

  const tags: TagItem[] = (tagsData ?? []).map((t: any) => ({
    slug: t.slug,
    name: t.names[locale] ?? t.names['en'] ?? t.slug,
    colorIndex: tagColorIndex(t.slug),
  }))

  // Build filtered content IDs from search/tag
  let filteredIds: string[] | null = null

  if (q?.trim()) {
    const { data: matches } = await (supabase as any)
      .from('content_translations')
      .select('content_id')
      .ilike('title', `%${q.trim()}%`)
    const ids = [...new Set((matches ?? []).map((m: any) => m.content_id))] as string[]
    filteredIds = ids
  }

  if (tag) {
    const { data: tagRow } = await (supabase as any)
      .from('tags')
      .select('id')
      .eq('slug', tag)
      .single()
    if (tagRow) {
      const { data: ctRows } = await (supabase as any)
        .from('content_tags')
        .select('content_id')
        .eq('tag_id', tagRow.id)
      const tagIds = (ctRows ?? []).map((ct: any) => ct.content_id) as string[]
      filteredIds = filteredIds ? filteredIds.filter((id) => tagIds.includes(id)) : tagIds
    } else {
      filteredIds = []
    }
  }

  // Build articles query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let articlesQuery: any = null

  if (filteredIds === null || filteredIds.length > 0) {
    articlesQuery = (supabase as any)
      .from('content')
      .select(
        `
        id, slug, type, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
        profiles!author_id ( display_name, slug, role, avatar_url ),
        content_translations ( title, excerpt, locale ),
        content_tags ( tags ( names, slug ) )
      `,
        { count: 'exact' }
      )
      .eq('type', 'article')
      .eq('status', 'published')

    if (filteredIds !== null) {
      articlesQuery = articlesQuery.in('id', filteredIds)
    }

    if (filter === 'featured') {
      articlesQuery = articlesQuery.eq('is_featured', true)
    }

    if (filter === 'trending') {
      articlesQuery = articlesQuery.order('likes_count', { ascending: false })
    } else if (filter === 'recent') {
      articlesQuery = articlesQuery.order('published_at', { ascending: false })
    } else {
      articlesQuery = articlesQuery
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
    }

    articlesQuery = articlesQuery.range(0, limit - 1)
  }

  const { data: articles, count } = articlesQuery
    ? await articlesQuery
    : { data: [], count: 0 }

  // Fetch bookmarks
  const contentIds = (articles ?? []).map((a: any) => a.id)
  const bookmarkedIds = new Set<string>()
  if (userId && contentIds.length > 0) {
    const { data: bookmarks } = await (supabase as any)
      .from('bookmarks')
      .select('content_id')
      .eq('user_id', userId)
      .in('content_id', contentIds)
    bookmarks?.forEach((b: any) => bookmarkedIds.add(b.content_id))
  }

  const hasMore = (count ?? 0) > limit
  const nextLimit = limit + LOAD_MORE_STEP

  function buildUrl(overrides: Record<string, string | null>) {
    const params: Record<string, string> = {}
    if (q) params.q = q
    if (filter) params.filter = filter
    if (tag) params.tag = tag
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) delete params[k]
      else params[k] = v
    }
    const qs = new URLSearchParams(params).toString()
    return qs ? `?${qs}` : ''
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="bg-background min-h-screen">
        {/* Hero / filter section */}
        <div style={{ borderBottom: '1px solid rgba(139,69,19,0.1)' }}>
          <div className="max-w-[1280px] mx-auto px-6 pt-16 pb-10">
            {/* Title + description */}
            <div className="text-center mb-10">
              <h1
                className="uppercase text-foreground mb-4"
                style={{
                  fontFamily: 'Audiowide, sans-serif',
                  fontSize: 'clamp(36px, 6vw, 56px)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.56px',
                }}
              >
                ARTICLES
              </h1>
              <p
                className="text-lg max-w-[745px] mx-auto leading-[1.56]"
                style={{ color: '#5a4a42', fontFamily: 'Inter, sans-serif' }}
              >
                {tListings('articlesDesc')}
              </p>
            </div>

            {/* Interactive filters */}
            <Suspense>
              <ArticlesFilter
                tags={tags}
                searchPlaceholder={tListings('articlesSearch')}
                labelAll={tSearch('filterAll')}
                labelFeatured={tListings('filterFeatured')}
                labelTrending={tListings('filterTrending')}
                labelRecent={tListings('filterRecent')}
              />
            </Suspense>
          </div>
        </div>

        {/* Articles grid */}
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          {articles && articles.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article: any) => {
                  const t = getTranslation(article.content_translations ?? [], locale)
                  const firstTag = article.content_tags?.[0]?.tags
                  const categoryTag = firstTag
                    ? (firstTag.names[locale] ?? firstTag.names['en'] ?? null)
                    : null
                  const categoryTagSlug = firstTag?.slug ?? null
                  const author = article.profiles
                  return (
                    <ContentCard
                      key={article.id}
                      contentId={article.id}
                      type="article"
                      slug={article.slug}
                      title={t?.title ?? 'Untitled'}
                      excerpt={t?.excerpt}
                      coverImageUrl={article.cover_image_url}
                      publishedAt={article.published_at}
                      likesCount={article.likes_count}
                      authorName={author?.display_name}
                      authorSlug={author?.slug}
                      authorAvatarUrl={author?.avatar_url}
                      categoryTag={categoryTag}
                      categoryTagSlug={categoryTagSlug}
                      readTimeMinutes={article.read_time_minutes}
                      isBookmarked={bookmarkedIds.has(article.id)}
                      isLoggedIn={navProps.isLoggedIn}
                      isFeatured={article.is_featured}

                    />
                  )
                })}
              </div>

              {/* Load more */}
              <div className="flex justify-center mt-12">
                {hasMore ? (
                  <Link
                    href={buildUrl({ limit: String(nextLimit) })}
                    scroll={false}
                    className="inline-flex items-center justify-center h-[53px] px-10 rounded-[10px] text-sm text-white tracking-[0.28px] transition-opacity hover:opacity-90"
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      background: 'linear-gradient(166deg, #8b4513 0%, #a0522d 100%)',
                      boxShadow: '0 2px 8px rgba(44,36,32,0.08), 0 4px 16px rgba(44,36,32,0.04)',
                    }}
                  >
                    {tListings('loadMore')}
                  </Link>
                ) : (
                  count != null && count > BASE_LIMIT && (
                    <p
                      className="text-sm"
                      style={{ color: '#8b7355', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {count} articles
                    </p>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-24">
              <p
                className="text-sm"
                style={{ color: '#8b7355', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {q || tag ? tListings('noResults') : tListings('noArticles')}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
