import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { EditVideoForm } from './EditVideoForm'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditVideoPage({ params }: PageProps) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()

  const contentPromise = (supabase as any)
    .from('content')
    .select(`
      id, status, cover_image_url, feature_requested_at,
      content_translations ( title, body, description, locale ),
      video_meta ( embed_url, thumbnail_url, duration, chapters, layout_style, transcript ),
      content_tags ( tag_id, tags ( id, slug, names ) )
    `)
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'video')
    .single()

  const [{ userId, ...navProps }, { data: content }] = await Promise.all([
    getNavProps(),
    contentPromise,
  ])

  if (!content) notFound()

  const tr = content.content_translations?.find((r: any) => r.locale === 'en') ?? content.content_translations?.[0]
  const meta = Array.isArray(content.video_meta) ? content.video_meta[0] : content.video_meta ?? {}

  const initialTags = (content.content_tags ?? [])
    .map((ct: any) => ct.tags)
    .filter(Boolean)
    .map((t: any) => ({ id: t.id, slug: t.slug, name: t.names?.en ?? t.slug }))

  return (
    <>
      <Navigation {...navProps} />
      <main>
        <EditVideoForm
          id={id}
          status={content.status}
          initialTitle={tr?.title ?? ''}
          initialBody={
            Array.isArray(tr?.body) ? tr.body
            : tr?.description ? [{
                id: 'legacy',
                type: 'paragraph' as const,
                props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
                content: [{ type: 'text' as const, text: tr.description, styles: {} }],
                children: [],
              }]
            : null
          }
          initialEmbedUrl={meta?.embed_url ?? ''}
          initialThumbnailUrl={meta?.thumbnail_url ?? content.cover_image_url ?? ''}
          initialDuration={meta?.duration ?? ''}
          initialChapters={meta?.chapters ?? []}
          initialLayoutStyle={meta?.layout_style ?? 'standard'}
          initialTranscript={Array.isArray(meta?.transcript) ? meta.transcript : null}
          initialTags={initialTags}
          initialFeatureRequested={!!content.feature_requested_at}
        />
      </main>
      <Footer />
    </>
  )
}
