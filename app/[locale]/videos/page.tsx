import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'

const PAGE_SIZE = 12

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function VideosPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  const query = (supabase as any)
    .from('content')
    .select(`
      id, slug, type, is_featured, likes_count, published_at, cover_image_url, read_time_minutes,
      profiles!author_id ( display_name, slug, role, avatar_url ),
      content_translations ( title, excerpt, locale ),
      content_tags ( tags ( names ) ),
      video_meta ( thumbnail_url, duration )
    `, { count: 'exact' })
    .eq('type', 'video')
    .eq('status', 'published')
    .in('profiles.role', ['admin', 'author'])
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const [{ userId, ...navProps }, { data: items, count }] = await Promise.all([
    getNavProps(),
    query,
  ])

  const contentIds = (items ?? []).map((i: any) => i.id)
  const bookmarkedIds = new Set<string>()
  if (userId && contentIds.length > 0) {
    const { data: bookmarks } = await (supabase as any)
      .from('bookmarks')
      .select('content_id')
      .eq('user_id', userId)
      .in('content_id', contentIds)
    bookmarks?.forEach((b: any) => bookmarkedIds.add(b.content_id))
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="mb-2">Videos</h1>
          <p className="text-[#6B5F58]">Watch videos from journalists and creators across the Global South.</p>
        </div>

        {items && items.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item: any) => {
                const t = getTranslation(item.content_translations ?? [], locale)
                const author = item.profiles
                const firstTag = item.content_tags?.[0]?.tags
                const categoryTag = firstTag ? (firstTag.names[locale] ?? firstTag.names['en'] ?? null) : null
                return (
                  <ContentCard
                    key={item.id}
                    contentId={item.id}
                    type="video"
                    slug={item.slug}
                    title={t?.title ?? 'Untitled'}
                    excerpt={t?.excerpt}
                    coverImageUrl={item.cover_image_url ?? item.video_meta?.thumbnail_url}
                    publishedAt={item.published_at}
                    likesCount={item.likes_count}
                    authorName={author?.display_name}
                    authorSlug={author?.slug}
                    authorAvatarUrl={author?.avatar_url}
                    categoryTag={categoryTag}
                    duration={item.video_meta?.duration}
                    isBookmarked={bookmarkedIds.has(item.id)}
                    isLoggedIn={navProps.isLoggedIn}
                    isFeatured={item.is_featured}
                  />
                )
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {page > 1 && (
                  <a href={`?page=${page - 1}`} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                    ← Previous
                  </a>
                )}
                <span className="px-4 py-2 font-mono text-sm text-[#6B5F58]">Page {page} of {totalPages}</span>
                {page < totalPages && (
                  <a href={`?page=${page + 1}`} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                    Next →
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-center py-20 text-[#6B5F58]">No videos yet.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
