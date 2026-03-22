import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditPodcastForm } from './EditPodcastForm'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditPodcastPage({ params }: PageProps) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()

  const contentPromise = (supabase as any)
    .from('content')
    .select(`
      id, status, cover_image_url,
      content_translations ( title, description, locale ),
      podcast_meta ( embed_url, cover_image_url, duration, episode_number )
    `)
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'podcast')
    .single()

  const [{ userId, ...navProps }, t, { data: content }] = await Promise.all([
    getNavProps(),
    getTranslations('editor'),
    contentPromise,
  ])

  if (!content) notFound()

  const tr = content.content_translations?.find((r: any) => r.locale === 'en') ?? content.content_translations?.[0]
  const meta = Array.isArray(content.podcast_meta) ? content.podcast_meta[0] : content.podcast_meta ?? {}

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="text-sm text-[#A0522D] hover:underline font-mono">
            {t('backToDashboard')}
          </Link>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{
              background: content.status === 'published' ? 'rgba(34,197,94,0.1)' : 'rgba(160,82,45,0.1)',
              color: content.status === 'published' ? '#16a34a' : '#A0522D',
            }}
          >
            {content.status}
          </span>
        </div>

        <EditPodcastForm
          id={id}
          status={content.status}
          initialTitle={tr?.title ?? ''}
          initialDescription={tr?.description ?? ''}
          initialEmbedUrl={meta?.embed_url ?? ''}
          initialCoverImageUrl={meta?.cover_image_url ?? ''}
          initialDuration={meta?.duration ?? ''}
          initialEpisodeNumber={meta?.episode_number ?? ''}
        />
      </main>
      <Footer />
    </>
  )
}
