import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { ContentCard } from '@/components/content/ContentCard'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function TagPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()

  const tagPromise = (supabase as any)
    .from('tags')
    .select('id, slug, names')
    .eq('slug', slug)
    .single()

  const [{ userId, ...navProps }, { data: tag }] = await Promise.all([getNavProps(), tagPromise])

  if (!tag) notFound()

  const tagLabel = (tag.names as Record<string, string>)?.[locale] ?? tag.names?.en ?? tag.slug

  // Get all published content with this tag
  const { data: items } = await (supabase as any)
    .from('content_tags')
    .select(`
      content (
        id, slug, type, is_featured, likes_count, published_at, cover_image_url, status,
        profiles!author_id ( display_name, slug, role ),
        content_translations ( title, excerpt, description, locale ),
        video_meta ( duration ),
        podcast_meta ( duration, episode_number ),
        pill_meta ( accent_color ),
        course_meta ( price, currency, rating )
      )
    `)
    .eq('tag_id', tag.id)

  // Flatten and filter: published content by admin/author only (mirrors homepage_feed logic)
  const published = (items ?? [])
    .map((row: any) => row.content)
    .filter((c: any) => c && c.status === 'published' && ['admin', 'author'].includes(c.profiles?.role))
    .sort((a: any, b: any) => {
      if (a.is_featured && !b.is_featured) return -1
      if (!a.is_featured && b.is_featured) return 1
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    })

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12">
          <h1 className="mb-2">#{tagLabel}</h1>
          <p className="text-[#6B5F58] font-mono">{published.length} pieces of content</p>
        </div>

        {published.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {published.map((item: any) => {
              const t = getTranslation(item.content_translations ?? [], locale)
              const author = item.profiles
              return (
                <ContentCard
                  key={item.id}
                  contentId={item.id}
                  type={item.type}
                  slug={item.slug}
                  title={t?.title ?? 'Untitled'}
                  excerpt={t?.excerpt}
                  description={t?.description}
                  coverImageUrl={item.cover_image_url}
                  publishedAt={item.published_at}
                  likesCount={item.likes_count}
                  authorName={author?.display_name}
                  authorSlug={author?.slug}
                  duration={item.video_meta?.duration ?? item.podcast_meta?.duration}
                  episodeNumber={item.podcast_meta?.episode_number}
                  accentColor={item.pill_meta?.accent_color}
                  rating={item.course_meta?.rating}
                  price={item.course_meta?.price}
                  currency={item.course_meta?.currency}
                />
              )
            })}
          </div>
        ) : (
          <p className="text-center py-20 text-[#6B5F58]">No content for this tag yet.</p>
        )}
      </main>
      <Footer />
    </>
  )
}
