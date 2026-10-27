import { Suspense } from 'react'
import { after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { triggerListingTranslations } from '@/lib/trigger-listing-translations'
import { triggerTagTranslations } from '@/lib/trigger-tag-translations'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'
import { loadTagCloud } from '@/lib/data/tag-cloud'
import { TranslationRefresher } from '@/components/TranslationRefresher'
import { ArticlesFilter } from './ArticlesFilter'
import { TopicStrip } from '@/components/content/TopicStrip'
import Link from 'next/link'
import { FeaturedSection } from '@/components/content/FeaturedSection'
import { PAGE_FEATURED_SLOTS } from '@/lib/featured-slots'
import { tagDisplayName } from '@/lib/tag-name'
import { cardTopic } from '@/lib/topics'

const BASE_LIMIT = 12
const LOAD_MORE_STEP = 12

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ limit?: string; filter?: string; tag?: string }>
}

export default async function ArticlesPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { limit: limitStr, filter, tag } = await searchParams
  const limit = Math.min(100, Math.max(BASE_LIMIT, parseInt(limitStr ?? String(BASE_LIMIT), 10)))

  const [tListings, tSearch, supabase, navData] = await Promise.all([
    getTranslations('listings'),
    getTranslations('search'),
    createClient(),
    getNavProps(),
  ])
  const { userId, ...navProps } = navData
  const tNav = await getTranslations('nav')

  // The tags of published articles, to offer their topics in one row
  const cloud = await loadTagCloud(supabase, 'article', locale)

  // Build filtered content IDs from the topic
  let filteredIds: string[] | null = null

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
      filteredIds = tagIds
    } else {
      filteredIds = []
    }
  }

  // ★ picks (admin/content) at the top of the default view; kept out of the main list below
  let featuredItems: any[] = []
  if (!tag && !filter) {
    const { data: featuredRows } = await (supabase as any)
      .from('content')
      .select(`
        id, slug, type, source_locale, single_language, subtitle_locales, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
        profiles!author_id ( display_name, slug, role, avatar_url ),
        content_translations ( title, excerpt, featured_summary, locale ),
        content_tags ( tags ( names, slug, is_topic ) )
      `)
      .eq('type', 'article')
      .eq('status', 'published')
    .eq('is_curated', true)
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(PAGE_FEATURED_SLOTS)
    featuredItems = featuredRows ?? []
  }

  // Build articles query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let articlesQuery: any = null

  if (filteredIds === null || filteredIds.length > 0) {
    articlesQuery = (supabase as any)
      .from('content')
      .select(
        `
        id, slug, type, source_locale, single_language, subtitle_locales, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
        profiles!author_id ( display_name, slug, role, avatar_url ),
        content_translations ( title, excerpt, featured_summary, locale ),
        content_tags ( tags ( names, slug, is_topic ) )
      `,
        { count: 'exact' }
      )
      .eq('type', 'article')
      .eq('status', 'published')
    .eq('is_curated', true)

    if (filteredIds !== null) {
      articlesQuery = articlesQuery.in('id', filteredIds)
    }

    if (filter === 'featured') {
      articlesQuery = articlesQuery.eq('is_featured', true)
    }

    if (featuredItems.length > 0) {
      articlesQuery = articlesQuery.not('id', 'in', `(${featuredItems.map((i) => i.id).join(',')})`)
    }

    if (filter === 'trending') {
      articlesQuery = articlesQuery.order('likes_count', { ascending: false })
    } else if (filter === 'recent') {
      articlesQuery = articlesQuery.order('published_at', { ascending: false })
    } else {
      articlesQuery = articlesQuery.order('published_at', { ascending: false })
    }

    articlesQuery = articlesQuery.range(0, limit - 1)
  }

  const { data: articles, count } = articlesQuery
    ? await articlesQuery
    : { data: [], count: 0 }

  // Fetch bookmarks
  const listed = [...featuredItems, ...(articles ?? [])]
  const contentIds = listed.map((a: any) => a.id)
  const bookmarkedIds = new Set<string>()
  if (userId && contentIds.length > 0) {
    const { data: bookmarks } = await (supabase as any)
      .from('bookmarks')
      .select('content_id')
      .eq('user_id', userId)
      .in('content_id', contentIds)
    bookmarks?.forEach((b: any) => bookmarkedIds.add(b.content_id))
  }

  // Trigger background translation for articles without a locale translation yet
  let pendingTranslations = false
  if (listed.length > 0) {
    const untranslatedIds = listed
      .filter(a => !a.single_language && !(a.content_translations ?? []).some((t: any) => t.locale === locale))
      .map((a: any) => a.id)
    if (untranslatedIds.length > 0) {
      pendingTranslations = true
      after(() => triggerListingTranslations(untranslatedIds, locale))
    }
    after(() => triggerTagTranslations(locale))
  }

  const hasMore = (count ?? 0) > limit
  const nextLimit = limit + LOAD_MORE_STEP

  function buildUrl(overrides: Record<string, string | null>) {
    const params: Record<string, string> = {}
    if (filter) params.filter = filter
    if (tag) params.tag = tag
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) delete params[k]
      else params[k] = v
    }
    const qs = new URLSearchParams(params).toString()
    return qs ? `?${qs}` : ''
  }

  const renderCard = (article: any) => {
        const t = getTranslation(article.content_translations ?? [], locale)
        const firstTag = cardTopic(article.content_tags)
        const categoryTag = firstTag
          ? tagDisplayName(firstTag.names, locale, firstTag.slug)
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
            excerpt={t?.excerpt || t?.featured_summary}
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
            singleLanguage={article.single_language}
            sourceLocale={article.source_locale}
            subtitleLocales={article.subtitle_locales}

          />
        )
  }

  return (
    <>
      <TranslationRefresher pending={pendingTranslations} />
      <Navigation {...navProps} />
      <main className="bg-background min-h-screen">
        {/* Hero / filter section */}
        <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="max-w-[1280px] mx-auto px-6 pt-16 pb-10">
            {/* Title + description */}
            <div className="text-center mb-10">
              <h1
                className="text-foreground mb-4"
                style={{
                  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                  fontWeight: 500,
                  fontSize: 'clamp(36px, 6vw, 56px)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                }}
              >
                {tNav('articles')}
              </h1>
              <p
                className="text-lg max-w-[745px] mx-auto leading-[1.56]"
                style={{ color: '#555', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
              >
                {tListings('articlesDesc')}
              </p>
            </div>

            {/* Interactive filters */}
            <Suspense>
              <ArticlesFilter
                labelAll={tSearch('filterAll')}
                labelFeatured={tListings('filterFeatured')}
                labelTrending={tListings('filterTrending')}
                labelRecent={tListings('filterRecent')}
              />
            </Suspense>
            <TopicStrip
              tags={cloud}
              activeSlug={tag}
              basePath="/articles"
              label={tListings('tagCloudLabel')}
              exploreLabel={tListings('topicsExplore')}
              allLabel={tListings('tagCloudAll')}
              allTopicsLabel={tListings('allTopics')}
              keep={{ filter }}
            />
          </div>
        </div>

        {/* Articles grid */}
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          {featuredItems.length > 0 && (
            <FeaturedSection label={tListings('filterFeatured')}>{featuredItems.map(renderCard)}</FeaturedSection>
          )}
          {articles && articles.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map(renderCard)}
              </div>

              {/* Load more */}
              <div className="flex justify-center mt-12">
                {hasMore ? (
                  <Link
                    href={buildUrl({ limit: String(nextLimit) })}
                    scroll={false}
                    className="inline-flex items-center justify-center h-[53px] px-10 rounded-full text-sm tracking-[0.28px] transition-opacity hover:opacity-90"
                    style={{
                      fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                      fontWeight: 500,
                      background: '#A9A8E9',
                      color: '#000',
                    }}
                  >
                    {tListings('loadMore')}
                  </Link>
                ) : (
                  count != null && count > BASE_LIMIT && (
                    <p
                      className="text-sm"
                      style={{ color: '#999', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
                    >
                      {tListings('articlesCount', { count })}
                    </p>
                  )
                )}
              </div>
            </>
          ) : featuredItems.length > 0 ? null : (
            <div className="text-center py-24">
              <p
                className="text-sm"
                style={{ color: '#999', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
              >
                {tag ? tListings('noResults') : tListings('noArticles')}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
