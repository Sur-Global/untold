import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'
import type { ContentType } from '@/lib/supabase/types'

const CONTENT_TYPES: ContentType[] = ['article', 'video', 'podcast', 'pill', 'course']

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; type?: string }>
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { q = '', type: typeFilter } = await searchParams
  const [{ userId, ...navProps }, supabase] = await Promise.all([getNavProps(), createClient()])

  let results: any[] = []

  if (q.trim()) {
    // Use Postgres full-text search via the search_vector column
    let query = (supabase as any)
      .from('content_translations')
      .select(`
        content_id, locale, title, excerpt, description,
        content!inner (
          id, slug, type, is_featured, likes_count, published_at, cover_image_url,
          profiles!author_id ( display_name, slug, role ),
          video_meta ( duration ),
          podcast_meta ( duration, episode_number ),
          pill_meta ( accent_color ),
          course_meta ( price, currency, rating )
        )
      `)
      .textSearch('search_vector', q.trim().split(/\s+/).join(' & '), { type: 'websearch' })
      .eq('locale', locale !== 'en' ? locale : 'en')
      .eq('content.status', 'published')
      .limit(20)

    if (typeFilter && CONTENT_TYPES.includes(typeFilter as ContentType)) {
      query = query.eq('content.type', typeFilter)
    }

    const { data } = await query

    // Deduplicate by content_id and sort by role priority, then recency
    const seen = new Set<string>()
    results = (data ?? [])
      .filter((row: any) => {
        if (seen.has(row.content_id)) return false
        seen.add(row.content_id)
        return row.content != null
      })
      .sort((a: any, b: any) => {
        // Role priority: admin → author → user (spec requirement)
        // True ts_rank ordering within each group requires a Postgres RPC; use recency as tiebreaker
        const rolePriority: Record<string, number> = { admin: 0, author: 1, user: 2 }
        const ra = rolePriority[a.content?.profiles?.role ?? 'user'] ?? 2
        const rb = rolePriority[b.content?.profiles?.role ?? 'user'] ?? 2
        if (ra !== rb) return ra - rb
        // Tiebreaker: most recently published first (proxy for ts_rank within same role group)
        return new Date(b.content?.published_at ?? 0).getTime() - new Date(a.content?.published_at ?? 0).getTime()
      })
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        {/* Search header */}
        <div className="mb-8">
          <h1 className="mb-6">Search</h1>
          <form method="GET" className="flex gap-3 max-w-2xl">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search articles, videos, podcasts..."
              className="flex-1 px-4 py-2 rounded-lg font-mono text-sm"
              style={{ background: '#FAF7F2', border: '1px solid rgba(139,69,19,0.2)', color: '#2C2420' }}
            />
            <button
              type="submit"
              className="px-6 py-2 rounded-lg font-mono text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #8B4513, #A0522D)' }}
            >
              Search
            </button>
          </form>
        </div>

        {/* Type filter tabs */}
        {q && (
          <div className="flex flex-wrap gap-2 mb-8">
            {[null, ...CONTENT_TYPES].map((t) => {
              const label = t ? t.charAt(0).toUpperCase() + t.slice(1) + 's' : 'All'
              const isActive = t === (typeFilter || null)
              return (
                <a
                  key={t ?? 'all'}
                  href={`?q=${encodeURIComponent(q)}${t ? `&type=${t}` : ''}`}
                  className="px-3 py-1 rounded font-mono text-xs uppercase tracking-wider transition-colors"
                  style={{
                    background: isActive ? '#A0522D' : 'rgba(160,82,45,0.08)',
                    color: isActive ? '#fff' : '#A0522D',
                  }}
                >
                  {label}
                </a>
              )
            })}
          </div>
        )}

        {/* Results count */}
        {q && (
          <p className="text-sm text-[#6B5F58] font-mono mb-6">
            {results.length > 0
              ? `${results.length} results for "${q}"`
              : `No results for "${q}"`}
          </p>
        )}

        {results.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((row: any) => {
              const item = row.content
              const t = getTranslation(
                [{ locale: row.locale, title: row.title, excerpt: row.excerpt ?? null, description: row.description ?? null, body: null }],
                locale
              )
              const author = item?.profiles
              return (
                <ContentCard
                  key={row.content_id}
                  contentId={item.id}
                  type={item.type}
                  slug={item.slug}
                  title={t?.title ?? 'Untitled'}
                  excerpt={t?.excerpt}
                  description={t?.description}
                  coverImageUrl={item.cover_image_url}
                  publishedAt={item.published_at}
                  likesCount={item.likes_count}
                  authorName={author?.display_name}
                  authorSlug={author?.slug}
                  duration={item.video_meta?.duration ?? item.podcast_meta?.duration}
                  episodeNumber={item.podcast_meta?.episode_number}
                  accentColor={item.pill_meta?.accent_color}
                  rating={item.course_meta?.rating}
                  price={item.course_meta?.price}
                  currency={item.course_meta?.currency}
                  isLoggedIn={navProps.isLoggedIn}
                />
              )
            })}
          </div>
        )}

        {!q && (
          <p className="text-center py-20 text-[#6B5F58]">Enter a search term above.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
