import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { readTime } from '@/lib/utils'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ArticleBody } from '@/components/content/ArticleBody'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import { ShareButton } from '@/components/social/ShareButton'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('content')
    .select('content_translations ( title, excerpt, locale )')
    .eq('slug', slug)
    .eq('type', 'article')
    .eq('status', 'published')
    .single()

  const t = getTranslation(data?.content_translations ?? [], locale)
  return {
    title: t?.title ? `${t.title} — UNTOLD` : 'UNTOLD',
    description: t?.excerpt ?? undefined,
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let navUserRole = null
  if (user) {
    const { data: navProfile } = await (supabase as any)
      .from('profiles').select('role').eq('id', user.id).single()
    navUserRole = navProfile?.role ?? null
  }
  const navProps = { isLoggedIn: !!user, userRole: navUserRole as any }

  const { data: article } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, likes_count, published_at, cover_image_url, source_locale,
      profiles!author_id ( id, display_name, slug, avatar_url, followers_count, role ),
      content_translations ( title, excerpt, body, locale ),
      content_tags ( tags ( slug, names ) )
    `)
    .eq('slug', slug)
    .eq('type', 'article')
    .eq('status', 'published')
    .single()

  if (!article) notFound()

  const t = getTranslation(article.content_translations ?? [], locale)
  if (!t) notFound()

  const author = article.profiles
  const body = t.body as Record<string, unknown> | null
  const tags = article.content_tags?.map((ct: any) => ct.tags) ?? []

  let isLiked = false
  let isBookmarked = false
  if (user) {
    const [{ data: like }, { data: bookmark }] = await Promise.all([
      (supabase as any)
        .from('likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('content_id', article.id)
        .maybeSingle(),
      (supabase as any)
        .from('bookmarks')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('content_id', article.id)
        .maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  const bodyText = body
    ? JSON.stringify(body).replace(/"[^"]*":\s*"/g, ' ').replace(/[{}\[\]",]/g, ' ')
    : ''
  const minutes = readTime(bodyText)

  const actionButtonClass = "flex items-center gap-2 px-4 h-[38px] rounded-[10px] bg-white border border-[rgba(160,82,45,0.2)] text-sm font-['JetBrains_Mono',monospace] text-[#5a4a42] transition-colors hover:bg-[rgba(160,82,45,0.04)] disabled:opacity-50 disabled:cursor-not-allowed"

  return (
    <>
      <Navigation {...navProps} />
      <main className="bg-[#f5f1e8] min-h-screen">
        <div className="max-w-[900px] mx-auto px-6 py-8">

          {/* Back */}
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-sm text-[#5a4a42] font-['JetBrains_Mono',monospace] tracking-[0.28px] mb-8 hover:text-[#a0522d] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>

          <article>
            {/* Category tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {tags.map((tag: any) => (
                  <Link
                    key={tag.slug}
                    href={`/tag/${tag.slug}`}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm text-[#a0522d] hover:bg-[rgba(160,82,45,0.15)] transition-colors"
                    style={{ background: 'rgba(160,82,45,0.1)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path d="M2 4a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 010 1.414l-4.586 4.586a1 1 0 01-1.414 0L3.293 8.293A1 1 0 013 7.586V4z"/>
                    </svg>
                    {tag.names?.en ?? tag.slug}
                  </Link>
                ))}
              </div>
            )}

            {/* Title */}
            <h1
              className="font-['Audiowide'] text-[#2c2420] uppercase mb-6"
              style={{ fontSize: 50, lineHeight: '61.6px', letterSpacing: '-0.56px', maxWidth: 752 }}
            >
              {t.title}
            </h1>

            {/* Excerpt */}
            {t.excerpt && (
              <p className="text-2xl text-[#5a4a42] leading-tight mb-8">{t.excerpt}</p>
            )}

            {/* Author + meta bar */}
            <div
              className="flex items-center justify-between py-5 mb-6"
              style={{ borderBottom: '1px solid rgba(160,82,45,0.15)' }}
            >
              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden"
                  style={{ border: '2px solid rgba(160,82,45,0.2)' }}
                >
                  {author?.avatar_url ? (
                    <img src={author.avatar_url} alt={author.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[rgba(160,82,45,0.1)] flex items-center justify-center text-[#a0522d] font-semibold">
                      {author?.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </div>
                <div>
                  <Link href={`/author/${author?.slug}`} className="block text-sm font-semibold text-[#2c2420] hover:text-[#a0522d] transition-colors">
                    {author?.display_name}
                  </Link>
                </div>
              </div>

              {/* Date + read time */}
              <div className="flex items-center gap-6 text-sm text-[#78716c]">
                {article.published_at && (
                  <div className="flex items-center gap-1.5">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    <span>{new Date(article.published_at).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span>{minutes} min read</span>
                </div>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-4 mb-10">
              <LikeButton
                contentId={article.id}
                initialIsLiked={isLiked}
                initialCount={article.likes_count ?? 0}
                isLoggedIn={!!user}
                className={actionButtonClass}
              />
              <BookmarkButton
                contentId={article.id}
                initialIsBookmarked={isBookmarked}
                isLoggedIn={!!user}
                className={actionButtonClass}
              />
              <ShareButton title={t.title} className={actionButtonClass} />
            </div>

            {/* Cover image */}
            {article.cover_image_url && (
              <div
                className="rounded-2xl overflow-hidden mb-10"
                style={{
                  height: 500,
                  boxShadow: '0px 4px 16px rgba(44,36,32,0.1), 0px 8px 32px rgba(44,36,32,0.06)',
                }}
              >
                <img
                  src={article.cover_image_url}
                  alt={t.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Body */}
            {body ? (
              <ArticleBody json={body} />
            ) : (
              <p className="text-[#6B5F58]">No content available.</p>
            )}

            {/* About the Author */}
            {author && (
              <div
                className="mt-16 bg-white rounded-2xl p-8"
                style={{
                  border: '1px solid rgba(160,82,45,0.2)',
                  boxShadow: '0px 4px 16px rgba(44,36,32,0.1), 0px 8px 32px rgba(44,36,32,0.06)',
                }}
              >
                <h3 className="font-['Audiowide'] text-2xl uppercase text-[#2c2420] mb-6">
                  About the Author
                </h3>
                <div className="flex gap-6 items-start">
                  <div
                    className="w-24 h-24 rounded-full flex-shrink-0 overflow-hidden"
                    style={{ border: '2px solid rgba(160,82,45,0.2)' }}
                  >
                    {author.avatar_url ? (
                      <img src={author.avatar_url} alt={author.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[rgba(160,82,45,0.1)] flex items-center justify-center text-[#a0522d] text-2xl font-semibold">
                        {author.display_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-['Audiowide'] text-lg uppercase text-[#2c2420] mb-1">
                      {author.display_name}
                    </h4>
                    <Link
                      href={`/author/${author.slug}`}
                      className="text-sm text-[#a0522d] hover:underline font-['JetBrains_Mono',monospace] tracking-[0.28px]"
                    >
                      View profile →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
