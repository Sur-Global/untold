import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'
import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

const SECTION_SIZE = 4

function buildContentQuery(supabase: any, type: string) {
  return supabase
    .from('content')
    .select(`
      id, slug, type, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, excerpt, locale ),
      content_tags ( tags ( names ) )
    `)
    .eq('type', type)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(SECTION_SIZE)
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  const supabase = await createClient()
  const t = await getTranslations('home')

  const [
    { userId, ...navProps },
    { data: featuredArticle },
    { data: articles },
    { data: videos },
    { data: podcasts },
    { data: pills },
    { data: courses },
  ] = await Promise.all([
    getNavProps(),
    // Featured article for hero
    (supabase as any)
      .from('content')
      .select(`
        id, slug, cover_image_url,
        profiles!author_id ( display_name, slug ),
        content_translations ( title, locale ),
        content_tags ( tags ( names ) )
      `)
      .eq('type', 'article')
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    buildContentQuery(supabase, 'article'),
    buildContentQuery(supabase, 'video'),
    buildContentQuery(supabase, 'podcast'),
    buildContentQuery(supabase, 'pill'),
    buildContentQuery(supabase, 'course'),
  ])

  // Batch bookmark resolution
  const allItems = [...(articles ?? []), ...(videos ?? []), ...(podcasts ?? []), ...(pills ?? []), ...(courses ?? [])]
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

  function renderCards(items: any[]) {
    return items.map((item: any) => {
      const trans = getTranslation(item.content_translations ?? [], locale)
      const author = item.profiles
      const firstTag = item.content_tags?.[0]?.tags
      const categoryTag = firstTag ? (firstTag.names[locale] ?? firstTag.names['en'] ?? null) : null
      return (
        <ContentCard
          key={item.id}
          contentId={item.id}
          type={item.type}
          slug={item.slug}
          title={trans?.title ?? 'Untitled'}
          excerpt={trans?.excerpt}
          coverImageUrl={item.cover_image_url}
          publishedAt={item.published_at}
          likesCount={item.likes_count}
          authorName={author?.display_name}
          authorSlug={author?.slug}
          authorAvatarUrl={author?.avatar_url}
          categoryTag={categoryTag}
          readTimeMinutes={item.read_time_minutes}
          isBookmarked={bookmarkedIds.has(item.id)}
          isLoggedIn={navProps.isLoggedIn}
          isFeatured={item.is_featured}
        />
      )
    })
  }

  const articlesWithoutFeatured = (articles ?? []).filter(
    (a: any) => !featuredArticle || a.id !== featuredArticle.id
  )

  type Section = { label: string; href: string; items: any[] }
  const sections: Section[] = [
    { label: t('featuredArticles'), href: '/articles', items: articlesWithoutFeatured },
    { label: t('videos'), href: '/videos', items: videos ?? [] },
    { label: t('podcasts'), href: '/podcasts', items: podcasts ?? [] },
    { label: t('pills'), href: '/pills', items: pills ?? [] },
    { label: t('courses'), href: '/courses', items: courses ?? [] },
  ].filter(s => s.items.length > 0)

  const heroTrans = featuredArticle
    ? getTranslation(featuredArticle.content_translations ?? [], locale)
    : null
  const heroAuthor = featuredArticle?.profiles

  return (
    <>
      <Navigation {...navProps} />
      <main>
        {/* Hero */}
        <section
          className="py-20 px-4 sm:px-6"
          style={{ background: '#2c2420' }}
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
            {/* Left column */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-mono mb-4 uppercase tracking-widest"
                style={{ color: 'rgba(245,241,232,0.6)' }}
              >
                {t('subtitle')}
              </p>
              <h1
                className="mb-4 text-4xl sm:text-5xl leading-tight"
                style={{ fontFamily: 'Audiowide, sans-serif', color: '#F5F1E8' }}
              >
                {t('title')}
              </h1>
              <p
                className="text-lg mb-8"
                style={{ color: 'rgba(245,241,232,0.75)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {t('heroTagline')}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/articles"
                  style={{
                    background: 'linear-gradient(160deg,#8b4513,#a0522d)',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  {t('ctaRead')}
                </Link>
                <Link
                  href="/articles"
                  style={{
                    border: '1px solid rgba(245,241,232,0.3)',
                    color: '#F5F1E8',
                    padding: '12px 24px',
                    borderRadius: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14,
                    textDecoration: 'none',
                  }}
                >
                  {t('ctaExplore')}
                </Link>
              </div>
            </div>

            {/* Right column: featured article card */}
            {featuredArticle && heroTrans && (
              <Link
                href={`/articles/${featuredArticle.slug}`}
                className="shrink-0 rounded-xl overflow-hidden"
                style={{
                  width: 320,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(245,241,232,0.12)',
                  textDecoration: 'none',
                  display: 'block',
                }}
              >
                {featuredArticle.cover_image_url && (
                  <img
                    src={featuredArticle.cover_image_url}
                    alt={heroTrans.title}
                    className="w-full aspect-video object-cover"
                  />
                )}
                <div className="p-4">
                  <p
                    className="text-xs font-mono mb-1"
                    style={{ color: 'rgba(245,241,232,0.5)' }}
                  >
                    ★ Featured
                  </p>
                  <h3
                    className="text-sm leading-snug mb-2"
                    style={{ fontFamily: 'Audiowide, sans-serif', color: '#F5F1E8' }}
                  >
                    {heroTrans.title}
                  </h3>
                  {heroAuthor && (
                    <p className="text-xs font-mono" style={{ color: 'rgba(245,241,232,0.5)' }}>
                      {heroAuthor.display_name}
                    </p>
                  )}
                </div>
              </Link>
            )}
          </div>
        </section>

        {/* Content sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-16">
          {sections.map(({ label, href, items }) => (
            <section key={href}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl" style={{ fontFamily: 'Audiowide, sans-serif' }}>{label}</h2>
                <Link
                  href={href}
                  className="text-sm font-mono text-[#A0522D] hover:underline"
                >
                  {t('viewAll')} →
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {renderCards(items)}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
