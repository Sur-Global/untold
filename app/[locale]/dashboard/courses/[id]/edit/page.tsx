import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { isEditorRole } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditCourseForm } from './EditCourseForm'
import { TranslationsPanel } from '@/components/translations/TranslationsPanel'
import { loadTranslationEditor } from '@/lib/data/translation-editor'
import { extrasFromMeta } from '@/lib/course-page'

interface EditCoursePageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { id } = await params
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const contentQuery = (supabase as any)
    .from('content')
    .select(`
      id, slug, author_id, status, source_locale, single_language, subtitle_locales, declaration_accepted_at, cover_image_url,
      content_translations ( title, excerpt, description, body, locale ),
      course_meta ( price, currency, duration, banner_url, banner_has_title, modality, place, starts_on, language_label, level, certificate, audience, price_note, provider_name, provider_url, registration_mode, registration_url, registration_label, registration_note, intro_sessions, intro_timezone, people )
    `)
    .eq('id', id)
    .eq('type', 'course')
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
  const meta = Array.isArray(content.course_meta) ? content.course_meta[0] : content.course_meta ?? {}

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/dashboard" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToDashboard')}
        </Link>
        <h1 className="mb-8">{tr?.title ?? '(Untitled)'}</h1>
        <EditCourseForm
          id={id}
          status={content.status}
          initialAuthorId={content.author_id}
        slug={content.slug}
          initialSingleLanguage={content.single_language ?? false}
        initialDeclared={!!content.declaration_accepted_at}
          initialTitle={tr?.title ?? ''}
          initialCoverImageUrl={content.cover_image_url ?? ''}
          initial={{
            ...extrasFromMeta(meta),
            // a course made before the subtitle existed has its one-line description as the subtitle
            subtitle: tr?.excerpt || tr?.description || '',
            duration: meta?.duration ?? '',
            price: meta?.price ?? 0,
            currency: meta?.currency ?? 'USD',
          }}
          initialBody={Array.isArray(tr?.body) && tr.body.length > 0 ? tr.body : null}
        />
        {translationEditor && <TranslationsPanel data={translationEditor} />}
      </main>
      <Footer withNewsletter={false} />
    </>
  )
}
