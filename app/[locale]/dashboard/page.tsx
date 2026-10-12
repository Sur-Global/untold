import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { isEditorRole } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format-date'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn, getEditPath } from '@/lib/utils'
import { publishContent, unpublishContent } from '@/lib/actions/content'
import { DeleteContentButton } from './DeleteContentButton'
import { ViewContentLink } from '@/components/content/ViewContentLink'
import { AuthorStarToggle } from './AuthorStarToggle'
import type { ContentType } from '@/lib/supabase/types'

const TYPE_KEY = {
  article: 'typeArticle',
  video: 'typeVideo',
  podcast: 'typePodcast',
  pill: 'typePill',
  course: 'typeCourse',
} as const

function StatusBadge({ status, label }: { status: string; label: string }) {
  const isPublished = status === 'published'
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded-full"
      style={{
        background: isPublished ? '#dcfce7' : '#ffedd5',
        color: isPublished ? '#14532d' : '#7c2d12',
      }}
    >
      {label}
    </span>
  )
}

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#ffe4d6] text-[#8a2f0d]">
      {label}
    </span>
  )
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { user, profile } = await requireCreator()
  const supabase = await createClient()

  const itemsPromise = (supabase as any)
    .from('content')
    .select(`
      id, type, slug, status, created_at, is_curated, source_locale, is_author_featured,
      content_translations ( title, locale )
    `)
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })

  const [{ userId, ...navProps }, t, { data: items }, { data: myProfile }] = await Promise.all([
    getNavProps(),
    getTranslations('dashboard'),
    itemsPromise,
    (supabase as any)
      .from('profiles')
      .select('avatar_url, bio, website, social_bluesky, social_linkedin, social_instagram, social_medium, social_custom_url')
      .eq('id', user.id)
      .single(),
  ])

  // Nudge creators to complete their public profile
  const hasText = (v: unknown) => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim().length > 0
  const missingProfile: string[] = []
  if (!hasText(myProfile?.avatar_url)) missingProfile.push(t('nudgePhoto'))
  if (!hasText(myProfile?.bio)) missingProfile.push(t('nudgeBio'))
  if (
    ![myProfile?.website, myProfile?.social_bluesky, myProfile?.social_linkedin, myProfile?.social_instagram, myProfile?.social_medium, myProfile?.social_custom_url].some(hasText)
  ) {
    missingProfile.push(t('nudgeLinks'))
  }

  const getTitle = (item: any) => {
    // Show the title in the language it was written in
    const tr = item.content_translations?.find((tr: any) => tr.locale === (item.source_locale ?? 'en'))
      ?? item.content_translations?.[0]
    return tr?.title ?? t('untitled')
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1>{t('myContent')}</h1>
          <div className="flex items-center gap-3">
            {isEditorRole(profile.role) && (
              <Link href="/admin" className={cn(buttonVariants({ variant: 'outline' }))}>
                {t('adminDashboard')}
              </Link>
            )}
            <Link href="/dashboard/profile" className={cn(buttonVariants({ variant: 'outline' }))}>
              {t('editProfile')}
            </Link>
            <Link href="/create" className={cn(buttonVariants(), 'gradient-rust text-white border-0')}>
              {t('newContent')}
            </Link>
          </div>
        </div>

        {missingProfile.length > 0 && (
          <div
            className="mb-6 rounded-xl p-5"
            style={{ border: '1px solid rgba(169,168,233,0.6)', background: 'rgba(169,168,233,0.12)' }}
          >
            <p className="font-semibold">{t('profileNudgeTitle')}</p>
            <p className="mt-1 text-sm text-[#4b3a2a] leading-relaxed">{t('profileNudgeText')}</p>
            <p className="mt-2 text-sm text-[#6B5F58]">{t('profileNudgeMissing', { items: missingProfile.join(', ') })}</p>
            <Link href="/dashboard/profile" className={cn(buttonVariants({ size: 'sm' }), 'mt-3')}>
              {t('profileNudgeCta')}
            </Link>
          </div>
        )}

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
                    {formatDate(item.created_at, locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <TypeBadge label={t(TYPE_KEY[item.type as ContentType])} />
                <StatusBadge status={item.status} label={item.status === 'published' ? t('published') : t('draft')} />
                {item.status === 'published' && !item.is_curated && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(120,113,108,0.12)', color: '#44403c' }}
                    title={t('creatorPageOnly')}
                  >
                    {t('creatorPageOnly')}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {item.status === 'published' && (
                    <AuthorStarToggle contentId={item.id} initialStarred={!!item.is_author_featured} />
                  )}
                  {item.status === 'published' && item.slug && (
                    <ViewContentLink type={item.type} slug={item.slug} variant="ghost" />
                  )}
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
