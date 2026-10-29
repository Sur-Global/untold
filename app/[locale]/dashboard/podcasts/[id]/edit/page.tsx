import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { isEditorRole } from '@/lib/require-editor'
import { isPodcastOrigin } from '@/lib/podcast-origin'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditPodcastForm } from './EditPodcastForm'
import { TranslationsPanel } from '@/components/translations/TranslationsPanel'
import { loadTranslationEditor } from '@/lib/data/translation-editor'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditPodcastPage({ params }: PageProps) {
  const { id } = await params
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const contentQuery = (supabase as any)
    .from('content')
    .select(`
      id, slug, author_id, status, source_locale, single_language, subtitle_locales, declaration_accepted_at, cover_image_url, feature_requested_at,
      content_translations ( title, description, locale ),
      podcast_meta ( embed_url, cover_image_url, duration, episode_number, origin )
    `)
    .eq('id', id)
    .eq('type', 'podcast')
  if (!isEditorRole(profile.role)) contentQuery.eq('author_id', user.id)
  const contentPromise = contentQuery.single()

  const [{ userId, ...navProps }, t, { data: content }] = await Promise.all([
    getNavProps(),
    getTranslations('editor'),
    contentPromise,
  ])

  if (!content) notFound()

  // The translations of this content, to correct by hand
  const translationEditor = await loadTranslationEditor(supabase, id)

  const sourceLocale = content.source_locale ?? 'en'
  const tr = content.content_translations?.find((r: any) => r.locale === sourceLocale) ?? content.content_translations?.[0]
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
              background: content.status === 'published' ? '#dcfce7' : '#ffedd5',
              color: content.status === 'published' ? '#14532d' : '#7c2d12',
            }}
          >
            {content.status}
          </span>
        </div>

        <EditPodcastForm
          id={id}
          status={content.status}
          initialAuthorId={content.author_id}
        slug={content.slug}
          initialSingleLanguage={content.single_language ?? false}
        initialDeclared={!!content.declaration_accepted_at}
          initialFeatureRequested={!!content.feature_requested_at}
          canChooseOrigin={isEditorRole(profile.role)}
          initialOrigin={isPodcastOrigin(meta?.origin) ? meta.origin : null}
          initialTitle={tr?.title ?? ''}
          initialDescription={tr?.description ?? ''}
          initialEmbedUrl={meta?.embed_url ?? ''}
          initialCoverImageUrl={meta?.cover_image_url ?? ''}
          initialDuration={meta?.duration ?? ''}
          initialEpisodeNumber={meta?.episode_number ?? ''}
        />
        {translationEditor && <TranslationsPanel data={translationEditor} />}
      </main>
      <Footer withNewsletter={false} />
    </>
  )
}
