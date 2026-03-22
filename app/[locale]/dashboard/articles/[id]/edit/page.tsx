import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { EditArticleForm } from './EditArticleForm'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditArticlePage({ params }: PageProps) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()

  const articlePromise = (supabase as any)
    .from('content')
    .select(`
      id, status, cover_image_url, image_credits, feature_requested_at,
      profiles!author_id ( display_name, bio ),
      content_translations ( title, excerpt, featured_summary, body, locale ),
      content_tags ( tag_id, tags ( id, slug, names ) )
    `)
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'article')
    .single()

  const [{ userId, ...navProps }, { data: article }] = await Promise.all([
    getNavProps(),
    articlePromise,
  ])

  if (!article) notFound()

  const enTranslation = article.content_translations?.find((tr: any) => tr.locale === 'en')
    ?? article.content_translations?.[0]

  const initialBody = Array.isArray(enTranslation?.body) ? enTranslation.body : null

  const initialTags = (article.content_tags ?? [])
    .map((ct: any) => ct.tags)
    .filter(Boolean)
    .map((t: any) => ({ id: t.id, slug: t.slug, name: t.names?.en ?? t.slug }))

  const author = Array.isArray(article.profiles) ? article.profiles[0] : article.profiles

  return (
    <>
      <Navigation {...navProps} />
      <EditArticleForm
        id={id}
        status={article.status}
        initialTitle={enTranslation?.title ?? ''}
        initialExcerpt={enTranslation?.excerpt ?? ''}
        initialFeaturedSummary={enTranslation?.featured_summary ?? ''}
        initialCoverImageUrl={article.cover_image_url ?? ''}
        initialImageCredits={article.image_credits ?? ''}
        initialBody={initialBody}
        initialTags={initialTags}
        initialFeatureRequested={!!article.feature_requested_at}
        authorName={author?.display_name ?? ''}
        authorBio={author?.bio ?? undefined}
      />
      <Footer />
    </>
  )
}
