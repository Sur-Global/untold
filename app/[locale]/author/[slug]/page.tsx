import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { FollowButton } from '@/components/social/FollowButton'
import Link from 'next/link'

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
    .select('id, display_name, slug, avatar_url, bio, followers_count, following_count, role')
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
      id, type, slug, created_at,
      content_translations ( title, locale )
    `)
    .eq('author_id', author.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Author header */}
        <div
          className="flex items-start gap-6 mb-10 pb-10"
          style={{ borderBottom: '1px solid rgba(139,69,19,0.12)' }}
        >
          {author.avatar_url && (
            <img
              src={author.avatar_url}
              alt={author.display_name}
              className="w-20 h-20 rounded-full object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-mono font-bold mb-1">{author.display_name}</h1>
            <div className="flex gap-4 text-sm font-mono text-[#6B5F58] mb-3">
              <span>{author.followers_count ?? 0} followers</span>
              <span>{author.following_count ?? 0} following</span>
            </div>
            {author.bio && (
              <p className="text-[#6B5F58] leading-relaxed mb-4">{author.bio}</p>
            )}
            {user && user.id !== author.id && (
              <FollowButton
                profileId={author.id}
                initialIsFollowing={isFollowing}
                isLoggedIn={true}
              />
            )}
          </div>
        </div>

        {/* Published content */}
        <h2 className="text-lg font-mono font-semibold mb-6">Published Content</h2>
        {(!content || content.length === 0) ? (
          <p className="text-[#6B5F58]">No published content yet.</p>
        ) : (
          <ul className="space-y-3">
            {content.map((item: any) => {
              const tr = getTranslation(item.content_translations ?? [], locale)
              return (
                <li
                  key={item.id}
                  className="p-4 rounded-lg"
                  style={{ border: '1px solid rgba(139,69,19,0.12)', background: 'rgba(245,241,232,0.5)' }}
                >
                  <Link
                    href={`/${item.type}s/${item.slug}`}
                    className="font-semibold hover:text-[#A0522D] transition-colors"
                  >
                    {tr?.title ?? '(Untitled)'}
                  </Link>
                  <p className="text-xs font-mono text-[#6B5F58] mt-1 capitalize">{item.type}</p>
                </li>
              )
            })}
          </ul>
        )}
      </main>
      <Footer />
    </>
  )
}
