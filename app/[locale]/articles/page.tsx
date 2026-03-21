import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'

const PAGE_SIZE = 20

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function ArticlesPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const navProps = await getNavProps()

  const { data: articles, count } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, type, is_featured, likes_count, published_at, cover_image_url,
      profiles!author_id ( display_name, slug, role ),
      content_translations ( title, excerpt, locale )
    `, { count: 'exact' })
    .eq('type', 'article')
    .eq('status', 'published')
    .in('profiles.role', ['admin', 'author'])
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="mb-2">Articles</h1>
          <p className="text-[#6B5F58]">In-depth writing from the Global South</p>
        </div>

        {articles && articles.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article: any) => {
                const t = getTranslation(article.content_translations ?? [], locale)
                const author = article.profiles
                return (
                  <ContentCard
                    key={article.id}
                    type="article"
                    slug={article.slug}
                    title={t?.title ?? 'Untitled'}
                    excerpt={t?.excerpt}
                    coverImageUrl={article.cover_image_url}
                    publishedAt={article.published_at}
                    likesCount={article.likes_count}
                    authorName={author?.display_name}
                    authorSlug={author?.slug}
                  />
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                {page > 1 && (
                  <a href={`?page=${page - 1}`} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                    ← Previous
                  </a>
                )}
                <span className="px-4 py-2 font-mono text-sm text-[#6B5F58]">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <a href={`?page=${page + 1}`} className="px-4 py-2 rounded font-mono text-sm border" style={{ borderColor: 'rgba(139,69,19,0.2)' }}>
                    Next →
                  </a>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-center py-20 text-[#6B5F58]">No articles yet.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
