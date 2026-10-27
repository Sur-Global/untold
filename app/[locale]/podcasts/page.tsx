import { after } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation, needsListingTranslation } from '@/lib/content'
import { triggerListingTranslations } from '@/lib/trigger-listing-translations'
import { triggerTagTranslations } from '@/lib/trigger-tag-translations'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'
import { TagCloud } from '@/components/content/TagCloud'
import { contentIdsForTag, loadTagCloud } from '@/lib/data/tag-cloud'
import { TranslationRefresher } from '@/components/TranslationRefresher'
import { tagDisplayName } from '@/lib/tag-name'
import { Fragment } from 'react'
import { Link } from '@/i18n/navigation'
import { PodcastBanner } from '@/components/podcasts/PodcastBanner'
import { getPodcastBanner } from '@/lib/data/podcast-banner'
import { PODCAST_ORIGINS, PODCAST_ORIGIN_KEYS, isPodcastOrigin, type PodcastOrigin } from '@/lib/podcast-origin'

const PAGE_SIZE = 12 // one type's own list ("view all")
const SECTION_SIZE = 6 // the latest episodes of each type, on the page with all of them

const SELECT = `
  id, slug, type, source_locale, single_language, subtitle_locales, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
  profiles!author_id ( display_name, slug, role, avatar_url ),
  content_translations ( title, excerpt, locale ),
  content_tags ( tags ( names, slug ) ),
  podcast_meta!inner ( duration, episode_number, origin )
`

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; tag?: string; origin?: string }>
}

export default async function PodcastsPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { page: pageStr, tag, origin } = await searchParams
  const activeTag = tag?.trim() ?? ''
  // ?origin=: the list of one type of podcast, instead of the page with all of them
  const activeOrigin = isPodcastOrigin(origin) ? origin : null
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const [cloud, tagIds, podcastBanner] = await Promise.all([
    loadTagCloud(supabase, 'podcast', locale),
    activeTag ? contentIdsForTag(supabase, activeTag) : Promise.resolve(null),
    // the banner of our own podcast is part of the page with all the types, not of a list filtered by type or topic
    activeOrigin || activeTag ? Promise.resolve(null) : getPodcastBanner(),
  ])
  const tListings = await getTranslations('listings')
  const tNav = await getTranslations('nav')
  const tBanners = await getTranslations('banners')

  // the published podcasts of one type: the ★ picks (admin/content) first, then the newest (the star shows on their card)
  const ofType = (podcastOrigin: PodcastOrigin, from: number, to: number) => {
    let query = (supabase as any)
      .from('content')
      .select(SELECT, { count: 'exact' })
      .eq('type', 'podcast')
      .eq('status', 'published')
      .eq('is_curated', true)
      .eq('podcast_meta.origin', podcastOrigin)
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })
      .range(from, to)
    if (tagIds) query = query.in('id', tagIds)
    return query
  }

  const [{ userId, ...navProps }, ...found] = await Promise.all([
    getNavProps(),
    ...(activeOrigin ? [ofType(activeOrigin, offset, offset + PAGE_SIZE - 1)] : PODCAST_ORIGINS.map((o) => ofType(o, 0, SECTION_SIZE - 1))),
  ])
  const sections = (activeOrigin ? [activeOrigin] : [...PODCAST_ORIGINS])
    .map((o, i) => ({ origin: o, items: (found[i]?.data ?? []) as any[], count: (found[i]?.count ?? 0) as number }))
    .filter((section) => section.items.length > 0)
  const count = activeOrigin ? sections[0]?.count ?? 0 : 0

  const listed = sections.flatMap((section) => section.items)
  const contentIds = listed.map((i: any) => i.id)
  const bookmarkedIds = new Set<string>()
  if (userId && contentIds.length > 0) {
    const { data: bookmarks } = await (supabase as any)
      .from('bookmarks')
      .select('content_id')
      .eq('user_id', userId)
      .in('content_id', contentIds)
    bookmarks?.forEach((b: any) => bookmarkedIds.add(b.content_id))
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  let pendingTranslations = false
  if (listed.length > 0) {
    const untranslatedIds = listed
      .filter((i: any) => needsListingTranslation(i, locale))
      .map((i: any) => i.id)
    if (untranslatedIds.length > 0) {
      pendingTranslations = true
      after(() => triggerListingTranslations(untranslatedIds, locale))
    }
    after(() => triggerTagTranslations(locale))
  }

  const tagQuery = activeTag ? `&tag=${encodeURIComponent(activeTag)}` : ''
  const pageHref = (n: number) => `?origin=${activeOrigin}&page=${n}${tagQuery}`

  const renderCard = (item: any) => {
    const t = getTranslation(item.content_translations ?? [], locale)
    const author = item.profiles
    const firstTag = item.content_tags?.[0]?.tags
    const categoryTag = firstTag ? tagDisplayName(firstTag.names, locale, firstTag.slug) : null
    const categoryTagSlug = firstTag?.slug ?? null
    return (
      <ContentCard
        key={item.id}
        contentId={item.id}
        type="podcast"
        slug={item.slug}
        title={t?.title ?? 'Untitled'}
        excerpt={t?.excerpt}
        coverImageUrl={item.cover_image_url}
        publishedAt={item.published_at}
        likesCount={item.likes_count}
        authorName={author?.display_name}
        authorSlug={author?.slug}
        authorAvatarUrl={author?.avatar_url}
        categoryTag={categoryTag}
          categoryTagSlug={categoryTagSlug}
        episodeNumber={item.podcast_meta?.episode_number}
        duration={item.podcast_meta?.duration}
        isBookmarked={bookmarkedIds.has(item.id)}
        isLoggedIn={navProps.isLoggedIn}
        isFeatured={item.is_featured}
        singleLanguage={item.single_language}
        sourceLocale={item.source_locale}
        subtitleLocales={item.subtitle_locales}
      />
    )
  }

  return (
    <>
      <TranslationRefresher pending={pendingTranslations} />
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="mb-2">{tNav('podcasts')}</h1>
          <p className="text-[#6B5F58]">{tListings('podcastsDesc')}</p>
          <TagCloud tags={cloud} activeSlug={activeTag} basePath="/podcasts" label={tListings('tagCloudLabel')} allLabel={tListings('tagCloudAll')} />
        </div>

        {activeOrigin && (
          <Link href={activeTag ? `/podcasts?tag=${encodeURIComponent(activeTag)}` : '/podcasts'} className="mb-6 inline-block font-mono text-sm text-[#A0522D] hover:underline">
            {tListings('backToAllPodcasts')}
          </Link>
        )}

        {(activeOrigin ? [activeOrigin] : [...PODCAST_ORIGINS]).map((podcastOrigin) => {
          const section = sections.find((s) => s.origin === podcastOrigin)
          return (
            <Fragment key={podcastOrigin}>
              {section && (
                <section aria-labelledby={`podcasts-${section.origin}`} className="mb-14">
                  <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <h2 id={`podcasts-${section.origin}`}>{tListings(PODCAST_ORIGIN_KEYS[section.origin])}</h2>
                    {!activeOrigin && section.count > SECTION_SIZE && (
                      <Link href={`/podcasts?origin=${section.origin}${tagQuery}`} className="font-mono text-sm text-[#A0522D] hover:underline">
                        {tListings('viewAll', { count: section.count })}
                      </Link>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{section.items.map((item) => renderCard(item))}</div>
                </section>
              )}
              {/* the banner of our own podcast, right below the podcasts made by SurGlobal / UNTOLD.ink (Admin → Advertising) */}
              {podcastOrigin === 'own' && podcastBanner?.enabled && (
                <div className="mb-14">
                  <PodcastBanner
                    banner={podcastBanner}
                    copy={{ tagline: tBanners('podcast.tagline'), listenOn: tBanners('podcast.listenOn'), listenOnPlatform: tBanners('podcast.listenOnPlatform') }}
                  />
                </div>
              )}
            </Fragment>
          )
        })}

        {activeOrigin && totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            {page > 1 && (
              <a href={pageHref(page - 1)} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                {tListings('previous')}
              </a>
            )}
            <span className="px-4 py-2 font-mono text-sm text-[#6B5F58]">{tListings('pageOf', { page, total: totalPages })}</span>
            {page < totalPages && (
              <a href={pageHref(page + 1)} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                {tListings('next')}
              </a>
            )}
          </div>
        )}

        {sections.length === 0 && !podcastBanner?.enabled && (
          <p className="text-center py-20 text-[#6B5F58]">{tListings('noPodcasts')}</p>
        )}
      </main>
      <Footer />
    </>
  )
}
