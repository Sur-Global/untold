import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditArticleForm } from './EditArticleForm'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditArticlePage({ params }: PageProps) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  const { data: article } = await (supabase as any)
    .from('content')
    .select('id, status, cover_image_url, content_translations ( title, excerpt, body, locale )')
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'article')
    .single()

  if (!article) notFound()

  const enTranslation = article.content_translations?.find((tr: any) => tr.locale === 'en')
    ?? article.content_translations?.[0]

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard/articles" className="text-sm text-[#A0522D] hover:underline font-mono">
            {t('backToDashboard')}
          </Link>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{
              background: article.status === 'published' ? 'rgba(34,197,94,0.1)' : 'rgba(160,82,45,0.1)',
              color: article.status === 'published' ? '#16a34a' : '#A0522D',
            }}
          >
            {article.status}
          </span>
        </div>

        <EditArticleForm
          id={id}
          status={article.status}
          initialTitle={enTranslation?.title ?? ''}
          initialExcerpt={enTranslation?.excerpt ?? ''}
          initialCoverImageUrl={article.cover_image_url ?? ''}
          initialBody={enTranslation?.body ?? null}
        />
      </main>
      <Footer />
    </>
  )
}
