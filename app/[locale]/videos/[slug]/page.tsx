import { notFound } from 'next/navigation'
import { after } from 'next/server'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { formatDate } from '@/lib/format-date'
import { getNavProps } from '@/lib/nav'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { EmbedPlayer } from '@/components/content/EmbedPlayer'
import { VideoTranslationLoader } from '@/components/content/VideoTranslationLoader'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import { ShareButton } from '@/components/social/ShareButton'
import type { TranscriptCue } from '@/lib/transcript'
import Link from 'next/link'

interface VideoChapter {
  timestamp: string
  title: string
}

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('content')
    .select('content_translations ( title, locale )')
    .eq('slug', slug)
    .eq('type', 'video')
    .eq('status', 'published')
    .single()

  const t = getTranslation(data?.content_translations ?? [], locale)
  return {
    title: t?.title ? `${t.title} — UNTOLD` : 'UNTOLD',
  }
}

export default async function VideoPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()

  const [{ userId, ...navProps }, { data: video }] = await Promise.all([
    getNavProps(),
    (supabase as any)
      .from('content')
      .select(`
        id, slug, likes_count, published_at,
        profiles!author_id ( id, display_name, slug, avatar_url, bio, location ),
        content_translations ( title, body, description, locale ),
        content_tags ( tags ( slug, names ) ),
        video_meta ( embed_url, thumbnail_url, duration, chapters, chapter_translations, transcript, transcript_translations )
      `)
      .eq('slug', slug)
      .eq('type', 'video')
      .eq('status', 'published')
      .single(),
  ])

  if (!video) notFound()

  const t = getTranslation(video.content_translations ?? [], locale)
  if (!t) notFound()

  const meta = Array.isArray(video.video_meta) ? video.video_meta[0] : video.video_meta ?? {}

  const author = video.profiles
  const tags = (video.content_tags ?? []).map((ct: any) => ct.tags).filter(Boolean)
  const chapters: VideoChapter[] = Array.isArray(meta?.chapters) ? meta.chapters : []
  const chapterTranslations = meta?.chapter_translations as Record<string, VideoChapter[]> | null
  // English body for fallback display while body is being translated
  const enTranslation = (video.content_translations ?? []).find((tr: any) => tr.locale === 'en')
  const englishBody = enTranslation?.body as Record<string, unknown> | unknown[] | null

  // getTranslation falls back to English when no locale row exists — detect that case
  const usingFallback = t.locale !== locale
  const body = usingFallback ? null : (t.body as Record<string, unknown> | unknown[] | null)
  const legacyDescription = !body ? (t as any).description as string | null : null

  // Per-section translation flags
  const needsBody = locale !== 'en' && !!englishBody && (usingFallback || !body)
  const needsChapters = locale !== 'en' && chapters.length > 0 && !chapterTranslations?.[locale]
  const needsTranscript =
    locale !== 'en' &&
    Array.isArray(meta?.transcript) &&
    (meta.transcript as unknown[]).length > 0 &&
    !meta?.transcript_translations?.[locale]

  // Trigger translation on first visit when any content is missing.
  // The translate route handles body, chapters, and transcript in one call — idempotent and safe.
  // NOTE: Multiple concurrent visitors may each fire an after() call before the DB is written.
  // Worst case: a few redundant DeepL calls. Acceptable trade-off for a content site.
  if (needsBody || needsChapters || needsTranscript) {
    after(async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
          },
          body: JSON.stringify({ contentId: video.id, locale }),
        })
      } catch (err) {
        console.error('[translation-trigger] failed:', err)
      }
    })
  }

  let isLiked = false
  let isBookmarked = false
  if (userId) {
    const [{ data: like }, { data: bookmark }] = await Promise.all([
      (supabase as any).from('likes').select('user_id').eq('user_id', userId).eq('content_id', video.id).maybeSingle(),
      (supabase as any).from('bookmarks').select('user_id').eq('user_id', userId).eq('content_id', video.id).maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  const actionButtonClass = [
    'flex items-center gap-2 px-4 h-[38px] rounded-[10px]',
    'bg-card border border-primary/20',
    "text-sm font-['JetBrains_Mono',monospace] text-muted-foreground",
    'transition-colors hover:bg-primary/5',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ')

  const transcriptTranslations = meta?.transcript_translations as Record<string, TranscriptCue[]> | null
  const translatedTranscript = transcriptTranslations?.[locale] ?? null
  const englishTranscript: TranscriptCue[] = Array.isArray(meta?.transcript) ? meta.transcript : []

  return (
    <>
      <Navigation {...navProps} />
      <main className="bg-background min-h-screen">
        <div className="max-w-[900px] mx-auto px-6 py-8">

          {/* Back */}
          <Link
            href="/videos"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-['JetBrains_Mono',monospace] tracking-[0.28px] mb-8 hover:text-primary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </Link>

          {/* Tag badges */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
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
            className="font-['Audiowide'] text-foreground uppercase mb-6"
            style={{ fontSize: 50, lineHeight: '61.6px', letterSpacing: '-0.56px', maxWidth: 752 }}
          >
            {t.title}
          </h1>

          {/* Author + meta row */}
          <div className="flex items-center gap-6 mb-8 flex-wrap">
            {author && (
              <Link href={`/author/${author.slug}`} className="flex items-center gap-3 group">
                <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden border-2 border-primary/20">
                  {author.avatar_url ? (
                    <img src={author.avatar_url} alt={author.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                      {author.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {author.display_name}
                  </p>
                  {author.location && (
                    <p className="text-xs text-muted-foreground">{author.location}</p>
                  )}
                </div>
              </Link>
            )}

            <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              {video.published_at && (
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span>{formatDate(video.published_at, locale, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
              {meta?.duration && (
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  <span>{meta.duration}</span>
                </div>
              )}
            </div>
          </div>

          {/* Video embed */}
          {meta?.embed_url && (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)]">
              <EmbedPlayer url={meta.embed_url} title={t.title} />
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-3 mb-6">
            <LikeButton
              contentId={video.id}
              initialIsLiked={isLiked}
              initialCount={video.likes_count ?? 0}
              isLoggedIn={!!userId}
              className={actionButtonClass}
            />
            <BookmarkButton
              contentId={video.id}
              initialIsBookmarked={isBookmarked}
              isLoggedIn={!!userId}
              className={actionButtonClass}
            />
            <ShareButton title={t.title} className={actionButtonClass} />
          </div>

          {/* Description, chapters, and transcript — with lazy translation + loading states */}
          <VideoTranslationLoader
            body={body}
            englishBody={englishBody}
            legacyDescription={legacyDescription}
            chapters={chapters}
            translatedChapters={chapterTranslations?.[locale] ?? null}
            transcript={englishTranscript}
            translatedTranscript={translatedTranscript}
            needsBody={needsBody}
            needsChapters={needsChapters}
            needsTranscript={needsTranscript}
            contentId={video.id}
            locale={locale}
          />

          {/* About the Creator */}
          {author && (
            <div className="bg-card rounded-2xl p-8 border border-primary/20 shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)]">
              <h3 className="font-['Audiowide'] text-2xl uppercase text-foreground mb-6">
                About the Creator
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
                    <p className="text-sm text-primary mb-3">{author.location}</p>
                  )}
                  {author.bio && (
                    <p className="text-base text-[#5a4a42] leading-[1.625] mb-4">{author.bio}</p>
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

        </div>
      </main>
      <Footer />
    </>
  )
}
