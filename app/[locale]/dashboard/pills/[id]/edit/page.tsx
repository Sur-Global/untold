import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { parseSlides } from '@/lib/pill-slides'
import { requireCreator } from '@/lib/require-creator'
import { isEditorRole } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditPillForm } from './EditPillForm'
import { tagDisplayName } from '@/lib/tag-name'
import { TranslationsPanel } from '@/components/translations/TranslationsPanel'
import { loadTranslationEditor } from '@/lib/data/translation-editor'

interface EditPillPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditPillPage({ params }: EditPillPageProps) {
  const { id, locale } = await params
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const contentQuery = (supabase as any)
    .from('content')
    .select(`
      id, slug, author_id, status, source_locale, single_language, subtitle_locales, feature_requested_at, declaration_accepted_at,
      content_translations ( title, body, excerpt, locale ),
      pill_meta ( accent_color, image_url, format, slides ),
      content_tags ( tags ( id, slug, names ) )
    `)
    .eq('id', id)
    .eq('type', 'pill')
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
  const initialBody = Array.isArray(tr?.body) ? tr.body : null
  const meta = Array.isArray(content.pill_meta) ? content.pill_meta[0] : content.pill_meta ?? {}

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/dashboard" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToDashboard')}
        </Link>
        <h1 className="mb-8">{tr?.title ?? '(Untitled)'}</h1>
        <EditPillForm
          id={id}
          status={content.status}
          initialAuthorId={content.author_id}
        slug={content.slug}
          initialSingleLanguage={content.single_language ?? false}
        initialDeclared={!!content.declaration_accepted_at}
          initialFeatureRequested={!!content.feature_requested_at}
          initialTitle={tr?.title ?? ''}
          initialBody={initialBody}
          initialAccentColor={meta?.accent_color ?? ''}
          initialImageUrl={meta?.image_url ?? ''}
          initialFormat={meta?.format === 'carousel' ? 'carousel' : 'text'}
          initialSlides={parseSlides(meta?.slides)}
          initialDescription={tr?.excerpt ?? ''}
          brandLogos={isEditorRole(profile.role)}
          initialTags={(content.content_tags ?? []).filter((ct: any) => ct.tags).map((ct: any) => ({ id: ct.tags.id, slug: ct.tags.slug, name: tagDisplayName(ct.tags.names, locale, ct.tags.slug) }))}
        />
        {translationEditor && <TranslationsPanel data={translationEditor} />}
      </main>
      <Footer />
    </>
  )
}
