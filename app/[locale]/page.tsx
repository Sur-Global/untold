import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'
import { Link } from '@/i18n/navigation'
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

  const [
    { userId, ...navProps },
    { data: tagAssocs },
    { data: featuredArticle },
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
    // Featured article for hero + large card
    (supabase as any)
      .from('content')
      .select(`
        id, slug, cover_image_url, read_time_minutes, likes_count,
        profiles!author_id ( display_name, slug, avatar_url ),
        content_translations ( title, excerpt, locale ),
        content_tags ( tags ( names, slug ) )
      `)
      .eq('type', 'article')
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Featured articles only (for the Featured Articles section)
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
      .order('published_at', { ascending: false })
      .limit(5),
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
      .order('published_at', { ascending: false })
      .limit(3),
  ])

  // Batch bookmark resolution
  const allItems = [
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

  const TAG_COLORS = ['#6B8E23', '#A0522D', '#5D4E37']
  const TAG_BORDERS = ['rgba(107,142,35,0.3)', 'rgba(160,82,45,0.3)', 'rgba(93,78,55,0.3)']

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

  // Featured articles excluding the hero one (for smaller cards)
  const featuredArticles = (articles ?? []).filter(
    (a: any) => !featuredArticle || a.id !== featuredArticle.id
  )

  const heroTrans = featuredArticle
    ? getTranslation(featuredArticle.content_translations ?? [], locale)
    : null

  const featuredTag = featuredArticle?.content_tags?.[0]?.tags
  const featuredCategoryTag = featuredTag
    ? (featuredTag.names[locale] ?? featuredTag.names['en'] ?? null)
    : null
  const featuredCategoryTagSlug = featuredTag?.slug ?? null

  return (
    <>
      <Navigation {...navProps} />
      <main>
        {/* Hero — cream background, two-column */}
        <section className="px-4 sm:px-6 py-16 lg:py-20" style={{ background: '#F5F1E8' }}>
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-12 lg:gap-16">

            {/* Left column */}
            <div className="flex-1 min-w-0">
              <h1
                className="mb-6 leading-[1.1]"
                style={{ fontSize: 'clamp(32px,5vw,50px)', color: '#2C2420' }}
              >
                {t('heroHeadline')}
              </h1>

              <p
                className="mb-8 leading-relaxed"
                style={{ color: '#5D4E37', fontFamily: 'Inter, sans-serif', fontSize: 18, maxWidth: 480 }}
              >
                {t('heroSubtext')}
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link
                  href="/auth/login"
                  style={{
                    background: 'linear-gradient(160deg,#8b4513,#a0522d)',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {t('ctaGetStarted')} →
                </Link>
                <Link
                  href="/courses"
                  style={{
                    border: '1.5px solid rgba(139,69,19,0.45)',
                    color: '#8B4513',
                    padding: '12px 24px',
                    borderRadius: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14,
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  {t('ctaBrowseCourses')}
                </Link>
              </div>

              {/* Stats — label on top, count + "resources" below */}
              {topTags.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-8">
                  {topTags.map(({ slug, names, count }, i) => {
                    const label = names[locale] ?? names['en'] ?? slug
                    return (
                      <Link
                        key={slug}
                        href={`/articles?tag=${slug}`}
                        className="px-4 py-3 rounded-xl"
                        style={{
                          background: '#fff',
                          border: `1px solid ${TAG_BORDERS[i]}`,
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <p className="text-xs mb-1" style={{ color: '#8B7355', fontFamily: 'Inter, sans-serif' }}>
                          {label}
                        </p>
                        <p
                          className="font-semibold leading-none"
                          style={{ color: TAG_COLORS[i], fontFamily: 'JetBrains Mono, monospace', fontSize: 14 }}
                        >
                          {t('tagResources', { count })}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Indicators */}
              <div
                className="flex items-center gap-5 pt-4"
                style={{ borderTop: '1px solid rgba(139,69,19,0.15)' }}
              >
                {[
                  { dot: '#6B8E23', label: t('updatedDaily') },
                  { dot: '#A0522D', label: t('curatedContent') },
                ].map(({ dot, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-2 text-xs"
                    style={{ color: '#8B7355', fontFamily: 'Inter, sans-serif' }}
                  >
                    <span className="rounded-full shrink-0" style={{ width: 6, height: 6, background: dot }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right column: featured article card + 2 small tag cards */}
            {featuredArticle && heroTrans && (
              <div className="shrink-0 flex flex-col gap-4 w-full lg:w-[360px]">
                {/* Big featured card */}
                <Link
                  href={`/articles/${featuredArticle.slug}`}
                  className="block relative rounded-2xl overflow-hidden"
                  style={{
                    height: 300,
                    background: '#2C2420',
                    border: '1px solid rgba(212,165,116,0.3)',
                    textDecoration: 'none',
                    boxShadow: '0 8px 32px rgba(44,36,32,0.14)',
                    cursor: 'pointer',
                  }}
                >
                  {featuredArticle.cover_image_url && (
                    <img
                      src={featuredArticle.cover_image_url}
                      alt={heroTrans.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to top, rgba(44,36,32,0.9) 0%, rgba(44,36,32,0.3) 55%, transparent 100%)',
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <span
                      className="text-xs px-3 py-1 rounded-full font-semibold"
                      style={{
                        background: 'rgba(245,197,24,0.92)',
                        color: '#2C2420',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 11,
                      }}
                    >
                      ★ {t('featuredBadge')}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3
                      className="text-white leading-snug line-clamp-2"
                      style={{ fontFamily: 'Audiowide, sans-serif', fontSize: 16, textTransform: 'uppercase' }}
                    >
                      {heroTrans.title}
                    </h3>
                  </div>
                </Link>

                {/* Two small tag cards */}
                <div className="grid grid-cols-2 gap-3">
                  {topTags.slice(0, 2).map(({ slug, names }, i) => (
                    <Link
                      key={slug}
                      href={`/articles?tag=${slug}`}
                      className="rounded-xl flex items-end p-3"
                      style={{ height: 88, background: TAG_COLORS[i], textDecoration: 'none', cursor: 'pointer' }}
                    >
                      <span
                        className="text-white uppercase"
                        style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.05em', opacity: 0.92 }}
                      >
                        {names[locale] ?? names['en'] ?? slug}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Content sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-20">

          {/* Featured Articles — large hero card + smaller featured cards */}
          {(featuredArticle || featuredArticles.length > 0) && (
            <section>
              <SectionHeader
                title={t('featuredArticles')}
                subtitle={t('latestStories')}
                href="/articles"
                viewAllLabel={t('viewAll')}
              />

              <div className="mt-6 space-y-5">
                {/* Top: large card left + 2 stacked right */}
                <div className="flex gap-5 items-stretch">
                  {/* Large featured card */}
                  {featuredArticle && heroTrans && (
                    <div className="shrink-0" style={{ width: '55%' }}>
                      <LargeArticleCard
                        slug={featuredArticle.slug}
                        title={heroTrans.title}
                        excerpt={heroTrans.excerpt}
                        coverImageUrl={featuredArticle.cover_image_url}
                        authorName={featuredArticle.profiles?.display_name}
                        authorSlug={featuredArticle.profiles?.slug}
                        authorAvatarUrl={featuredArticle.profiles?.avatar_url}
                        categoryTag={featuredCategoryTag}
                        categoryTagSlug={featuredCategoryTagSlug}
                        readTimeMinutes={featuredArticle.read_time_minutes}
                        likesCount={featuredArticle.likes_count}
                        isFeatured

                      />
                    </div>
                  )}
                  {/* Right: 2 stacked article cards */}
                  {featuredArticles.length > 0 && (
                    <div className="flex-1 flex flex-col gap-5">
                      {featuredArticles.slice(0, 2).map((item: any) => (
                        <ContentCard
                          key={item.id}
                          {...getItemProps(item)}
  
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom row: 2 more cards */}
                {featuredArticles.length > 2 && (
                  <div className="grid sm:grid-cols-2 gap-5">
                    {featuredArticles.slice(2, 4).map((item: any) => (
                      <ContentCard
                        key={item.id}
                        {...getItemProps(item)}

                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Videos */}
          {(videos ?? []).length > 0 && (
            <section>
              <SectionHeader
                title={t('videos')}
                subtitle={t('videoContent')}
                href="/videos"
                viewAllLabel={t('viewAll')}
              />
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
            </section>
          )}

          {/* Podcasts */}
          {(podcasts ?? []).length > 0 && (
            <section>
              <SectionHeader
                title={t('podcasts')}
                subtitle={t('podcastsSubtext')}
                href="/podcasts"
                viewAllLabel={t('viewAll')}
              />
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
            </section>
          )}

          {/* Knowledge Pills — 3×2 */}
          {(pills ?? []).length > 0 && (
            <section>
              <SectionHeader
                title={t('pills')}
                subtitle={t('pillsSubtext')}
                href="/pills"
                viewAllLabel={t('viewAll')}
              />
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
            </section>
          )}

          {/* Courses */}
          {(courses ?? []).length > 0 && (
            <section>
              <div className="text-center mb-8">
                <h2 style={{ color: '#2C2420' }}>{t('courses')}</h2>
                <p className="mt-2 text-sm" style={{ color: '#8B7355', fontFamily: 'Inter, sans-serif' }}>
                  {t('coursesSubtext')}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
              <div className="text-center mt-8">
                <Link
                  href="/courses"
                  style={{
                    display: 'inline-block',
                    border: '1.5px solid #A0522D',
                    color: '#A0522D',
                    padding: '10px 28px',
                    borderRadius: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {t('viewAll')} →
                </Link>
              </div>
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
    <div className="flex items-end justify-between">
      <div>
        <h2 style={{ color: '#2C2420' }}>{title}</h2>
        <p className="mt-1 text-sm" style={{ color: '#8B7355', fontFamily: 'Inter, sans-serif' }}>
          {subtitle}
        </p>
      </div>
      <Link
        href={href}
        className="text-sm shrink-0 hover:underline"
        style={{ color: '#A0522D', fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer' }}
      >
        {viewAllLabel} →
      </Link>
    </div>
  )
}
