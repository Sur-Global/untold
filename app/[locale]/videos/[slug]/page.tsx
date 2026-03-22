import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { formatDate } from '@/lib/format-date'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { EmbedPlayer } from '@/components/content/EmbedPlayer'
import { LikeButton } from '@/components/social/LikeButton'
import { BookmarkButton } from '@/components/social/BookmarkButton'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function VideoPage({ params }: PageProps) {
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

  const { data: video } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, likes_count, published_at,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, description, locale ),
      video_meta ( embed_url, thumbnail_url, duration )
    `)
    .eq('slug', slug)
    .eq('type', 'video')
    .eq('status', 'published')
    .single()

  if (!video) notFound()

  const t = getTranslation(video.content_translations ?? [], locale)
  if (!t) notFound()

  const meta = video.video_meta
  const author = video.profiles
  const tContent = await getTranslations({ locale, namespace: 'content' })

  let isLiked = false
  let isBookmarked = false
  if (user) {
    const [{ data: like }, { data: bookmark }] = await Promise.all([
      (supabase as any)
        .from('likes').select('user_id')
        .eq('user_id', user.id).eq('content_id', video.id).maybeSingle(),
      (supabase as any)
        .from('bookmarks').select('user_id')
        .eq('user_id', user.id).eq('content_id', video.id).maybeSingle(),
    ])
    isLiked = !!like
    isBookmarked = !!bookmark
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Embed */}
        {meta?.embed_url && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <EmbedPlayer url={meta.embed_url} title={t.title} />
          </div>
        )}

        <h1 className="mb-4">{t.title}</h1>

        {/* Meta bar */}
        <div className="flex items-center gap-4 mb-6 text-sm font-mono text-[#6B5F58]">
          {meta?.duration && <span>⏱ {meta.duration}</span>}
          {video.published_at && (
            <span>{formatDate(video.published_at, locale, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
          {author && (
            <Link href={`/author/${author.slug}`} className="hover:text-[#A0522D]">
              {tContent('by')} {author.display_name}
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3">
            <LikeButton
              contentId={video.id}
              initialIsLiked={isLiked}
              initialCount={video.likes_count ?? 0}
              isLoggedIn={!!user}
            />
            <BookmarkButton
              contentId={video.id}
              initialIsBookmarked={isBookmarked}
              isLoggedIn={!!user}
            />
          </div>
        </div>

        {t.description && (
          <p className="text-[#6B5F58] leading-relaxed">{t.description}</p>
        )}
      </main>
      <Footer />
    </>
  )
}
