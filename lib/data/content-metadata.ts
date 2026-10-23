import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getTranslation } from '@/lib/content'
import { contentMetadata } from '@/lib/content-metadata'

const PATH: Record<string, string> = { article: 'articles', video: 'videos', podcast: 'podcasts', pill: 'pills', course: 'courses' }

/** Title, summary and picture for the link preview of a content page, in the reader's language */
export async function loadContentMetadata({ type, slug, locale }: { type: keyof typeof PATH; slug: string; locale: string }): Promise<Metadata> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('content')
    .select(`
      cover_image_url, published_at,
      profiles!author_id ( display_name ),
      content_translations ( title, excerpt, featured_summary, description, locale ),
      video_meta ( thumbnail_url ),
      pill_meta ( image_url ),
      podcast_meta ( cover_image_url )
    `)
    .eq('slug', slug)
    .eq('type', type)
    .eq('status', 'published')
    .single()

  const t = getTranslation(data?.content_translations ?? [], locale)
  if (!t?.title) return { title: 'UNTOLD' }
  return contentMetadata({
    locale,
    path: `/${PATH[type]}/${slug}`,
    title: t.title,
    description: t.excerpt || t.featured_summary || t.description,
    image: data?.cover_image_url ?? data?.video_meta?.thumbnail_url ?? data?.pill_meta?.image_url ?? data?.podcast_meta?.cover_image_url ?? null,
    kind: type === 'article' ? 'article' : 'website',
    publishedAt: data?.published_at,
    authorName: data?.profiles?.display_name,
  })
}
