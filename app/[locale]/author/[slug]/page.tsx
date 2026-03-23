import { notFound } from 'next/navigation'
import { after } from 'next/server'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { triggerListingTranslations } from '@/lib/trigger-listing-translations'
import { formatDate } from '@/lib/format-date'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { FollowButton } from '@/components/social/FollowButton'
import { AuthorContentTabs } from '@/components/author/AuthorContentTabs'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('display_name')
    .eq('slug', slug)
    .single()

  return {
    title: profile?.display_name ? `${profile.display_name} — UNTOLD` : 'UNTOLD',
  }
}

export default async function AuthorPage({ params }: PageProps) {
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

  const tAuthor = await getTranslations({ locale, namespace: 'author' })

  const { data: author } = await (supabase as any)
    .from('profiles')
    .select('id, display_name, slug, avatar_url, bio, profile_translations, location, website, followers_count, following_count, role, created_at')
    .eq('slug', slug)
    .single()

  if (!author) notFound()

  let isFollowing = false
  if (user) {
    const { data: follow } = await (supabase as any)
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', author.id)
      .maybeSingle()
    isFollowing = !!follow
  }

  const { data: content } = await (supabase as any)
    .from('content')
    .select(`
      id, type, slug, is_featured, cover_image_url, likes_count, published_at,
      content_translations ( title, excerpt, description, locale ),
      content_tags ( tags ( slug, names ) ),
      video_meta ( thumbnail_url, duration ),
      podcast_meta ( cover_image_url, duration, episode_number ),
      pill_meta ( accent_color, image_url )
    `)
    .eq('author_id', author.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  const items = (content ?? []).map((item: any) => {
    const t = getTranslation(item.content_translations ?? [], locale)
    const tags: string[] = item.content_tags?.map((ct: any) => ct.tags?.slug).filter(Boolean) ?? []
    return {
      id: item.id,
      type: item.type,
      slug: item.slug,
      isFeatured: item.is_featured ?? false,
      coverImageUrl: item.cover_image_url ?? null,
      likesCount: item.likes_count ?? 0,
      publishedAt: item.published_at ?? null,
      title: t?.title ?? '(Untitled)',
      excerpt: t?.excerpt ?? null,
      description: t?.description ?? null,
      tags,
      thumbnailUrl: item.video_meta?.thumbnail_url ?? null,
      duration: item.video_meta?.duration ?? item.podcast_meta?.duration ?? null,
      episodeNumber: item.podcast_meta?.episode_number ?? null,
      podcastCoverUrl: item.podcast_meta?.cover_image_url ?? null,
      accentColor: item.pill_meta?.accent_color ?? null,
      pillImageUrl: item.pill_meta?.image_url ?? null,
    }
  })

  // Trigger background translation for untranslated content items on this author page
  if (locale !== 'en' && (content ?? []).length > 0) {
    const untranslatedIds = (content as any[])
      .filter(i => !(i.content_translations ?? []).some((t: any) => t.locale === locale))
      .map((i: any) => i.id)
    if (untranslatedIds.length > 0) {
      after(() => triggerListingTranslations(untranslatedIds, locale))
    }
  }

  const profileTrans = author.profile_translations as Record<string, { bio?: string }> | null
  const translatedBio = profileTrans?.[locale]?.bio ?? author.bio
  const needsAuthorBio = locale !== 'en' && !!author.bio && !profileTrans?.[locale]?.bio

  // Trigger bio translation on first visit in this language.
  // We need a content_id from one of the author's content items to use the translate route.
  // We reuse the existing translate route which handles author bio as a side effect.
  if (needsAuthorBio) {
    const { data: anyContent } = await (supabase as any)
      .from('content')
      .select('id')
      .eq('author_id', author.id)
      .eq('status', 'published')
      .limit(1)
      .maybeSingle()

    if (anyContent) {
      after(async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/translate`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-translate-secret': process.env.TRANSLATE_API_SECRET!,
            },
            body: JSON.stringify({ contentId: anyContent.id, locale }),
          })
        } catch (err) {
          console.error('[author-bio-translation-trigger] failed:', err)
        }
      })
    }
  }

  const joinedDate = formatDate(author.created_at, locale, { month: 'long', year: 'numeric' })

  return (
    <>
      <Navigation {...navProps} />

      {/* Author profile header */}
      <div
        style={{
          background: 'linear-gradient(160deg, #1e1410 0%, #2c2420 60%, #1a1008 100%)',
          borderBottom: '1px solid rgba(212,165,116,0.2)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
          {/* Mobile: centered stack. Desktop: side-by-side */}
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-6 sm:gap-10">

            {/* Avatar */}
            <div
              className="shrink-0 overflow-hidden"
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                border: '2px solid rgba(184,134,11,0.7)',
                boxShadow: '0 0 0 4px rgba(184,134,11,0.12), 0 8px 24px rgba(0,0,0,0.4)',
              }}
            >
              {author.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt={author.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#3a2f22] flex items-center justify-center">
                  <span style={{ fontFamily: 'Audiowide, sans-serif', fontSize: 32, color: '#d4a574' }}>
                    {author.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1
                className="uppercase mb-2"
                style={{
                  fontFamily: 'Audiowide, sans-serif',
                  fontSize: 'clamp(22px, 5vw, 36px)',
                  letterSpacing: '0.04em',
                  color: '#F5F1E8',
                  lineHeight: 1.2,
                }}
              >
                {author.display_name}
              </h1>

              {translatedBio && (
                <p
                  className="mb-4 max-w-2xl mx-auto sm:mx-0"
                  style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(245,241,232,0.65)' }}
                >
                  {translatedBio}
                </p>
              )}

              {/* Meta row */}
              <div
                className="flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 mb-4"
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(245,241,232,0.45)' }}
              >
                {author.location && (
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5z"/>
                      <circle cx="8" cy="6" r="1.5"/>
                    </svg>
                    {author.location}
                  </span>
                )}
                {author.website && (
                  <a
                    href={author.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="8" cy="8" r="6.5"/>
                      <path d="M8 1.5C8 1.5 6 4 6 8s2 6.5 2 6.5M8 1.5C8 1.5 10 4 10 8s-2 6.5-2 6.5M1.5 8h13"/>
                    </svg>
                    {tAuthor('website')}
                  </a>
                )}
                <span>{tAuthor('joinedDate', { date: joinedDate })}</span>
              </div>

              {/* Stats + follow */}
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4">
                <div className="flex items-center gap-4" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
                  <span style={{ color: 'rgba(245,241,232,0.55)' }}>
                    <span style={{ color: '#d4a574', fontWeight: 600 }}>{author.followers_count ?? 0}</span>
                    {' '}{tAuthor('followers')}
                  </span>
                  <span style={{ color: 'rgba(245,241,232,0.3)' }}>·</span>
                  <span style={{ color: 'rgba(245,241,232,0.55)' }}>
                    <span style={{ color: '#d4a574', fontWeight: 600 }}>{author.following_count ?? 0}</span>
                    {' '}{tAuthor('following')}
                  </span>
                </div>

                {user && user.id !== author.id && (
                  <FollowButton
                    profileId={author.id}
                    initialIsFollowing={isFollowing}
                    isLoggedIn={true}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <AuthorContentTabs
        items={items}
        authorName={author.display_name}
        authorSlug={author.slug}
        authorAvatarUrl={author.avatar_url}
        isLoggedIn={!!user}
      />

      <Footer />
    </>
  )
}
