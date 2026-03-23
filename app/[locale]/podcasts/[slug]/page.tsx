import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { EmbedPlayer } from '@/components/content/EmbedPlayer'
import { BodyTranslationLoader } from '@/components/content/BodyTranslationLoader'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function PodcastPage({ params }: PageProps) {
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

  const { data: podcast } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, likes_count, published_at,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, description, locale ),
      podcast_meta ( embed_url, cover_image_url, duration, episode_number )
    `)
    .eq('slug', slug)
    .eq('type', 'podcast')
    .eq('status', 'published')
    .single()

  if (!podcast) notFound()

  const t = getTranslation(podcast.content_translations ?? [], locale)
  if (!t) notFound()

  const meta = podcast.podcast_meta
  const author = podcast.profiles

  const enTranslation = (podcast.content_translations ?? []).find((tr: any) => tr.locale === 'en')
  const englishDescription = enTranslation?.description as string | null
  const needsDescription = locale !== 'en' && !!englishDescription && !t.description

  if (needsDescription) {
    after(async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
          },
          body: JSON.stringify({ contentId: podcast.id, locale }),
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
        .from('likes').select('user_id')
        .eq('user_id', user.id).eq('content_id', podcast.id).maybeSingle(),
      (supabase as any)
        .from('bookmarks').select('user_id')
        .eq('user_id', user.id).eq('content_id', podcast.id).maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Cover + meta */}
        <div className="flex gap-6 mb-8">
          {meta?.cover_image_url && (
            <img
              src={meta.cover_image_url}
              alt={t.title}
              className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1">
            {meta?.episode_number && (
              <p className="text-sm font-mono text-[#A0522D] mb-1">{meta.episode_number}</p>
            )}
            <h1 className="text-2xl mb-2">{t.title}</h1>
            <div className="flex items-center gap-3 text-sm font-mono text-[#6B5F58]">
              {meta?.duration && <span>⏱ {meta.duration}</span>}
              {author && (
                <Link href={`/author/${author.slug}`} className="hover:text-[#A0522D]">
                  {author.display_name}
                </Link>
              )}
              <div className="ml-auto flex items-center gap-3">
                <LikeButton
                  contentId={podcast.id}
                  initialIsLiked={isLiked}
                  initialCount={podcast.likes_count ?? 0}
                  isLoggedIn={!!user}
                />
                <BookmarkButton
                  contentId={podcast.id}
                  initialIsBookmarked={isBookmarked}
                  isLoggedIn={!!user}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Embed */}
        {meta?.embed_url && (
          <div className="mb-8">
            <EmbedPlayer url={meta.embed_url} title={t.title} />
          </div>
        )}

        <BodyTranslationLoader
          contentId={podcast.id}
          locale={locale}
          isTranslating={needsDescription}
          field="description"
          fallback={englishDescription}
          initialContent={t.description ?? null}
        >
          {(content) => <p className="text-[#6B5F58] leading-relaxed">{content as string}</p>}
        </BodyTranslationLoader>
      </main>
      <Footer />
    </>
  )
}
