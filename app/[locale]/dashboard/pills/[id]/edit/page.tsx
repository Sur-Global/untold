import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditPillForm } from './EditPillForm'

interface EditPillPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditPillPage({ params }: EditPillPageProps) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  const { data: content } = await (supabase as any)
    .from('content')
    .select(`
      id, status,
      content_translations ( title, body, locale ),
      pill_meta ( accent_color, image_url )
    `)
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'pill')
    .single()

  if (!content) notFound()

  const tr = content.content_translations?.find((r: any) => r.locale === 'en') ?? content.content_translations?.[0]
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
          initialTitle={tr?.title ?? ''}
          initialBody={tr?.body ?? null}
          initialAccentColor={meta?.accent_color ?? '#C45D3A'}
          initialImageUrl={meta?.image_url ?? ''}
        />
      </main>
      <Footer />
    </>
  )
}
