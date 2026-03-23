import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { formatDate } from '@/lib/format-date'
import { getNavProps } from '@/lib/nav'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { EmbedPlayer } from '@/components/content/EmbedPlayer'
import { ArticleBody } from '@/components/content/ArticleBody'
import { TranscriptPanel } from '@/components/content/TranscriptPanel'
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
        video_meta ( embed_url, thumbnail_url, duration, chapters, transcript )
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
  const body = t.body as Record<string, unknown> | unknown[] | null
  const legacyDescription = !body ? (t as any).description as string | null : null

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

          {/* Description card */}
          {(body || legacyDescription) && (
            <div className="bg-card border border-primary/20 rounded-2xl p-6 mb-4">
              <h3 className="font-['Audiowide'] text-2xl uppercase text-foreground mb-4">Description</h3>
              <div className="text-[#5a4a42] text-base leading-[1.625]">
                {body ? (
                  <ArticleBody json={body} />
                ) : (
                  <p className="leading-[1.625]">{legacyDescription}</p>
                )}
              </div>
            </div>
          )}

          {/* Chapters card */}
          {chapters.length > 0 && (
            <div className="bg-card border border-primary/20 rounded-2xl p-6 mb-4">
              <h3 className="font-['Audiowide'] text-2xl uppercase text-foreground mb-4">Chapters</h3>
              <div className="flex flex-col gap-1">
                {chapters.map((ch, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 px-3 py-3 rounded-[10px] hover:bg-primary/5 transition-colors"
                  >
                    <span
                      className="font-semibold text-primary text-sm tracking-[0.28px] w-14 flex-shrink-0 mt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {ch.timestamp}
                    </span>
                    <span
                      className="text-sm text-[#5a4a42] tracking-[0.28px]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {ch.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript panel */}
          {Array.isArray(meta?.transcript) && meta.transcript.length > 0 && (
            <TranscriptPanel transcript={meta.transcript as TranscriptCue[]} />
          )}

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
