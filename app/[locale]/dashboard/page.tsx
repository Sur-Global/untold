import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn, getEditPath } from '@/lib/utils'
import { publishContent, unpublishContent } from '@/lib/actions/content'
import { DeleteContentButton } from './DeleteContentButton'
import type { ContentType } from '@/lib/supabase/types'

const TYPE_LABEL: Record<ContentType, string> = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
  pill: 'Pill',
  course: 'Course',
}

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

function TypeBadge({ type }: { type: ContentType }) {
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[rgba(196,93,58,0.1)] text-[#C45D3A]">
      {TYPE_LABEL[type]}
    </span>
  )
}

export default async function DashboardPage() {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const itemsPromise = (supabase as any)
    .from('content')
    .select(`
      id, type, status, created_at,
      content_translations ( title, locale )
    `)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  const [navProps, t, { data: items }] = await Promise.all([
    getNavProps(),
    getTranslations('dashboard'),
    itemsPromise,
  ])

  const getTitle = (item: any) => {
    const tr = item.content_translations?.find((tr: any) => tr.locale === 'en')
      ?? item.content_translations?.[0]
    return tr?.title ?? '(Untitled)'
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1>{t('myContent')}</h1>
          <Link href="/create" className={cn(buttonVariants(), 'gradient-rust text-white border-0')}>
            {t('newContent')}
          </Link>
        </div>

        {(!items || items.length === 0) ? (
          <p className="text-[#6B5F58]">{t('noContent')}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item: any) => (
              <li
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-lg"
                style={{ border: '1px solid rgba(139,69,19,0.15)', background: 'rgba(245,241,232,0.5)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{getTitle(item)}</p>
                  <p className="text-xs text-[#6B5F58] font-mono mt-0.5">
                    {new Date(item.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <TypeBadge type={item.type} />
                <StatusBadge status={item.status} />

                <div className="flex items-center gap-2">
                  <Link
                    href={getEditPath(item.type, item.id)}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                  >
                    {t('editContent')}
                  </Link>

                  {item.status === 'draft' ? (
                    <form action={publishContent.bind(null, item.id)}>
                      <Button type="submit" size="sm" variant="outline">{t('publish')}</Button>
                    </form>
                  ) : (
                    <form action={unpublishContent.bind(null, item.id)}>
                      <Button type="submit" size="sm" variant="outline">{t('unpublish')}</Button>
                    </form>
                  )}

                  <DeleteContentButton id={item.id} />
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
