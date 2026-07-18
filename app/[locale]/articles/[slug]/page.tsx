import { notFound } from 'next/navigation'
import { after } from 'next/server'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { readTime } from '@/lib/utils'
import { renderCreditHtml } from '@/lib/photo-credit'
import { sanitizeBioHtml } from '@/lib/sanitize-bio-html'
import { formatDate } from '@/lib/format-date'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ArticleBody } from '@/components/content/ArticleBody'
import { BodyTranslationLoader } from '@/components/content/BodyTranslationLoader'
import { AuthorBioLoader } from '@/components/content/AuthorBioLoader'
import { PageTranslationPlaceholder } from '@/components/content/PageTranslationPlaceholder'
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
  let navUserRole: string | null = null
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
      profiles!author_id ( id, display_name, slug, avatar_url, bio, profile_translations, location, followers_count, role ),
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
  const tags = article.content_tags?.map((ct: any) => ct.tags) ?? []

  const sourceLocale: string = article.source_locale ?? 'en'
  const sourceTranslation = (article.content_translations ?? []).find((tr: any) => tr.locale === sourceLocale)
  const sourceBody = sourceTranslation?.body as Record<string, unknown> | null

  // getTranslation falls back to source locale when no locale row exists — detect that case
  const usingFallback = t.locale !== locale
  const body = usingFallback ? null : (t.body as Record<string, unknown> | null)
  const needsBody = locale !== sourceLocale && !!sourceBody && (usingFallback || !body)

  // Author bio translation
  const profileTrans = author?.profile_translations as Record<string, any> | null
  const translatedBio = profileTrans?.[locale]?.bio ?? null
  const needsAuthorBio = locale !== sourceLocale && !!author?.bio && !translatedBio

  // Source-language bio fields extracted from Ghost (stored by import script)
  const sourceBioHtml = profileTrans?._source_bio_html ?? null
  const sourceBioHeading = profileTrans?._source_bio_heading ?? null
  const sourceBioCTAUrl = profileTrans?._source_bio_cta_url ?? null
  const sourceBioCTALabel = profileTrans?._source_bio_cta_label ?? null

  if (needsBody || needsAuthorBio) {
    after(async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
          },
          body: JSON.stringify({ contentId: article.id, locale }),
        })
      } catch (err) {
        console.error('[translation-trigger] failed:', err)
      }
    })
  }

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
  const [tContent, tAuthor] = await Promise.all([
    getTranslations({ locale, namespace: 'content' }),
    getTranslations({ locale, namespace: 'author' }),
  ])

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
            {usingFallback ? (
              /* First visit in this language — hide all content, show translating placeholder */
              <PageTranslationPlaceholder
                contentId={article.id}
                locale={locale}
                coverImageUrl={article.cover_image_url}
              />
            ) : (
              <>
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
                        {tag.names?.[locale] ?? tag.names?.en ?? tag.slug}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Title */}
                <h1
                  className="font-heading text-foreground mb-6"
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
                        <img src={author.avatar_url} alt={author.display_name} className="w-full h-full object-cover object-top" />
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

                  {/* Date + read time — compact on mobile, icons on desktop */}
                  <div className="text-sm text-muted-foreground">
                    {/* Mobile: single line, no icons */}
                    <div className="flex sm:hidden items-center gap-1.5 whitespace-nowrap">
                      {article.published_at && (
                        <span>{formatDate(article.published_at, locale, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      )}
                      {article.published_at && <span style={{ opacity: 0.4 }}>·</span>}
                      <span>{tContent('readTime', { minutes })}</span>
                    </div>
                    {/* Desktop: icons */}
                    <div className="hidden sm:flex items-center gap-6">
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
                  {user && (navUserRole === 'admin' || user.id === author?.id) && (
                    <Link
                      href={`/dashboard/articles/${article.id}/edit`}
                      className={actionButtonClass}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                        <path d="M9.5 1.5a1.414 1.414 0 012 2L4 11l-3 1 1-3 7.5-7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Edit
                    </Link>
                  )}
                </div>

                {/* Cover image */}
                {article.cover_image_url && (
                  <figure className="mb-10">
                    <div className="rounded-2xl overflow-hidden shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)]">
                      <img
                        src={article.cover_image_url}
                        alt={t.title}
                        className="w-full h-auto block"
                      />
                    </div>
                    {article.image_credits && (
                      <figcaption
                        className="mt-3 px-4 py-4 rounded-[10px] text-sm leading-[1.43]"
                        style={{ background: 'rgba(120,113,108,0.1)' }}
                      >
                        <strong style={{ color: '#78716c', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', fontWeight: 700 }}>Credits: </strong>
                        <span
                          style={{ color: '#78716c', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
                          dangerouslySetInnerHTML={{ __html: renderCreditHtml(article.image_credits) }}
                        />
                      </figcaption>
                    )}
                  </figure>
                )}

                {/* Body */}
                <BodyTranslationLoader
                  contentId={article.id}
                  locale={locale}
                  isTranslating={needsBody}
                  field="body"
                  fallback={sourceBody}
                  initialContent={body}
                />

                {/* About the Author */}
                {author && (
                  <div
                    className="mt-16 rounded-2xl"
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,0.08)',
                      padding: '32px',
                      boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Author name — full-width card header */}
                    <Link href={`/author/${author.slug}`} className="hover:text-primary transition-colors inline-block mb-6">
                      <h3
                        style={{
                          fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                          fontWeight: 700,
                          fontSize: 22,
                          color: '#111',
                          letterSpacing: '-0.01em',
                          lineHeight: 1.1,
                        }}
                      >
                        {author.display_name}
                      </h3>
                      {author.location && (
                        <p style={{ fontSize: 13, color: '#6b7280', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif', marginTop: 4 }}>
                          {author.location}
                        </p>
                      )}
                    </Link>

                    {/* Avatar (left) + bio (right) */}
                    <div className="flex items-start gap-6">
                      {/* Large circular avatar */}
                      <div
                        className="flex-shrink-0 overflow-hidden rounded-full"
                        style={{ width: 160, height: 160, border: '2px solid #A9A8E9' }}
                      >
                        {author.avatar_url ? (
                          <img src={author.avatar_url} alt={author.display_name} className="w-full h-full object-cover object-top" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ background: 'rgba(169,168,233,0.1)', fontSize: 52, fontWeight: 500, color: '#A9A8E9', fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }}
                          >
                            {author.display_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                      </div>

                      {/* Bio text area */}
                      <div className="flex-1 min-w-0">
                        {/* "About [Name]" subheading */}
                        <p
                          style={{
                            fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                            fontSize: 15,
                            fontWeight: 500,
                            color: '#111',
                            marginBottom: 10,
                          }}
                        >
                          {sourceBioHeading || `About ${author.display_name?.split(' ')[0] ?? author.display_name}`}
                        </p>

                        {/* Bio — HTML with links for source locale, translated text otherwise */}
                        {(author.bio || sourceBioHtml) && (
                          <div className="mb-5">
                            {sourceBioHtml && !translatedBio ? (
                              <div
                                className="text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:hover:opacity-70 [&_a]:transition-opacity"
                                style={{ color: '#4b5563' }}
                                dangerouslySetInnerHTML={{ __html: sanitizeBioHtml(sourceBioHtml) }}
                              />
                            ) : (
                              <AuthorBioLoader
                                initialBio={translatedBio ?? (needsAuthorBio ? null : author.bio)}
                                needsTranslation={needsAuthorBio}
                                contentId={article.id}
                                authorId={author.id}
                                locale={locale}
                              />
                            )}
                          </div>
                        )}

                        {/* CTA button */}
                        {sourceBioCTAUrl && sourceBioCTALabel && (
                          <a
                            href={sourceBioCTAUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                              fontSize: 13,
                              fontWeight: 500,
                              color: '#111',
                              textDecoration: 'none',
                              border: '1px solid rgba(0,0,0,0.15)',
                              borderRadius: 8,
                              padding: '7px 14px',
                              marginBottom: 12,
                            }}
                            className="hover:bg-black hover:text-white transition-colors"
                          >
                            {sourceBioCTALabel} ↗
                          </a>
                        )}

                        {/* View profile link */}
                        <div>
                          <Link
                            href={`/author/${author.slug}`}
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                            style={{
                              fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
                              fontSize: 13,
                              fontWeight: 500,
                              color: '#111',
                              letterSpacing: '0.02em',
                              textDecoration: 'none',
                            }}
                          >
                            {tAuthor('viewProfile')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
