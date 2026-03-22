import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { readTime } from '@/lib/utils'
import { formatDate } from '@/lib/format-date'
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
      id, slug, likes_count, published_at, cover_image_url, image_credits, source_locale,
      profiles!author_id ( id, display_name, slug, avatar_url, bio, location, followers_count, role ),
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
  const tContent = await getTranslations({ locale, namespace: 'content' })

  // Reusable action button style using design tokens
  const actionButtonClass = [
    'flex items-center gap-2 px-4 h-[38px] rounded-[10px]',
    'bg-card border border-primary/20',
    "text-sm font-['JetBrains_Mono',monospace] text-muted-foreground",
    'transition-colors hover:bg-primary/5',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ')

  return (
    <>
      <Navigation {...navProps} />
      <main className="bg-background min-h-screen">
        <div className="max-w-[900px] mx-auto px-6 py-8">

          {/* Back */}
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground font-['JetBrains_Mono',monospace] tracking-[0.28px] mb-8 hover:text-primary transition-colors"
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
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm text-primary bg-primary/10 hover:bg-primary/15 transition-colors"
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
              className="font-['Audiowide'] text-foreground uppercase mb-6"
              style={{ fontSize: 50, lineHeight: '61.6px', letterSpacing: '-0.56px', maxWidth: 752 }}
            >
              {t.title}
            </h1>

            {/* Excerpt */}
            {t.excerpt && (
              <p className="text-2xl text-muted-foreground leading-tight mb-8">{t.excerpt}</p>
            )}

            {/* Author + meta bar */}
            <div className="flex items-center justify-between py-5 mb-6 border-b border-border">
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden border-2 border-primary/20">
                  {author?.avatar_url ? (
                    <img src={author.avatar_url} alt={author.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {author?.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </div>
                <Link href={`/author/${author?.slug}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                  {author?.display_name}
                </Link>
              </div>

              {/* Date + read time */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {article.published_at && (
                  <div className="flex items-center gap-1.5">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    <span>{formatDate(article.published_at, locale, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span>{tContent('readTime', { minutes })}</span>
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
              <figure className={article.image_credits ? 'mb-10' : 'mb-10'}>
                <div className="rounded-2xl overflow-hidden shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)]" style={{ height: 500 }}>
                  <img
                    src={article.cover_image_url}
                    alt={t.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {article.image_credits && (
                  <figcaption
                    className="mt-3 px-4 py-4 rounded-[10px] text-sm leading-[1.43]"
                    style={{ background: 'rgba(120,113,108,0.1)' }}
                  >
                    <strong style={{ color: '#78716c', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>Credits: </strong>
                    <span style={{ color: '#78716c', fontFamily: 'Inter, sans-serif' }}>{article.image_credits}</span>
                  </figcaption>
                )}
              </figure>
            )}

            {/* Body */}
            {body ? (
              <ArticleBody json={body} />
            ) : (
              <p className="text-muted-foreground">No content available.</p>
            )}

            {/* About the Author */}
            {author && (
              <div className="mt-16 bg-card rounded-2xl p-8 border border-primary/20 shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)]">
                <h3 className="font-['Audiowide'] text-2xl uppercase text-foreground mb-6">
                  About the Author
                </h3>
                <div className="flex gap-6 items-start">
                  <div className="w-24 h-24 rounded-full flex-shrink-0 overflow-hidden border-2 border-primary/20">
                    {author.avatar_url ? (
                      <img src={author.avatar_url} alt={author.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-semibold">
                        {author.display_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-['Audiowide'] text-lg uppercase text-foreground mb-1">
                      {author.display_name}
                    </h4>
                    {author.location && (
                      <p className="text-xs text-muted-foreground font-['JetBrains_Mono',monospace] mb-2">{author.location}</p>
                    )}
                    {author.bio && (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{author.bio}</p>
                    )}
                    <Link
                      href={`/author/${author.slug}`}
                      className="text-sm text-primary hover:underline font-['JetBrains_Mono',monospace] tracking-[0.28px]"
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
