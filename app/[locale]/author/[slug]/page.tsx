import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
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

  const { data: author } = await (supabase as any)
    .from('profiles')
    .select('id, display_name, slug, avatar_url, bio, location, website, followers_count, following_count, role, created_at')
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

  const joinedDate = formatDate(author.created_at, locale, { month: 'long', year: 'numeric' })

  return (
    <>
      <Navigation {...navProps} />

      {/* Author profile header */}
      <div className="bg-[#fdfcfa]" style={{ borderBottom: '0.9px solid #d4a574' }}>
        <div className="max-w-[1280px] mx-auto px-6 py-16">
          <div className="flex items-start gap-8">
            {/* Avatar */}
            <div
              className="shrink-0 overflow-hidden"
              style={{
                width: 128,
                height: 128,
                borderRadius: 16,
                border: '2.7px solid #b8860b',
                boxShadow: '0 4px 12px rgba(139,69,19,0.15)',
              }}
            >
              {author.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt={author.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#e8d5b5] flex items-center justify-center">
                  <span className="text-4xl font-bold text-[#a0522d]">
                    {author.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-[40px] leading-[44px] tracking-[0.8px] text-[#5d4e37] uppercase mb-3"
              >
                {author.display_name}
              </h1>
              {author.bio && (
                <p className="text-[18px] leading-[1.6] text-[#6b5744] mb-4 max-w-3xl">
                  {author.bio}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-6 text-[14px] text-[#8b7355] mb-4">
                {author.location && (
                  <span className="flex items-center gap-1.5">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <path d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5z" />
                      <circle cx="8" cy="6" r="1.5" />
                    </svg>
                    {author.location}
                  </span>
                )}
                {author.website && (
                  <a
                    href={author.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                      <circle cx="8" cy="8" r="6.5" />
                      <path d="M8 1.5C8 1.5 6 4 6 8s2 6.5 2 6.5M8 1.5C8 1.5 10 4 10 8s-2 6.5-2 6.5M1.5 8h13" />
                    </svg>
                    Website
                  </a>
                )}
                <span className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <rect x="1.5" y="2.5" width="13" height="12" rx="2" />
                    <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" />
                  </svg>
                  Joined {joinedDate}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[14px] text-[#8b7355] mb-4">
                <span>
                  <strong className="text-[#5d4e37]">{author.followers_count ?? 0}</strong> followers
                </span>
                <span>
                  <strong className="text-[#5d4e37]">{author.following_count ?? 0}</strong> following
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
