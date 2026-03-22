import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { publishArticle, unpublishArticle } from '@/lib/actions/article'
import { cn } from '@/lib/utils'
import { DeleteArticleButton } from './DeleteArticleButton'

function StatusBadge({ status }: { status: string }) {
  const isPublished = status === 'published'
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded-full"
      style={{
        background: isPublished ? 'rgba(34,197,94,0.1)' : 'rgba(160,82,45,0.1)',
        color: isPublished ? '#16a34a' : '#A0522D',
      }}
    >
      {status}
    </span>
  )
}

export default async function DashboardArticlesPage() {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const articlesPromise = (supabase as any)
    .from('content')
    .select(`
      id, slug, status, published_at, created_at,
      content_translations ( title, locale )
    `)
    .eq('author_id', user.id)
    .eq('type', 'article')
    .order('created_at', { ascending: false })

  const [{ userId, ...navProps }, t, { data: articles }] = await Promise.all([
    getNavProps(),
    getTranslations('dashboard'),
    articlesPromise,
  ])

  const getTitle = (article: any) => {
    const tr = article.content_translations?.find((tr: any) => tr.locale === 'en')
      ?? article.content_translations?.[0]
    return tr?.title ?? '(Untitled)'
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1>{t('myArticles')}</h1>
          <Link href="/create" className={cn(buttonVariants(), 'gradient-rust text-white border-0')}>
            {t('newArticle')}
          </Link>
        </div>

        {(!articles || articles.length === 0) ? (
          <p className="text-[#6B5F58]">{t('noArticles')}</p>
        ) : (
          <ul className="space-y-3">
            {articles.map((article: any) => (
              <li
                key={article.id}
                className="flex items-center gap-4 p-4 rounded-lg"
                style={{ border: '1px solid rgba(139,69,19,0.15)', background: 'rgba(245,241,232,0.5)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{getTitle(article)}</p>
                  <p className="text-xs text-[#6B5F58] font-mono mt-0.5">
                    {new Date(article.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <StatusBadge status={article.status} />

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/articles/${article.id}/edit`}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                  >
                    {t('editArticle')}
                  </Link>

                  {article.status === 'draft' ? (
                    <form action={publishArticle.bind(null, article.id)}>
                      <Button type="submit" size="sm" variant="outline">{t('publish')}</Button>
                    </form>
                  ) : (
                    <form action={unpublishArticle.bind(null, article.id)}>
                      <Button type="submit" size="sm" variant="outline">{t('unpublish')}</Button>
                    </form>
                  )}

                  <DeleteArticleButton id={article.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  )
}
