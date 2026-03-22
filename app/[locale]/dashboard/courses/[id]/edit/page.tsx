import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditCourseForm } from './EditCourseForm'

interface EditCoursePageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()

  const contentPromise = (supabase as any)
    .from('content')
    .select(`
      id, status, cover_image_url,
      content_translations ( title, description, locale ),
      course_meta ( price, currency, duration )
    `)
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'course')
    .single()

  const [{ userId, ...navProps }, t, { data: content }] = await Promise.all([
    getNavProps(),
    getTranslations('editor'),
    contentPromise,
  ])

  if (!content) notFound()

  const tr = content.content_translations?.find((r: any) => r.locale === 'en') ?? content.content_translations?.[0]
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
          initialTitle={tr?.title ?? ''}
          initialDescription={tr?.description ?? ''}
          initialCoverImageUrl={content.cover_image_url ?? ''}
          initialPrice={meta?.price ?? 0}
          initialCurrency={meta?.currency ?? 'USD'}
          initialDuration={meta?.duration ?? ''}
        />
      </main>
      <Footer />
    </>
  )
}
