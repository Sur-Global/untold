import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { EmbedPlayer } from '@/components/content/EmbedPlayer'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function PodcastPage({ params }: PageProps) {
  const { locale, slug } = await params
  const supabase = await createClient()
  const navProps = await getNavProps()

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
          <div>
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
            </div>
          </div>
        </div>

        {/* Embed */}
        {meta?.embed_url && (
          <div className="mb-8">
            <EmbedPlayer url={meta.embed_url} title={t.title} />
          </div>
        )}

        {t.description && (
          <p className="text-[#6B5F58] leading-relaxed">{t.description}</p>
        )}
      </main>
      <Footer />
    </>
  )
}
