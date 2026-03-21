import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'

export default async function HomePage() {
  const supabase = await createClient()
  const t = await getTranslations('home')

  // Get current user + role for Navigation
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = null
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
    userRole = (profile?.role ?? null) as typeof userRole
  }

  // Fetch curated content from homepage_feed (admin + author published content)
  // Filter content_translations client-side — PostgREST doesn't support
  // filtering on embedded/joined tables via top-level .eq()
  const { data: articles } = await supabase
    .from('homepage_feed')
    .select(`
      id, slug, type, is_featured, likes_count, published_at,
      cover_image_url,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, excerpt, locale )
    `)
    .eq('type', 'article')
    .limit(6)

  return (
    <>
      <Navigation isLoggedIn={!!user} userRole={userRole} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        {/* Hero */}
        <div className="mb-20 text-center">
          <h1 className="mb-4">{t('title')}</h1>
          <p className="text-xl" style={{ color: '#6B5F58' }}>{t('subtitle')}</p>
        </div>

        {/* Featured Articles */}
        <section>
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="mb-2">{t('featuredArticles')}</h2>
              <p style={{ color: '#6B5F58' }}>{t('latestStories')}</p>
            </div>
          </div>

          {articles && articles.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(articles as any[]).map((article) => {
                // Filter translations client-side for current locale (default 'en')
                const translations = article.content_translations as Array<{ title: string; excerpt: string | null; locale: string }> | null
                const translation = translations?.find(tr => tr.locale === 'en') ?? translations?.[0]
                return (
                  <article key={article.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(139,69,19,0.15)', boxShadow: '0 2px 8px rgba(44,36,32,0.08)' }}>
                    {article.cover_image_url && (
                      <img src={article.cover_image_url} alt="" className="w-full aspect-video object-cover" />
                    )}
                    <div className="p-6">
                      <h3 className="text-base mb-2" style={{ fontFamily: 'Audiowide, sans-serif', textTransform: 'uppercase' }}>
                        <a href={`/articles/${article.slug}`} className="hover:text-[#A0522D] transition-colors">
                          {translation?.title ?? 'Untitled'}
                        </a>
                      </h3>
                      <p className="text-sm line-clamp-2" style={{ color: '#6B5F58' }}>
                        {translation?.excerpt}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="text-center py-20" style={{ color: '#6B5F58' }}>No articles yet.</p>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
