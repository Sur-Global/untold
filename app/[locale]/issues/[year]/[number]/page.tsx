import { after } from 'next/server'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getNavProps } from '@/lib/nav'
import { getTranslation } from '@/lib/content'
import { formatDate } from '@/lib/format-date'
import { isRecent } from '@/lib/editorial'
import { triggerListingTranslations } from '@/lib/trigger-listing-translations'
import { editorialTexts } from '@/lib/data/issue-editorial'
import { issueMonthLabel, toRoman } from '@/lib/issues'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { TranslationRefresher } from '@/components/TranslationRefresher'
import { ArticleRow, EditorialCard, type LatestItem } from '@/components/home/LatestSection'
import { Link } from '@/i18n/navigation'

const aeonik = (weight: 300 | 400 | 500): React.CSSProperties => ({
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: weight,
})

export default async function IssuePage({ params }: { params: Promise<{ locale: string; year: string; number: string }> }) {
  const { locale, year: yearParam, number: numberParam } = await params
  const number = Number(numberParam)
  const year = Number(yearParam)
  if (!Number.isInteger(number) || number < 1 || !Number.isInteger(year) || year < 2000 || year > 2200) notFound()

  const [t, tHome, tContent, supabase, navData] = await Promise.all([
    getTranslations('issues'),
    getTranslations('home'),
    getTranslations('content'),
    createClient(),
    getNavProps(),
  ])
  const { userId: _userId, ...navProps } = navData

  // Drafts are only visible to admins and editors (the database decides)
  const { data: issue } = await (supabase as any)
    .from('issues')
    .select(`
      id, number, issue_date, status,
      editorial:content!issues_editorial_id_fkey (
        id, slug, source_locale, single_language, status, published_at,
        profiles!author_id ( display_name, slug, avatar_url ),
        content_translations ( title, excerpt, featured_summary, locale )
      )
    `)
    .eq('number', number)
    .gte('issue_date', `${year}-01-01`)
    .lte('issue_date', `${year}-12-31`)
    .maybeSingle()
  if (!issue) notFound()

  const { data: rows } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, source_locale, single_language, published_at, read_time_minutes, cover_image_url,
      profiles!author_id ( display_name, slug, avatar_url ),
      content_translations ( title, excerpt, featured_summary, locale ),
      content_tags ( tags ( names, slug ) )
    `)
    .eq('issue_id', issue.id)
    .eq('type', 'article')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const editorial = issue.editorial && issue.editorial.status === 'published' ? issue.editorial : null
  const articles = (rows ?? []).filter((r: any) => r.id !== editorial?.id)
  const texts = editorial ? await editorialTexts(supabase, [editorial], locale) : new Map()
  const text = editorial ? texts.get(editorial.id) : null

  const dateOf = (iso: string | null) => (iso ? formatDate(iso, locale, { day: 'numeric', month: 'short' }) : null)
  const items: LatestItem[] = articles.map((r: any) => {
    const trans = getTranslation(r.content_translations ?? [], locale)
    const tag = r.content_tags?.[0]?.tags
    return {
      slug: r.slug,
      title: trans?.title ?? 'Untitled',
      coverImageUrl: r.cover_image_url ?? null,
      categoryTag: tag ? (tag.names[locale] ?? tag.names['en'] ?? null) : null,
      authorName: r.profiles?.display_name ?? null,
      dateLabel: dateOf(r.published_at),
      readTimeLabel: r.read_time_minutes ? tContent('readTime', { minutes: r.read_time_minutes }) : null,
      isNew: isRecent(r.published_at),
    }
  })

  const untranslated = [...(editorial ? [editorial] : []), ...articles]
    .filter((c: any) => !c.single_language && !(c.content_translations ?? []).some((tr: any) => tr.locale === locale))
    .map((c: any) => c.id)
  if (untranslated.length > 0) after(() => triggerListingTranslations(untranslated, locale))

  const labels = {
    title: t('inThisIssue'),
    viewAll: t('all'),
    editorial: tHome('latestEditorial'),
    readMore: t('readEditorial'),
    newBadge: tHome('latestNew'),
  }

  return (
    <>
      <TranslationRefresher pending={untranslated.length > 0} />
      <Navigation {...navProps} />
      <main className="bg-background min-h-screen">
        <div style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="mx-auto max-w-[1280px] px-6 pb-10 pt-12">
            <Link href="/issues" className="text-sm no-underline hover:underline" style={{ ...aeonik(400), color: '#6b6ad0' }}>
              {t('back')}
            </Link>
            <h1 className="mt-4 text-foreground" style={{ ...aeonik(500), fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
              {t('one')} {toRoman(issue.number)}
              {issue.status === 'draft' && (
                <span className="ml-3 rounded-full bg-amber-100 px-3 py-1 align-middle text-sm text-amber-800" style={aeonik(400)}>
                  {t('draft')}
                </span>
              )}
            </h1>
            <p className="mt-2 text-lg first-letter:uppercase" style={{ ...aeonik(300), color: '#555' }}>
              {issueMonthLabel(issue.issue_date, locale)}
            </p>
          </div>
        </div>

        <div className={`mx-auto grid max-w-[1280px] gap-8 px-6 py-12 ${editorial ? 'lg:grid-cols-[5fr_8fr]' : ''}`}>
          {editorial && text && (
            <div>
              <EditorialCard
                labels={labels}
                editorial={{
                  slug: editorial.slug,
                  title: text.title,
                  excerpt: text.excerpt,
                  authorName: editorial.profiles?.display_name ?? null,
                  authorSlug: editorial.profiles?.slug ?? null,
                  authorAvatarUrl: editorial.profiles?.avatar_url ?? null,
                  dateLabel: dateOf(editorial.published_at),
                }}
              />
            </div>
          )}
          <div>
            <h2 className="mb-5 pb-3" style={{ ...aeonik(500), fontSize: 22, borderBottom: '2px solid #000' }}>
              {labels.title}
            </h2>
            {items.length === 0 ? (
              <p className="py-8 text-sm" style={{ ...aeonik(300), color: '#999' }}>
                {t('empty')}
              </p>
            ) : (
              items.map((item, i) => <ArticleRow key={item.slug} item={item} labels={labels} first={i === 0} />)
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
