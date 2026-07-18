import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getPlatformSettings } from '@/lib/data/platform-settings'
import { getTranslation } from '@/lib/content'
import { triggerListingTranslations } from '@/lib/trigger-listing-translations'
import { triggerTagTranslations } from '@/lib/trigger-tag-translations'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'
import { TranslationRefresher } from '@/components/TranslationRefresher'
import { Link } from '@/i18n/navigation'
import { getPublicContentPath } from '@/lib/utils'
import { getTranslations } from 'next-intl/server'
import {
  LargeArticleCard,
  VideoCard,
  PodcastCard,
  HomePillCard,
  CourseCard,
} from './_home-cards'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  const supabase = await createClient()
  const t = await getTranslations('home')
  const tListings = await getTranslations('listings')
  const platform = await getPlatformSettings()
  const featuredArticleLimit = platform.featuredContent.count
  const toSentenceCase = (s: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s
  const heroHeadline = toSentenceCase(
    platform.homeHero.title.trim() || t('heroHeadline')
  )
  const heroSubtext =
    platform.homeHero.subtitle.trim() || t('heroSubtext')
  const featuredLayoutClass =
    platform.featuredContent.layout === 'carousel'
      ? 'flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory'
      : platform.featuredContent.layout === 'list'
        ? 'flex flex-col gap-5'
        : 'space-y-5'

  const [
    { userId, ...navProps },
    { data: tagAssocs },
    { data: heroPicks },
    { data: articles },
    { data: videos },
    { data: podcasts },
    { data: pills },
    { data: courses },
  ] = await Promise.all([
    getNavProps(),
    // Tag counts for hero stats
    (supabase as any)
      .from('content_tags')
      .select('tag_id, tags(slug, names), content!inner(status)')
      .eq('content.status', 'published')
      .limit(2000),
    // Homepage hero picks (1 large + 2 small = 3 slots) — a narrower, explicitly
    // curated subset of is_featured that can be ANY content type, so it never
    // overlaps with the per-type featured sections below (see is_hero_featured
    // in admin/content).
    (supabase as any)
      .from('content')
      .select(`
        id, slug, type, cover_image_url, read_time_minutes, likes_count,
        profiles!author_id ( display_name, slug, avatar_url ),
        content_translations ( title, excerpt, locale ),
        content_tags ( tags ( names, slug ) ),
        video_meta ( thumbnail_url ),
        podcast_meta ( cover_image_url ),
        pill_meta ( image_url )
      `)
      .eq('status', 'published')
      .eq('is_hero_featured', true)
      .order('published_at', { ascending: false })
      .limit(3),
    // Featured articles for the Featured Articles section — excludes hero picks
    (supabase as any)
      .from('content')
      .select(`
        id, slug, type, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
        profiles!author_id ( display_name, slug, avatar_url ),
        content_translations ( title, excerpt, locale ),
        content_tags ( tags ( names, slug ) )
      `)
      .eq('type', 'article')
      .eq('status', 'published')
      .eq('is_featured', true)
      .eq('is_hero_featured', false)
      .order('published_at', { ascending: false })
      .limit(Math.max(1, Math.min(24, featuredArticleLimit))),
    // Videos
    (supabase as any)
      .from('content')
      .select(`
        id, slug, type, is_featured, likes_count, published_at, cover_image_url,
        profiles!author_id ( display_name, slug, avatar_url ),
        content_translations ( title, excerpt, locale ),
        content_tags ( tags ( names, slug ) ),
        video_meta ( thumbnail_url, duration )
      `)
      .eq('type', 'video')
      .eq('status', 'published')
      .eq('is_featured', true)
      .eq('is_hero_featured', false)
      .order('published_at', { ascending: false })
      .limit(3),
    // Podcasts
    (supabase as any)
      .from('content')
      .select(`
        id, slug, type, is_featured, likes_count, published_at,
        profiles!author_id ( display_name, slug, avatar_url ),
        content_translations ( title, excerpt, locale ),
        content_tags ( tags ( names, slug ) ),
        podcast_meta ( cover_image_url, duration, episode_number )
      `)
      .eq('type', 'podcast')
      .eq('status', 'published')
      .eq('is_featured', true)
      .eq('is_hero_featured', false)
      .order('published_at', { ascending: false })
      .limit(2),
    // Pills — 6 for 3×2 grid
    (supabase as any)
      .from('content')
      .select(`
        id, slug, type, is_featured, likes_count, published_at, cover_image_url,
        profiles!author_id ( display_name, slug, avatar_url ),
        content_translations ( title, excerpt, locale ),
        content_tags ( tags ( names, slug ) ),
        pill_meta ( accent_color, image_url )
      `)
      .eq('type', 'pill')
      .eq('status', 'published')
      .eq('is_featured', true)
      .eq('is_hero_featured', false)
      .order('published_at', { ascending: false })
      .limit(6),
    // Courses
    (supabase as any)
      .from('content')
      .select(`
        id, slug, type, is_featured, likes_count, published_at, cover_image_url,
        profiles!author_id ( display_name, slug, avatar_url ),
        content_translations ( title, excerpt, locale ),
        content_tags ( tags ( names, slug ) ),
        course_meta ( price, currency, duration, students_count, rating )
      `)
      .eq('type', 'course')
      .eq('status', 'published')
      .eq('is_featured', true)
      .eq('is_hero_featured', false)
      .order('published_at', { ascending: false })
      .limit(3),
  ])

  // Batch bookmark resolution
  const allItems = [
    ...(heroPicks ?? []),
    ...(articles ?? []),
    ...(videos ?? []),
    ...(podcasts ?? []),
    ...(pills ?? []),
    ...(courses ?? []),
  ]
  const contentIds = allItems.map((i: any) => i.id)
  const bookmarkedIds = new Set<string>()
  if (userId && contentIds.length > 0) {
    const { data: bookmarks } = await (supabase as any)
      .from('bookmarks')
      .select('content_id')
      .eq('user_id', userId)
      .in('content_id', contentIds)
    bookmarks?.forEach((b: any) => bookmarkedIds.add(b.content_id))
  }

  // Trigger background translation for untranslated listing items
  let pendingTranslations = false
  {
    const untranslatedIds = allItems
      .filter((i: any) => !(i.content_translations ?? []).some((t: any) => t.locale === locale))
      .map((i: any) => i.id)
    const uniqueIds = [...new Set(untranslatedIds)] as string[]
    if (uniqueIds.length > 0) {
      pendingTranslations = true
      after(() => triggerListingTranslations(uniqueIds, locale))
    }
    after(() => triggerTagTranslations(locale))
  }

  // Aggregate top 3 tags by published content count
  const tagCountMap = new Map<string, { slug: string; names: Record<string, string>; count: number }>()
  for (const row of tagAssocs ?? []) {
    if (!row.tags) continue
    const existing = tagCountMap.get(row.tag_id)
    if (existing) {
      existing.count++
    } else {
      tagCountMap.set(row.tag_id, { slug: row.tags.slug, names: row.tags.names, count: 1 })
    }
  }
  const topTags = [...tagCountMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const TAG_COLORS = ['#A9A8E9', '#D2FE73', '#000000']

  function getItemProps(item: any) {
    const trans = getTranslation(item.content_translations ?? [], locale)
    const author = item.profiles
    const firstTag = item.content_tags?.[0]?.tags
    const categoryTag = firstTag ? (firstTag.names[locale] ?? firstTag.names['en'] ?? null) : null
    const categoryTagSlug = firstTag?.slug ?? null
    const vm = item.video_meta
    const pm = item.podcast_meta
    const plm = item.pill_meta
    const cm = item.course_meta
    return {
      contentId: item.id,
      type: item.type,
      slug: item.slug,
      title: trans?.title ?? 'Untitled',
      excerpt: trans?.excerpt,
      coverImageUrl: item.cover_image_url ?? plm?.image_url,
      thumbnailUrl: vm?.thumbnail_url ?? pm?.cover_image_url,
      publishedAt: item.published_at,
      likesCount: item.likes_count,
      authorName: author?.display_name,
      authorSlug: author?.slug,
      authorAvatarUrl: author?.avatar_url,
      categoryTag,
      categoryTagSlug,
      readTimeMinutes: item.read_time_minutes,
      isBookmarked: bookmarkedIds.has(item.id),
      isLoggedIn: navProps.isLoggedIn,
      isFeatured: item.is_featured,
      duration: vm?.duration ?? pm?.duration ?? cm?.duration,
      episodeNumber: pm?.episode_number,
      accentColor: plm?.accent_color,
      rating: cm?.rating,
      price: cm?.price,
      currency: cm?.currency,
      studentsCount: cm?.students_count,
    }
  }

  // Homepage hero: 1 large card + 2 small cards, from the is_hero_featured pool.
  // Can be any content type (already mutually exclusive from the per-type
  // featured sections below, enforced by the queries).
  function getHeroCoverImage(item: any): string | null {
    return (
      item?.cover_image_url ??
      item?.video_meta?.thumbnail_url ??
      item?.podcast_meta?.cover_image_url ??
      item?.pill_meta?.image_url ??
      null
    )
  }
  const heroArticle = heroPicks?.[0] ?? null
  const heroSmallArticles = (heroPicks ?? []).slice(1, 3)

  // Featured Articles section pool (never overlaps the hero picks above)
  const featuredArticles = articles ?? []

  const heroTrans = heroArticle
    ? getTranslation(heroArticle.content_translations ?? [], locale)
    : null

  const featuredTag = heroArticle?.content_tags?.[0]?.tags
  const featuredCategoryTag = featuredTag
    ? (featuredTag.names[locale] ?? featuredTag.names['en'] ?? null)
    : null
  const featuredCategoryTagSlug = featuredTag?.slug ?? null

  // The Featured Articles section's own large card comes from its own pool's
  // first item (distinct from the hero's large card above it on the page).
  const sectionLargeArticle = featuredArticles[0] ?? null
  const sectionLargeTrans = sectionLargeArticle
    ? getTranslation(sectionLargeArticle.content_translations ?? [], locale)
    : null
  const sectionLargeTag = sectionLargeArticle?.content_tags?.[0]?.tags
  const sectionLargeCategoryTag = sectionLargeTag
    ? (sectionLargeTag.names[locale] ?? sectionLargeTag.names['en'] ?? null)
    : null
  const sectionLargeCategoryTagSlug = sectionLargeTag?.slug ?? null
  // Remaining section cards (after the section's own large card, which takes index 0)
  const sectionSmallArticles = featuredArticles.slice(1)

  return (
    <>
      <TranslationRefresher pending={pendingTranslations} />
      <Navigation
        isLoggedIn={navProps.isLoggedIn}
        userRole={navProps.userRole}
        cmsNavItems={navProps.cmsNavItems}
        showSearchInHeader={navProps.showSearchInHeader}
      />
      <main>
        {/* Hero — off-white, 2-column editorial layout */}
        <section style={{ background: '#F1F1F1', overflow: 'hidden' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-10 xl:gap-16 items-start">

              {/* LEFT: headline, subtext, CTAs, stats pills, indicators */}
              <div className="flex flex-col gap-8">
                <h1
                  style={{
                    fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                    fontWeight: 500,
                    fontSize: 'clamp(2.6rem, 4.5vw, 4.5rem)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.03em',
                    color: '#000',
                  }}
                >
                  {heroHeadline}
                </h1>

                <p
                  style={{
                    fontSize: 'clamp(15px, 1.25vw, 18px)',
                    color: '#555',
                    lineHeight: 1.65,
                    maxWidth: 500,
                    fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                  }}
                >
                  {heroSubtext}
                </p>

                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href="/articles"
                    style={{
                      background: '#A9A8E9',
                      color: '#000',
                      padding: '10px 24px',
                      borderRadius: 100,
                      fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                      fontWeight: 500,
                      fontSize: 14,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {t('ctaGetStarted')} ↗
                  </Link>
                  <Link
                    href="/courses"
                    style={{
                      border: '1.5px solid rgba(0,0,0,0.2)',
                      color: '#000',
                      padding: '10px 24px',
                      borderRadius: 100,
                      fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                      fontSize: 14,
                      textDecoration: 'none',
                    }}
                  >
                    {t('ctaBrowseCourses')}
                  </Link>
                </div>

                {/* Stats pills */}
                <div className="flex flex-wrap gap-2.5">
                  {topTags.length > 0
                    ? topTags.map(({ slug, names, count }, i) => {
                        const label = names[locale] ?? names['en'] ?? slug
                        return (
                          <Link
                            key={slug}
                            href={`/tag/${slug}`}
                            style={{
                              border: '1.5px solid rgba(0,0,0,0.15)',
                              borderRadius: 100,
                              padding: '7px 16px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              textDecoration: 'none',
                              color: '#000',
                              fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                              fontSize: 13,
                            }}
                          >
                            {label}
                            <span style={{ fontWeight: 500, color: TAG_COLORS[i], fontSize: 12 }}>{count}</span>
                          </Link>
                        )
                      })
                    : [
                        { label: 'Futures Design', slug: 'futures-design', count: 24, color: '#A9A8E9' },
                        { label: 'Innovation', slug: 'innovation', count: 18, color: '#D2FE73' },
                        { label: 'Decoloniality', slug: 'decoloniality', count: 31, color: '#000' },
                      ].map(({ label, slug, count, color }) => (
                        <Link
                          key={label}
                          href={`/tag/${slug}`}
                          style={{
                            border: '1.5px solid rgba(0,0,0,0.15)',
                            borderRadius: 100,
                            padding: '7px 16px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            textDecoration: 'none',
                            color: '#000',
                            fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                            fontSize: 13,
                          }}
                        >
                          {label}
                          <span style={{ fontWeight: 500, color, fontSize: 12 }}>{count}</span>
                        </Link>
                      ))}
                </div>

                {/* Dot indicators */}
                <div className="flex items-center gap-5">
                  {[
                    { dot: '#A9A8E9', label: t('updatedDaily') },
                    { dot: '#D2FE73', label: t('curatedContent') },
                  ].map(({ dot, label }) => (
                    <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* RIGHT: large featured card + 2 smaller cards */}
              <div className="flex flex-col gap-3">
                {/* Large featured card — can be any content type */}
                {heroArticle && heroTrans ? (
                  <Link
                    href={getPublicContentPath(heroArticle.type, heroArticle.slug)}
                    style={{
                      textDecoration: 'none',
                      display: 'block',
                      borderRadius: 20,
                      overflow: 'hidden',
                      position: 'relative',
                      height: 340,
                      background: getHeroCoverImage(heroArticle)
                        ? 'transparent'
                        : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
                    }}
                  >
                    {getHeroCoverImage(heroArticle) && (
                      <img
                        src={getHeroCoverImage(heroArticle)!}
                        alt={heroTrans.title}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)' }} />
                    <div style={{ position: 'absolute', top: 16, left: 16 }}>
                      <span style={{ background: '#A9A8E9', color: '#000', fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 100, fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>
                        ★ {t('featuredBadge')}
                      </span>
                    </div>
                    {featuredCategoryTag && (
                      <div style={{ position: 'absolute', top: 16, right: 16 }}>
                        <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 100, fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>
                          {featuredCategoryTag}
                        </span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px 22px' }}>
                      <h3
                        className="line-clamp-3"
                        style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 500, fontSize: 18, color: '#fff', lineHeight: 1.3, margin: 0 }}
                      >
                        {heroTrans.title}
                      </h3>
                    </div>
                  </Link>
                ) : (
                  <div
                    style={{
                      borderRadius: 20,
                      overflow: 'hidden',
                      position: 'relative',
                      height: 340,
                      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
                    <div style={{ position: 'absolute', top: 16, left: 16 }}>
                      <span style={{ background: '#A9A8E9', color: '#000', fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 100, fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>
                        ★ {t('featuredBadge')}
                      </span>
                    </div>
                    <div style={{ position: 'absolute', top: 16, right: 16 }}>
                      <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 100, fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>
                        Futures Design
                      </span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px 22px' }}>
                      <h3 style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 500, fontSize: 18, color: '#fff', lineHeight: 1.3, margin: 0 }}>
                        Decolonial technology: designing new futures
                      </h3>
                    </div>
                  </div>
                )}

                {/* Two smaller cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1].map((i) => {
                    const item = heroSmallArticles[i]
                    const palette = [
                      { bg: '#000', textColor: '#fff', tagColor: '#A9A8E9' },
                      { bg: '#D2FE73', textColor: '#000', tagColor: '#000' },
                    ]
                    const placeholders = [
                      { title: 'Innovation from the Global South', tag: 'Innovation' },
                      { title: 'AI and decolonial ethics', tag: 'AI Ethics' },
                    ]
                    const { bg, textColor, tagColor } = palette[i]
                    if (item) {
                      const trans = getTranslation(item.content_translations ?? [], locale)
                      const tag = item.content_tags?.[0]?.tags
                      const tagLabel = tag ? (tag.names[locale] ?? tag.names['en'] ?? null) : null
                      const coverImage = getHeroCoverImage(item)
                      const hasPhoto = !!coverImage
                      return (
                        <Link
                          key={item.id}
                          href={getPublicContentPath(item.type, item.slug)}
                          style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: 16, overflow: 'hidden', background: hasPhoto ? '#1a1a2e' : bg, position: 'relative', minHeight: 160, padding: '14px' }}
                        >
                          {hasPhoto && (
                            <>
                              <img src={coverImage!} alt={trans?.title ?? ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }} />
                            </>
                          )}
                          <div style={{ position: 'relative' }}>
                            {tagLabel && <span style={{ display: 'block', fontSize: 10, fontWeight: 500, color: hasPhoto ? '#A9A8E9' : tagColor, marginBottom: 5, fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>{tagLabel}</span>}
                            <p className="line-clamp-3" style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 500, fontSize: 13, color: hasPhoto ? '#fff' : textColor, lineHeight: 1.35, margin: 0 }}>
                              {trans?.title ?? 'Untitled'}
                            </p>
                          </div>
                        </Link>
                      )
                    }
                    return (
                      <div key={`ph-${i}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: 16, background: bg, minHeight: 160, padding: '14px' }}>
                        <span style={{ display: 'block', fontSize: 10, fontWeight: 500, color: tagColor, marginBottom: 5, fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>{placeholders[i].tag}</span>
                        <p style={{ fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 500, fontSize: 13, color: textColor, lineHeight: 1.35, margin: 0 }}>
                          {placeholders[i].title}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Content sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-20">

          {/* Featured Articles — large hero card + smaller featured cards */}
          {platform.featuredSections.articles && (
            <section>
              <SectionHeader
                title={t('featuredArticles')}
                subtitle={t('latestStories')}
                href="/articles"
                viewAllLabel={t('viewAll')}
              />

              {(sectionLargeArticle || sectionSmallArticles.length > 0) ? (
                <div className={`mt-6 ${featuredLayoutClass}`}>
                  {/* Top: large card full-width on mobile, side-by-side on md+ */}
                  <div className="flex flex-col md:flex-row gap-5 md:items-stretch">
                    {/* Large featured card — distinct from the hero's large card above */}
                    {sectionLargeArticle && sectionLargeTrans && (
                      <div className="w-full md:shrink-0 md:w-[55%]">
                        <LargeArticleCard
                            slug={sectionLargeArticle.slug}
                            title={sectionLargeTrans.title}
                            excerpt={sectionLargeTrans.excerpt}
                            coverImageUrl={sectionLargeArticle.cover_image_url}
                            authorName={sectionLargeArticle.profiles?.display_name}
                            authorSlug={sectionLargeArticle.profiles?.slug}
                            authorAvatarUrl={sectionLargeArticle.profiles?.avatar_url}
                            categoryTag={sectionLargeCategoryTag}
                            categoryTagSlug={sectionLargeCategoryTagSlug}
                            readTimeMinutes={sectionLargeArticle.read_time_minutes}
                            likesCount={sectionLargeArticle.likes_count}
                            isFeatured
                          />
                      </div>
                    )}
                    {/* Right: 2 stacked article cards — single column always */}
                    {sectionSmallArticles.length > 0 && (
                      <div className="w-full md:flex-1 flex flex-col gap-5">
                        {sectionSmallArticles.slice(0, 2).map((item: any) => (
                          <ContentCard
                            key={item.id}
                            {...getItemProps(item)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom row: 2 more cards, side-by-side only on md+ */}
                  {sectionSmallArticles.length > 2 && (
                    <div className="grid w-full min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
                      {sectionSmallArticles.slice(2, 4).map((item: any) => (
                        <ContentCard
                          key={item.id}
                          {...getItemProps(item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <SectionPlaceholder count={3} layout="articles" />
              )}
            </section>
          )}

          {/* Videos */}
          {platform.featuredSections.videos && (
            <section>
              <SectionHeader
                title={t('videos')}
                subtitle={t('videoContent')}
                href="/videos"
                viewAllLabel={t('viewAll')}
              />
              {(videos ?? []).length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  {(videos ?? []).map((item: any) => {
                    const p = getItemProps(item)
                    return (
                      <VideoCard
                        key={item.id}
                        contentId={p.contentId}
                        slug={p.slug}
                        title={p.title}
                        thumbnailUrl={p.thumbnailUrl}
                        coverImageUrl={p.coverImageUrl}
                        duration={p.duration}
                        categoryTag={p.categoryTag}
                        categoryTagSlug={p.categoryTagSlug}
                        authorName={p.authorName}
                        authorSlug={p.authorSlug}
                        authorAvatarUrl={p.authorAvatarUrl}
                        likesCount={p.likesCount}
                        isBookmarked={p.isBookmarked}
                        isLoggedIn={p.isLoggedIn}
                      />
                    )
                  })}
                </div>
              ) : (
                <SectionPlaceholder count={3} layout="videos" />
              )}
            </section>
          )}

          {/* Podcasts */}
          {platform.featuredSections.podcasts && (
            <section>
              <SectionHeader
                title={t('podcasts')}
                subtitle={t('podcastsSubtext')}
                href="/podcasts"
                viewAllLabel={t('viewAll')}
              />
              {(podcasts ?? []).length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-5 mt-6">
                  {(podcasts ?? []).map((item: any) => {
                    const p = getItemProps(item)
                    const pm = item.podcast_meta
                    return (
                      <PodcastCard
                        key={item.id}
                        slug={p.slug}
                        title={p.title}
                        excerpt={p.excerpt}
                        coverImageUrl={pm?.cover_image_url ?? p.coverImageUrl}
                        episodeNumber={p.episodeNumber}
                        duration={p.duration}
                        authorName={p.authorName}
                        authorSlug={p.authorSlug}
                        authorAvatarUrl={p.authorAvatarUrl}
                      />
                    )
                  })}
                </div>
              ) : (
                <SectionPlaceholder count={2} layout="podcasts" />
              )}
            </section>
          )}

          {/* Knowledge Pills — 3×2 */}
          {platform.featuredSections.pills && (
            <section>
              <SectionHeader
                title={t('pills')}
                subtitle={t('pillsSubtext')}
                href="/pills"
                viewAllLabel={t('viewAll')}
              />
              {(pills ?? []).length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                  {(pills ?? []).map((item: any) => {
                    const p = getItemProps(item)
                    return (
                      <HomePillCard
                        key={item.id}
                        contentId={p.contentId}
                        slug={p.slug}
                        title={p.title}
                        excerpt={p.excerpt}
                        coverImageUrl={p.coverImageUrl}
                        categoryTag={p.categoryTag}
                        categoryTagSlug={p.categoryTagSlug}
                        accentColor={p.accentColor}
                        authorName={p.authorName}
                        authorSlug={p.authorSlug}
                        authorAvatarUrl={p.authorAvatarUrl}
                        isBookmarked={p.isBookmarked}
                        isLoggedIn={p.isLoggedIn}
                      />
                    )
                  })}
                </div>
              ) : (
                <SectionPlaceholder count={6} layout="pills" />
              )}
            </section>
          )}

          {/* Courses & Training */}
          {platform.featuredSections.courses && (
            <section>
              <SectionHeader
                title={t('courses')}
                subtitle={t('coursesSubtext')}
                href="/courses"
                viewAllLabel={t('viewAll')}
              />
              {(courses ?? []).length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                  {(courses ?? []).map((item: any) => {
                    const p = getItemProps(item)
                    const cm = item.course_meta
                    return (
                      <CourseCard
                        key={item.id}
                        slug={p.slug}
                        title={p.title}
                        excerpt={p.excerpt}
                        coverImageUrl={p.coverImageUrl}
                        price={p.price}
                        currency={p.currency}
                        rating={p.rating}
                        duration={p.duration}
                        studentsCount={cm?.students_count}
                        authorName={p.authorName}
                        authorSlug={p.authorSlug}
                        authorAvatarUrl={p.authorAvatarUrl}
                      />
                    )
                  })}
                </div>
              ) : (
                <SectionPlaceholder count={3} layout="courses" />
              )}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

function SectionHeader({
  title,
  subtitle,
  href,
  viewAllLabel,
}: {
  title: string
  subtitle: string
  href: string
  viewAllLabel: string
}) {
  return (
    <div className="flex items-end justify-between pb-4" style={{ borderBottom: '2px solid #000' }}>
      <div>
        <h2 style={{ color: '#000' }}>{title}</h2>
        <p className="mt-1 text-sm" style={{ color: '#666', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}>
          {subtitle}
        </p>
      </div>
      <Link
        href={href}
        className="text-sm shrink-0 hover:underline"
        style={{ color: '#A9A8E9', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 500, cursor: 'pointer' }}
      >
        {viewAllLabel} →
      </Link>
    </div>
  )
}

type PlaceholderLayout = 'articles' | 'videos' | 'podcasts' | 'pills' | 'courses'

function SectionPlaceholder({ count = 3, layout }: { count?: number; layout: PlaceholderLayout }) {
  const gridClass =
    layout === 'podcasts'
      ? 'grid-cols-1 sm:grid-cols-2'
      : layout === 'pills'
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  const heights: Record<PlaceholderLayout, number> = {
    articles: 260,
    videos: 200,
    podcasts: 130,
    pills: 180,
    courses: 240,
  }

  return (
    <div className={`grid gap-5 mt-6 ${gridClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            borderRadius: 16,
            background: '#F5F5F5',
            border: '1px solid rgba(0,0,0,0.07)',
            height: heights[layout],
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#E8E8E8',
            }}
          />
          <span
            style={{
              fontSize: 12,
              color: '#C5C5C5',
              fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
            }}
          >
            Coming soon
          </span>
        </div>
      ))}
    </div>
  )
}
